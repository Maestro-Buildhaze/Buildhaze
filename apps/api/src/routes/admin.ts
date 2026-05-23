import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import slugify from 'slugify';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const adminRouter = Router();

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? 'admin-secret-change-me';

function requireAdmin(req: any, _res: any, next: any): void {
  const key = req.headers['x-admin-key'];
  if (key !== ADMIN_KEY) throw new AppError(403, 'Forbidden');
  next();
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

adminRouter.get('/templates', async (_req, res) => {
  const templates = await prisma.template.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(templates);
});

adminRouter.post('/templates', async (req, res) => {
  const data = z.object({
    name: z.string(),
    slug: z.string(),
    niche: z.string(),
    description: z.string().optional(),
    htmlFiles: z.record(z.string(), z.string()),
    thumbnail: z.string().optional(),
  }).parse(req.body);

  const template = await prisma.template.create({ data });
  res.status(201).json(template);
});
