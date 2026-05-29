/// <reference types="node" />
import { Router, Request, Response } from 'express';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import * as cheerio from 'cheerio';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const publishRouter: Router = Router();
publishRouter.use(requireAuth);

function getS3Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    },
  });
}

// Text file extensions that can be safely read as UTF-8
const TEXT_EXTENSIONS = ['.html', '.css', '.js', '.json', '.svg', '.txt', '.xml', '.csv', '.md'];

function isTextFile(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return TEXT_EXTENSIONS.includes(ext);
}

async function fetchTemplateFiles(r2Key: string): Promise<Record<string, { content: string | Buffer; isBinary: boolean }>> {
  const s3 = getS3Client();
  const bucket = process.env.R2_BUCKET ?? 'buildhaze-cms';
  
  // List all files in template directory
  const listCmd = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: r2Key,
  });
  const listed = await s3.send(listCmd);
  
  const files: Record<string, { content: string | Buffer; isBinary: boolean }> = {};
  
  // Fetch each file content
  for (const obj of listed.Contents || []) {
    if (!obj.Key || obj.Key.endsWith('/')) continue;
    
    const getCmd = new GetObjectCommand({
      Bucket: bucket,
      Key: obj.Key,
    });
    const response = await s3.send(getCmd);
    
    // Get relative path from template root (e.g., "templates/lawyer-premium/index.html" -> "index.html")
    const relativePath = obj.Key.replace(r2Key, '').replace(/^\//, '');
    
    // Read as text or binary based on file extension
    if (isTextFile(relativePath)) {
      const content = await response.Body?.transformToString('utf-8') || '';
      files[relativePath] = { content, isBinary: false };
    } else {
      const content = await response.Body?.transformToByteArray() || new Uint8Array();
      files[relativePath] = { content: Buffer.from(content), isBinary: true };
    }
  }
  
  return files;
}

export async function buildAndPublish(clientId: string): Promise<void> {
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
    include: {
      template: true,
      siteConfig: true,
      blogPosts: { where: { isPublished: true }, orderBy: { publishedAt: 'desc' } },
      pages: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!client.template) throw new AppError(400, 'No template assigned to this client');

  // Build slug→sections map from client pages
  const pageMap = new Map<string, any[]>();
  for (const page of client.pages) {
    const key = page.slug === '' ? 'index' : page.slug;
    pageMap.set(key, (page.sections as any[]) || []);
    console.log(`[publish] page "${key}" has ${(page.sections as any[])?.length ?? 0} sections`);
  }

  const templateFiles = await fetchTemplateFiles(client.template.r2Key);
  console.log(`[publish] fetched ${Object.keys(templateFiles).length} template files from R2 key: ${client.template.r2Key}`);
  const s3 = getS3Client();
  const bucket = process.env.R2_BUCKET ?? 'buildhaze-cms';
  const prefix = client.slug;

  for (const [filename, fileData] of Object.entries(templateFiles)) {
    const { content, isBinary } = fileData;

    // Non-HTML: copy as-is
    if (!filename.endsWith('.html')) {
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: `${prefix}/${filename}`,
        Body: content,
        ContentType: getContentType(filename),
        CacheControl: 'public, max-age=3600',
      }));
      continue;
    }

    // Determine page slug from filename
    const pageSlug = filename === 'index.html' ? 'index' : filename.replace('.html', '');
    const sections: any[] = pageMap.get(pageSlug) || [];
    console.log(`[publish] processing ${filename} (slug="${pageSlug}") with ${sections.length} sections`);

    // Load HTML into cheerio and inject field values
    const $ = cheerio.load(content as string);

    let fieldsApplied = 0;
    for (const section of sections) {
      if (section.visible === false) continue;

      for (const field of (section.fields || [])) {
        try {
          const els = $(field.selector);
          if (els.length === 0) {
            console.warn(`[publish] selector not found: "${field.selector}" for field "${field.id}"`);
            continue;
          }
          const el = els.first();

          if (field.attribute === 'textContent') {
            el.text(field.value ?? '');
          } else if (field.attribute === 'innerHTML') {
            el.html(field.value ?? '');
          } else {
            el.attr(field.attribute, field.value ?? '');
          }
          fieldsApplied++;
        } catch (err) {
          console.warn(`Failed to apply field ${field.id}:`, err);
        }
      }
    }
    console.log(`[publish] applied ${fieldsApplied} fields to ${filename}`);

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: `${prefix}/${filename}`,
      Body: $.html(),
      ContentType: 'text/html; charset=utf-8',
      CacheControl: 'public, max-age=60',
    }));
  }

  await prisma.client.update({
    where: { id: clientId },
    data: { lastPublishedAt: new Date() },
  });

  // Auto-redeploy to Cloudflare Pages if client has a CF Pages site
  // Use the client's BUILT files (with CMS edits injected) not the raw template
  if (client.domain && client.domain.includes('.pages.dev') && client.template?.r2Key) {
    try {
      const { cloudflarePagesService } = await import('../services/cloudflare-pages');
      const existingProjectName = client.domain.replace('https://', '').replace('.pages.dev', '');
      // Use client slug as r2Key prefix - these are the built files with CMS edits applied
      await cloudflarePagesService.deployTemplate({
        clientId: client.id,
        businessName: client.businessName,
        templateId: client.templateId!,
        r2Key: client.slug,
        bucketName: process.env.R2_BUCKET ?? process.env.R2_BUCKET_NAME ?? 'buildhaze-cms',
        existingProjectName,
      });
      console.log(`Auto-redeployed ${client.businessName} to CF Pages: ${existingProjectName}`);
    } catch (cfErr) {
      console.error('CF Pages auto-redeploy failed (non-fatal):', cfErr);
    }
  }
}

function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    html: 'text/html; charset=utf-8',
    css: 'text/css; charset=utf-8',
    js: 'application/javascript; charset=utf-8',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    ico: 'image/x-icon',
  };
  return types[ext || ''] || 'application/octet-stream';
}

// List available templates from R2
publishRouter.get('/templates', async (req: Request, res: Response) => {
  const templates = await prisma.template.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ templates });
});

// Register a new template from R2
publishRouter.post('/templates', async (req: Request, res: Response) => {
  const { name, slug, description, niche, r2Key, thumbnail } = req.body;
  
  const template = await prisma.template.create({
    data: {
      name,
      slug,
      description,
      niche,
      r2Key,
      thumbnail,
      isActive: true,
    },
  });
  
  res.json({ success: true, template });
});

publishRouter.post('/', async (req: Request, res: Response) => {
  const { clientId } = req as unknown as AuthRequest;
  await buildAndPublish(clientId);
  res.json({ success: true, publishedAt: new Date().toISOString() });
});
