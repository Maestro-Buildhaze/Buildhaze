import { Router } from 'express';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Eta } from 'eta';
import path from 'path';
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

async function fetchTemplateFiles(r2Key: string): Promise<Record<string, string>> {
  const s3 = getS3Client();
  const bucket = process.env.R2_BUCKET ?? 'buildhaze-cms';
  
  // List all files in template directory
  const listCmd = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: r2Key,
  });
  const listed = await s3.send(listCmd);
  
  const files: Record<string, string> = {};
  
  // Fetch each file content
  for (const obj of listed.Contents || []) {
    if (!obj.Key || obj.Key.endsWith('/')) continue;
    
    const getCmd = new GetObjectCommand({
      Bucket: bucket,
      Key: obj.Key,
    });
    const response = await s3.send(getCmd);
    const content = await response.Body?.transformToString('utf-8') || '';
    
    // Get relative path from template root (e.g., "templates/lawyer-premium/index.html" -> "index.html")
    const relativePath = obj.Key.replace(r2Key, '').replace(/^\//, '');
    files[relativePath] = content;
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

  const configMap: Record<string, string> = {};
  if (client.siteConfig && Array.isArray(client.siteConfig)) {
    for (const c of client.siteConfig) configMap[c.key] = c.value;
  }

  // Fetch template files from R2
  const htmlFiles = await fetchTemplateFiles(client.template.r2Key);
  
  const eta = new Eta({ 
    views: path.join(__dirname, '../../templates'),
    useWith: true,  // CRITICAL: Allow access to variables without 'it.' prefix
  });
  const s3 = getS3Client();
  const bucket = process.env.R2_BUCKET ?? 'buildhaze-cms';
  const prefix = client.slug;

  // Render and upload each HTML file
  for (const [filename, templateContent] of Object.entries(htmlFiles)) {
    // Only process HTML files with Eta syntax
    if (!filename.endsWith('.html')) {
      // Copy non-HTML files as-is
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: `${prefix}/${filename}`,
        Body: templateContent,
        ContentType: getContentType(filename),
        CacheControl: 'public, max-age=60',
      }));
      continue;
    }
    
    // Map blog posts to template format with safe defaults
    const allBlogPosts = (client.blogPosts || []).map((post: any) => ({
      title: post.title || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      image: post.coverImage || 'https://via.placeholder.com/800x500',
      date: post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('ro-RO') : '',
      readTime: '5 min',
      category: post.category || 'Articol',
      author: post.author || client.businessName || 'Autor',
      authorImage: 'https://via.placeholder.com/40',
      tags: post.tags ? (Array.isArray(post.tags) ? post.tags : [post.tags]) : [],
      featured: post.featured || false,
      slug: post.slug || '',
    }));
    
    const featuredPosts = allBlogPosts.filter(p => p.featured);
    const regularPosts = allBlogPosts.filter(p => !p.featured);
    
    // Ensure config always has default values
    const templateData = {
      config: {
        businessName: client.businessName || '',
        tagline: '',
        metaDescription: '',
        phone: '',
        email: '',
        address: '',
        primaryColor: '#d4af37',
        blogButton: 'Vezi Toate Articolele',
        ...configMap,
      },
      blog_posts: allBlogPosts,
      featuredPosts,
      regularPosts,
      pages: client.pages || [],
      client: {
        businessName: client.businessName,
        slug: client.slug,
        domain: client.domain,
      },
    };
    
    let rendered: string;
    try {
      // Use sync render to avoid async issues with Eta
      rendered = eta.renderString(templateContent, templateData);
    } catch (err: any) {
      console.error(`Template render failed for ${filename}:`, err);
      console.error('Template data keys:', Object.keys(templateData));
      console.error('Config keys:', Object.keys(templateData.config));
      throw new AppError(500, `Failed to render template ${filename}: ${err?.message || err}`);
    }

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: `${prefix}/${filename}`,
      Body: rendered,
      ContentType: 'text/html; charset=utf-8',
      CacheControl: 'public, max-age=60',
    }));
  }

  await prisma.client.update({
    where: { id: clientId },
    data: { lastPublishedAt: new Date() },
  });
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
publishRouter.get('/templates', async (req, res) => {
  const templates = await prisma.template.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ templates });
});

// Register a new template from R2
publishRouter.post('/templates', async (req, res) => {
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

publishRouter.post('/', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  await buildAndPublish(clientId);
  res.json({ success: true, publishedAt: new Date().toISOString() });
});
