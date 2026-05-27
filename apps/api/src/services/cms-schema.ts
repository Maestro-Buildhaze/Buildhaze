import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { prisma } from '../lib/prisma';
import { parseTemplateFiles, CmsPage } from './cms-parser';

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

function getBucketName(): string {
  return process.env.R2_BUCKET ?? 'buildhaze-cms';
}

async function fetchHtmlFilesFromR2(r2KeyPrefix: string): Promise<Record<string, string>> {
  const s3 = getS3Client();
  const bucket = getBucketName();

  const listed = await s3.send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: r2KeyPrefix,
  }));

  const files: Record<string, string> = {};

  for (const obj of listed.Contents || []) {
    if (!obj.Key?.endsWith('.html')) continue;

    const response = await s3.send(new GetObjectCommand({
      Bucket: bucket,
      Key: obj.Key,
    }));

    const content = await response.Body?.transformToString('utf-8') || '';
    const relativePath = obj.Key.replace(r2KeyPrefix, '').replace(/^\//, '');
    if (relativePath && content) {
      files[relativePath] = content;
    }
  }

  return files;
}

/**
 * Detect and save template schema from R2 HTML files.
 */
export async function detectAndSaveTemplateSchema(templateId: string): Promise<{
  pagesDetected: number;
  sectionsDetected: number;
  fieldsDetected: number;
}> {
  const template = await prisma.template.findUniqueOrThrow({ where: { id: templateId } });

  if (!template.r2Key) {
    throw new Error('Template has no r2Key — files must be uploaded to R2 first');
  }

  const htmlFiles = await fetchHtmlFilesFromR2(template.r2Key);

  if (Object.keys(htmlFiles).length === 0) {
    throw new Error(`No HTML files found at R2 prefix: ${template.r2Key}`);
  }

  const pages = parseTemplateFiles(htmlFiles);

  const totalSections = pages.reduce((sum, p) => sum + p.sections.length, 0);
  const totalFields = pages.reduce((sum, p) =>
    sum + p.sections.reduce((s2, sec) => s2 + sec.fields.length, 0), 0);

  await prisma.templateSchema.upsert({
    where: { templateId },
    create: {
      templateId,
      schema: { pages } as any,
      pages: pages.map(p => ({ id: p.id, name: p.name, slug: p.slug, file: p.file })) as any,
      sections: pages.flatMap(p => p.sections.map(s => ({ ...s, pageId: p.id }))) as any,
      fields: {} as any,
      autoDetected: true,
    },
    update: {
      schema: { pages } as any,
      pages: pages.map(p => ({ id: p.id, name: p.name, slug: p.slug, file: p.file })) as any,
      sections: pages.flatMap(p => p.sections.map(s => ({ ...s, pageId: p.id }))) as any,
      fields: {} as any,
      autoDetected: true,
    },
  });

  return { pagesDetected: pages.length, sectionsDetected: totalSections, fieldsDetected: totalFields };
}

/**
 * Generate Page records for a client from template schema.
 * Deletes existing pages and recreates them with real field values.
 */
export async function generateClientPages(clientId: string, templateId: string): Promise<{
  pagesCreated: number;
  sectionsCreated: number;
}> {
  // Auto-detect schema if missing
  let schema = await prisma.templateSchema.findUnique({ where: { templateId } });

  if (!schema) {
    await detectAndSaveTemplateSchema(templateId);
    schema = await prisma.templateSchema.findUnique({ where: { templateId } });
  }

  if (!schema) {
    throw new Error('Could not generate schema for template');
  }

  const schemaData = schema.schema as any;
  const pages: CmsPage[] = schemaData?.pages || [];

  if (pages.length === 0) {
    throw new Error('Template schema has no pages — re-run schema detection');
  }

  // Clean slate: delete existing pages for this client
  await prisma.page.deleteMany({ where: { clientId } });

  let sectionsCreated = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const sections = page.sections || [];
    sectionsCreated += sections.length;

    await prisma.page.create({
      data: {
        clientId,
        slug: page.slug,
        title: page.name,
        sections: sections as any,
        isActive: true,
        sortOrder: i,
      },
    });
  }

  return { pagesCreated: pages.length, sectionsCreated };
}
