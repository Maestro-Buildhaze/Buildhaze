import { Router } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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

async function buildAndPublish(clientId: string): Promise<void> {
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
  for (const c of client.siteConfig) configMap[c.key] = c.value;

  const eta = new Eta({ views: path.join(__dirname, '../../templates') });

  const htmlFiles = client.template.htmlFiles as Record<string, string>;
  const s3 = getS3Client();
  const bucket = process.env.R2_BUCKET ?? 'cms-sites';
  const prefix = client.slug;

  for (const [filename, templateContent] of Object.entries(htmlFiles)) {
    const rendered = await eta.renderStringAsync(templateContent, {
      config: configMap,
      blog_posts: client.blogPosts,
      pages: client.pages,
      client: {
        businessName: client.businessName,
        slug: client.slug,
        domain: client.domain,
      },
    });

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

publishRouter.post('/', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  await buildAndPublish(clientId);
  res.json({ success: true, publishedAt: new Date().toISOString() });
});
