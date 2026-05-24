import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import slugify from 'slugify';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { verifyToken } from '../lib/jwt';

export const adminRouter: Router = Router();

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? 'admin-secret-change-me';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';

function requireAdmin(req: any, _res: any, next: any): void {
  // Method 1: x-admin-key header (legacy)
  const key = req.headers['x-admin-key'];
  if (key === ADMIN_KEY) {
    next();
    return;
  }

  // Method 2: JWT Bearer token with admin email
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7);
    try {
      const payload = verifyToken(token);
      if (ADMIN_EMAIL && payload.email === ADMIN_EMAIL) {
        next();
        return;
      }
    } catch {
      // fall through to forbidden
    }
  }

  throw new AppError(403, 'Forbidden');
}

adminRouter.use(requireAdmin);

const createClientSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  businessName: z.string().min(1),
  templateId: z.string().optional(),
  domain: z.string().optional(),
  plan: z.enum(['basic', 'pro', 'enterprise']).optional(),
  initialConfig: z.record(z.string(), z.string()).optional(),
});

adminRouter.post('/clients', async (req, res) => {
  const data = createClientSchema.parse(req.body);

  const existing = await prisma.client.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError(409, 'Client with this email already exists');

  const slug = slugify(data.businessName, { lower: true, strict: true });
  const existingSlug = await prisma.client.findUnique({ where: { slug } });
  const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

  const passwordHash = await bcrypt.hash(data.password, 12);

  const client = await prisma.client.create({
    data: {
      email: data.email,
      passwordHash,
      businessName: data.businessName,
      slug: finalSlug,
      templateId: data.templateId ?? null,
      domain: data.domain ?? null,
      plan: data.plan ?? 'basic',
    },
  });

  if (data.initialConfig && Object.keys(data.initialConfig).length > 0) {
    await prisma.$transaction(
      Object.entries(data.initialConfig).map(([key, value]) =>
        prisma.siteConfig.create({ data: { clientId: client.id, key, value } })
      )
    );
  }

  res.status(201).json({
    id: client.id,
    email: client.email,
    businessName: client.businessName,
    slug: client.slug,
    plan: client.plan,
  });
});

adminRouter.get('/clients', async (_req, res) => {
  const clients = await prisma.client.findMany({
    select: {
      id: true, email: true, businessName: true, slug: true,
      plan: true, domain: true, isActive: true, lastPublishedAt: true, createdAt: true,
      template: { select: { id: true, name: true, niche: true } },
      _count: { select: { blogPosts: true, mediaFiles: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(clients);
});

adminRouter.patch('/clients/:id', async (req, res) => {
  const data = z.object({
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    businessName: z.string().optional(),
    templateId: z.string().nullable().optional(),
    domain: z.string().nullable().optional(),
    plan: z.enum(['basic', 'pro', 'enterprise']).optional(),
    isActive: z.boolean().optional(),
  }).parse(req.body);

  const updateData: any = { ...data };
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 12);
    delete updateData.password;
  }

  const client = await prisma.client.update({
    where: { id: req.params.id },
    data: updateData,
  });

  res.json({ id: client.id, email: client.email, businessName: client.businessName });
});

adminRouter.delete('/clients/:id', async (req, res) => {
  await prisma.client.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// Publish client site (trigger buildAndPublish)
adminRouter.post('/clients/:id/publish', async (req, res) => {
  // Import publish function
  const { buildAndPublish } = await import('./publish');
  await buildAndPublish(req.params.id);
  res.json({ success: true, publishedAt: new Date().toISOString() });
});

// Get client with full details
adminRouter.get('/clients/:id', async (req, res) => {
  const client = await prisma.client.findUnique({
    where: { id: req.params.id },
    include: {
      template: true,
      siteConfig: true,
      _count: { select: { blogPosts: true, mediaFiles: true, pages: true } },
    },
  });
  if (!client) throw new AppError(404, 'Client not found');
  res.json(client);
});

adminRouter.get('/templates', async (_req, res) => {
  const templates = await prisma.template.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(templates);
});

// Create template with r2Key (template files uploaded separately to R2)
adminRouter.post('/templates', async (req, res) => {
  const data = z.object({
    name: z.string(),
    slug: z.string(),
    niche: z.string(),
    description: z.string().optional(),
    r2Key: z.string(), // Path in R2: templates/lawyer-premium
    thumbnail: z.string().optional(),
  }).parse(req.body);

  const template = await prisma.template.create({ data });
  res.status(201).json(template);
});

// Get single template details
adminRouter.get('/templates/:id', async (req, res) => {
  const template = await prisma.template.findUnique({
    where: { id: req.params.id },
  });
  if (!template) throw new AppError(404, 'Template not found');
  res.json(template);
});

// Delete template
adminRouter.delete('/templates/:id', async (req, res) => {
  await prisma.template.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// Upload template files to R2
import multer from 'multer';
const templateUpload = multer({ storage: multer.memoryStorage() });

adminRouter.post('/templates/upload', templateUpload.array('files'), async (req, res) => {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const files = req.files as Express.Multer.File[];
  const paths = req.body.paths as string[];
  const templateSlug = req.body.templateSlug as string;
  
  if (!files || !paths || !templateSlug) {
    throw new AppError(400, 'Missing files, paths or templateSlug');
  }

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    },
  });
  
  const bucket = process.env.R2_BUCKET ?? 'cms-sites';
  const contentTypes: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
  };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = Array.isArray(paths) ? paths[i] : paths;
    const cleanPath = filePath.replace(/^[^/]+\//, ''); // Remove folder prefix
    const r2Key = `templates/${templateSlug}/${cleanPath}`;
    
    const ext = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: r2Key,
      Body: file.buffer,
      ContentType: contentType,
    }));
  }

  res.json({ success: true, r2Key: `templates/${templateSlug}` });
});
