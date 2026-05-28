import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import { authRouter } from './routes/auth';
import { configRouter } from './routes/config';
import { blogRouter } from './routes/blog';
import { pagesRouter } from './routes/pages';
import { mediaRouter } from './routes/media';
import { publishRouter } from './routes/publish';
import { adminRouter } from './routes/admin';
import templateSchemaRouter from './routes/template-schema';
import siteManagementRouter from './routes/site-management';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './lib/prisma';
import bcrypt from 'bcryptjs';

async function ensureTables() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS public.template_schemas (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      "templateId" TEXT NOT NULL UNIQUE,
      schema JSONB NOT NULL DEFAULT '{}',
      pages JSONB NOT NULL DEFAULT '[]',
      sections JSONB NOT NULL DEFAULT '[]',
      fields JSONB NOT NULL DEFAULT '{}',
      "autoDetected" BOOLEAN NOT NULL DEFAULT false,
      version INTEGER NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `ALTER TABLE public.template_schemas ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1`,
    `CREATE TABLE IF NOT EXISTS public.clients (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      "passwordHash" TEXT NOT NULL,
      "businessName" TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      "templateId" TEXT,
      domain TEXT,
      plan TEXT NOT NULL DEFAULT 'basic',
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "lastPublishedAt" TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS public.pages (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      "clientId" TEXT NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      sections JSONB NOT NULL DEFAULT '[]',
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS public.site_configs (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      "clientId" TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL DEFAULT '',
      "jsonValue" JSONB,
      type TEXT NOT NULL DEFAULT 'text',
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE("clientId", key)
    )`,
    `CREATE TABLE IF NOT EXISTS public.blog_posts (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      "clientId" TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      excerpt TEXT,
      "coverImage" TEXT,
      "isPublished" BOOLEAN NOT NULL DEFAULT false,
      "publishedAt" TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS public.media_files (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      "clientId" TEXT NOT NULL,
      filename TEXT NOT NULL,
      "originalName" TEXT NOT NULL,
      "mimeType" TEXT NOT NULL,
      size INTEGER NOT NULL,
      url TEXT NOT NULL,
      "r2Key" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS "r2Key" TEXT`,
    `ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS niche TEXT NOT NULL DEFAULT 'general'`,
    `ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS description TEXT`,
    `ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS thumbnail TEXT`,
    `ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true`,
    `ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()`,
    `ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()`,
    `ALTER TABLE public.media_files ADD COLUMN IF NOT EXISTS name TEXT`,
    `ALTER TABLE public.media_files ADD COLUMN IF NOT EXISTS width INTEGER`,
    `ALTER TABLE public.media_files ADD COLUMN IF NOT EXISTS height INTEGER`,
    `ALTER TABLE public.media_files ADD COLUMN IF NOT EXISTS alt TEXT`,
    `ALTER TABLE public.media_files ADD COLUMN IF NOT EXISTS folder TEXT NOT NULL DEFAULT '/'`,
    `ALTER TABLE public.media_files ADD COLUMN IF NOT EXISTS tags JSONB`,
  ];
  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (err: any) {
      // Ignore "already exists" errors, log others
      if (!err.message?.includes('already exists') && !err.message?.includes('duplicate')) {
        console.error('ensureTables stmt error:', err.message);
      }
    }
  }
  console.log('DB tables ensured.');
}

async function seedAdminClient() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin seed.');
    return;
  }
  try {
    const existing = await prisma.client.findUnique({ where: { email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.client.create({
        data: {
          email,
          passwordHash,
          businessName: 'Admin',
          slug: 'admin',
          plan: 'enterprise',
          isActive: true,
        },
      });
      console.log(`Admin client created: ${email}`);
    } else {
      console.log(`Admin client exists: ${email}`);
    }
  } catch (err: any) {
    console.error('seedAdminClient error:', err.message);
  }
}

const app = express();
const PORT = process.env.PORT ?? 4000;

const allowedOrigins = [
  'http://localhost:5173',
  ...(process.env.UI_URL ? process.env.UI_URL.split(',').map(o => o.trim()) : []),
];

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use('/api/auth',             authRouter);
app.use('/api/config',           configRouter);
app.use('/api/blog',             blogRouter);
app.use('/api/pages',            pagesRouter);
app.use('/api/media',            mediaRouter);
app.use('/api/publish',          publishRouter);
app.use('/api/admin',            adminRouter);
app.use('/api/template-schema',  templateSchemaRouter);
app.use('/api/site',             siteManagementRouter);

app.use(errorHandler);

ensureTables()
  .then(() => seedAdminClient())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`CMS API running on http://localhost:${PORT}`);
    });
  });
