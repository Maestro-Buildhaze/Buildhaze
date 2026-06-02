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
import adminFeaturesRouter from './routes/admin-features';
import templateSchemaRouter from './routes/template-schema';
import siteManagementRouter from './routes/site-management';
import { analyticsRouter } from './routes/analytics';
import { domainRouter } from './routes/domain';
import { aiRouter } from './routes/ai';
import { newsRouter } from './routes/news';
import siteApiRouter from './routes/site-api';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './lib/prisma';
import bcrypt from 'bcryptjs';

async function ensureTables() {
  const statements = [
    // Backup logs table
    `CREATE TABLE IF NOT EXISTS public.backup_logs (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      filename TEXT,
      "tablesBackedUp" INTEGER NOT NULL DEFAULT 0,
      "recordsCount" INTEGER NOT NULL DEFAULT 0,
      "sizeBytes" INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      "errorMessage" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    // Core tables
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
    // 1. Global Analytics
    `CREATE TABLE IF NOT EXISTS public.global_analytics (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      date TIMESTAMPTZ NOT NULL DEFAULT now() UNIQUE,
      "totalClients" INTEGER NOT NULL DEFAULT 0,
      "activeClients" INTEGER NOT NULL DEFAULT 0,
      "totalVisits" INTEGER NOT NULL DEFAULT 0,
      "totalPageViews" INTEGER NOT NULL DEFAULT 0,
      "storageUsedMB" INTEGER NOT NULL DEFAULT 0,
      "totalPublished" INTEGER NOT NULL DEFAULT 0,
      "newClientsToday" INTEGER NOT NULL DEFAULT 0,
      "planBreakdown" JSONB NOT NULL DEFAULT '{}',
      "growthRate" REAL NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    // 2. Activity Logs
    `CREATE TABLE IF NOT EXISTS public.activity_logs (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      "actorId" TEXT,
      "actorType" TEXT NOT NULL,
      "actorEmail" TEXT,
      action TEXT NOT NULL,
      "targetType" TEXT,
      "targetId" TEXT,
      "targetName" TEXT,
      details JSONB,
      "ipAddress" TEXT,
      "userAgent" TEXT,
      success BOOLEAN NOT NULL DEFAULT true,
      "errorMessage" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON public.activity_logs("actorId", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action, "createdAt")`,
    `CREATE INDEX IF NOT EXISTS idx_activity_logs_target ON public.activity_logs("targetType", "targetId")`,
    // 3. Backups
    `CREATE TABLE IF NOT EXISTS public.backups (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      "sizeBytes" INTEGER,
      "downloadUrl" TEXT,
      "r2Key" TEXT,
      tables JSONB NOT NULL DEFAULT '[]',
      "startedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "completedAt" TIMESTAMPTZ,
      "errorMessage" TEXT,
      "triggeredBy" TEXT NOT NULL,
      "autoScheduled" BOOLEAN NOT NULL DEFAULT false,
      "nextAutoAt" TIMESTAMPTZ,
      "retentionDays" INTEGER NOT NULL DEFAULT 30,
      "isDeleted" BOOLEAN NOT NULL DEFAULT false
    )`,
    // 4. Custom Domains
    `CREATE TABLE IF NOT EXISTS public.custom_domains (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      "clientId" TEXT NOT NULL,
      domain TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      "dnsStatus" TEXT,
      "dnsRecords" JSONB,
      "sslStatus" TEXT,
      "sslExpiresAt" TIMESTAMPTZ,
      "cfZoneId" TEXT,
      "cfRecordId" TEXT,
      "isPrimary" BOOLEAN NOT NULL DEFAULT false,
      "redirectWww" BOOLEAN NOT NULL DEFAULT true,
      "lastCheckedAt" TIMESTAMPTZ,
      "errorMessage" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_custom_domains_client ON public.custom_domains("clientId", status)`,
    `CREATE INDEX IF NOT EXISTS idx_custom_domains_ssl ON public.custom_domains("sslExpiresAt")`,
    // 5. Subscriptions & Invoices
    `CREATE TABLE IF NOT EXISTS public.subscriptions (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      "clientId" TEXT NOT NULL UNIQUE,
      plan TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      "priceMonthly" DECIMAL(10,2) NOT NULL DEFAULT 0,
      "priceYearly" DECIMAL(10,2) NOT NULL DEFAULT 0,
      "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
      "currentPeriodStart" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "currentPeriodEnd" TIMESTAMPTZ,
      "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
      "paymentMethod" TEXT,
      "externalSubId" TEXT,
      "trialEndsAt" TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS public.invoices (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      "subscriptionId" TEXT NOT NULL,
      "clientId" TEXT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      status TEXT NOT NULL,
      "invoiceNumber" TEXT NOT NULL UNIQUE,
      description TEXT,
      "pdfUrl" TEXT,
      "paidAt" TIMESTAMPTZ,
      "dueDate" TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_client ON public.invoices("clientId", "createdAt")`,
    // 6. Quotas
    `CREATE TABLE IF NOT EXISTS public.quotas (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      "clientId" TEXT NOT NULL UNIQUE,
      "pagesUsed" INTEGER NOT NULL DEFAULT 0,
      "storageUsedMB" INTEGER NOT NULL DEFAULT 0,
      "blogPostsUsed" INTEGER NOT NULL DEFAULT 0,
      "mediaFilesUsed" INTEGER NOT NULL DEFAULT 0,
      "bandwidthUsedMB" INTEGER NOT NULL DEFAULT 0,
      "visitsUsed" INTEGER NOT NULL DEFAULT 0,
      "maxPages" INTEGER NOT NULL DEFAULT 5,
      "maxStorageMB" INTEGER NOT NULL DEFAULT 100,
      "maxBlogPosts" INTEGER NOT NULL DEFAULT 10,
      "maxMediaFiles" INTEGER NOT NULL DEFAULT 50,
      "maxBandwidthMB" INTEGER NOT NULL DEFAULT 10000,
      "maxVisits" INTEGER NOT NULL DEFAULT 10000,
      "customDomain" BOOLEAN NOT NULL DEFAULT false,
      ecommerce BOOLEAN NOT NULL DEFAULT false,
      "prioritySupport" BOOLEAN NOT NULL DEFAULT false,
      "lastResetAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    // 7. Template Versions
    `CREATE TABLE IF NOT EXISTS public.template_versions (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      "templateId" TEXT NOT NULL,
      version INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      "r2Key" TEXT NOT NULL,
      "schemaSnapshot" JSONB,
      "createdBy" TEXT,
      "isCurrent" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE("templateId", version)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_template_versions_template ON public.template_versions("templateId", "createdAt")`,
    // 8. Email Templates
    `CREATE TABLE IF NOT EXISTS public.email_templates (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      "htmlBody" TEXT NOT NULL,
      "textBody" TEXT NOT NULL,
      "fromName" TEXT NOT NULL DEFAULT 'Buildhaze',
      "fromEmail" TEXT NOT NULL DEFAULT 'noreply@buildhaze.com',
      variables JSONB NOT NULL DEFAULT '[]',
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "lastSentAt" TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    // 9. Maintenance Mode
    `CREATE TABLE IF NOT EXISTS public.maintenance_mode (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      "isEnabled" BOOLEAN NOT NULL DEFAULT false,
      message TEXT NOT NULL DEFAULT 'We are performing scheduled maintenance. Please check back soon.',
      "allowedIps" JSONB,
      "startAt" TIMESTAMPTZ,
      "endAt" TIMESTAMPTZ,
      "countdownEnabled" BOOLEAN NOT NULL DEFAULT false,
      theme TEXT NOT NULL DEFAULT 'dark',
      "createdBy" TEXT,
      "clientOverrides" JSONB,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    // 10. Export Jobs
    `CREATE TABLE IF NOT EXISTS public.export_jobs (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      format TEXT NOT NULL,
      filters JSONB,
      "recordCount" INTEGER,
      "downloadUrl" TEXT,
      "r2Key" TEXT,
      "fileSizeBytes" INTEGER,
      "errorMessage" TEXT,
      "expiresAt" TIMESTAMPTZ,
      "downloadedAt" TIMESTAMPTZ,
      "createdBy" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "completedAt" TIMESTAMPTZ
    )`,
    `CREATE INDEX IF NOT EXISTS idx_export_jobs_creator ON public.export_jobs("createdBy", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON public.export_jobs(status, "createdAt")`,
    // 11. Site Publish Logs
    `CREATE TABLE IF NOT EXISTS public.site_publish_logs (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      "clientId" TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      "publishedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "domain" TEXT,
      "errorMessage" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_site_publish_logs_client ON public.site_publish_logs("clientId", "publishedAt")`,
    // 12. SEO Global
    `CREATE TABLE IF NOT EXISTS public.seo_global (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      "clientId" TEXT NOT NULL UNIQUE,
      "siteTitle" TEXT,
      "siteDescription" TEXT,
      "siteKeywords" TEXT,
      "robotsTxt" TEXT,
      "faviconUrl" TEXT,
      "ogImageDefault" TEXT,
      "facebookUrl" TEXT,
      "instagramUrl" TEXT,
      "twitterUrl" TEXT,
      "linkedinUrl" TEXT,
      "youtubeUrl" TEXT,
      "googleSiteVerification" TEXT,
      "bingVerification" TEXT,
      "organizationName" TEXT,
      "organizationLogo" TEXT,
      "localBusiness" BOOLEAN NOT NULL DEFAULT false,
      "localBusinessType" TEXT,
      "sitemapEnabled" BOOLEAN NOT NULL DEFAULT true,
      "sitemapChangefreq" TEXT NOT NULL DEFAULT 'weekly',
      "sitemapPriority" REAL NOT NULL DEFAULT 0.8,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    // 12. System Settings
    `CREATE TABLE IF NOT EXISTS public.system_settings (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value JSONB NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    // Core table additions
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
    `ALTER TABLE public.media_files ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()`,
    `ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS "metaTitle" TEXT`,
    `ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS "metaDesc" TEXT`,
    `ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'`,
    `ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS "readTime" TEXT`,
    // 13. Domain Configs (per-client custom domain management)
    `CREATE TABLE IF NOT EXISTS public.domain_configs (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      "clientId" TEXT NOT NULL UNIQUE,
      domain TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unverified',
      "cfZoneId" TEXT,
      "cfRecordId" TEXT,
      "dnsRecords" JSONB,
      "verifiedAt" TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_domain_configs_client ON public.domain_configs("clientId")`,
    // 14. Client Credits (AI usage tracking)
    `CREATE TABLE IF NOT EXISTS public.client_credits (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      "clientId" TEXT NOT NULL UNIQUE,
      "totalCredits" INTEGER NOT NULL DEFAULT 100000,
      "usedCredits" INTEGER NOT NULL DEFAULT 0,
      "monthlyLimit" INTEGER NOT NULL DEFAULT 50000,
      "monthlyUsed" INTEGER NOT NULL DEFAULT 0,
      "resetAt" TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_client_credits_client ON public.client_credits("clientId")`,
    // 15. News Cache (niche news per client)
    `CREATE TABLE IF NOT EXISTS public.news_cache (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
      "clientId" TEXT NOT NULL,
      niche TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      url TEXT NOT NULL DEFAULT '#',
      source TEXT,
      "imageUrl" TEXT,
      "fetchedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_news_cache_client ON public.news_cache("clientId", "fetchedAt")`,
  ];
  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (err: any) {
      if (!err.message?.includes('already exists') && !err.message?.includes('duplicate') && !err.message?.includes('Duplicate') && !err.message?.includes('duplicat')) {
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

async function seedEmailTemplates() {
  const templates = [
    {
      key: 'welcome',
      name: 'Welcome Email',
      subject: 'Welcome to {{businessName}}!',
      htmlBody: `<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2>Welcome to {{businessName}}!</h2>
<p>Hi {{clientName}},</p>
<p>Your website is now ready. You can access your admin panel at:</p>
<p><a href="{{loginUrl}}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Login to Dashboard</a></p>
<p>Need help? Reply to this email anytime.</p>
<p>Best regards,<br>The Buildhaze Team</p>
</body></html>`,
      textBody: 'Welcome to {{businessName}}!\n\nHi {{clientName}},\n\nYour website is now ready. Login at: {{loginUrl}}\n\nNeed help? Reply to this email.\n\nBest regards,\nThe Buildhaze Team',
      variables: ['clientName', 'businessName', 'loginUrl'],
    },
    {
      key: 'password_reset',
      name: 'Password Reset',
      subject: 'Reset your password for {{businessName}}',
      htmlBody: `<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2>Password Reset Request</h2>
<p>Hi {{clientName}},</p>
<p>You requested a password reset. Click below to set a new password:</p>
<p><a href="{{resetUrl}}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
<p>Best regards,<br>The Buildhaze Team</p>
</body></html>`,
      textBody: 'Password Reset Request\n\nHi {{clientName}},\n\nReset your password at: {{resetUrl}}\n\nIf you did not request this, ignore this email.\n\nBest regards,\nThe Buildhaze Team',
      variables: ['clientName', 'businessName', 'resetUrl'],
    },
    {
      key: 'site_published',
      name: 'Site Published',
      subject: 'Your website {{businessName}} is now live!',
      htmlBody: `<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2>Your Website is Live!</h2>
<p>Hi {{clientName}},</p>
<p>Congratulations! Your website <strong>{{businessName}}</strong> has been published and is now live at:</p>
<p><a href="{{siteUrl}}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Visit Your Site</a></p>
<p>Share it with your customers and start growing your business!</p>
<p>Best regards,<br>The Buildhaze Team</p>
</body></html>`,
      textBody: 'Your Website is Live!\n\nHi {{clientName}},\n\nYour website {{businessName}} is now live at: {{siteUrl}}\n\nShare it with your customers!\n\nBest regards,\nThe Buildhaze Team',
      variables: ['clientName', 'businessName', 'siteUrl'],
    },
    {
      key: 'invoice',
      name: 'Invoice',
      subject: 'Invoice {{invoiceNumber}} from Buildhaze',
      htmlBody: `<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2>Invoice {{invoiceNumber}}</h2>
<p>Hi {{clientName}},</p>
<p>Thank you for your business. Here's your invoice:</p>
<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
<tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Description</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">{{description}}</td></tr>
<tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Amount</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">{{amount}} {{currency}}</td></tr>
<tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Due Date</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">{{dueDate}}</td></tr>
</table>
<p><a href="{{paymentUrl}}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Pay Invoice</a></p>
<p>Best regards,<br>The Buildhaze Team</p>
</body></html>`,
      textBody: 'Invoice {{invoiceNumber}}\n\nHi {{clientName}},\n\nDescription: {{description}}\nAmount: {{amount}} {{currency}}\nDue Date: {{dueDate}}\n\nPay at: {{paymentUrl}}\n\nBest regards,\nThe Buildhaze Team',
      variables: ['clientName', 'invoiceNumber', 'description', 'amount', 'currency', 'dueDate', 'paymentUrl'],
    },
  ];

  try {
    for (const tmpl of templates) {
      const existing = await prisma.$queryRaw`SELECT id FROM email_templates WHERE key = ${tmpl.key} LIMIT 1`;
      if (!existing || (Array.isArray(existing) && existing.length === 0)) {
        await prisma.$executeRaw`
          INSERT INTO email_templates (id, key, name, subject, "htmlBody", "textBody", variables, "isActive", "createdAt", "updatedAt")
          VALUES (gen_random_uuid()::text, ${tmpl.key}, ${tmpl.name}, ${tmpl.subject}, ${tmpl.htmlBody}, ${tmpl.textBody}, ${JSON.stringify(tmpl.variables)}::jsonb, true, now(), now())
        `;
        console.log(`Email template created: ${tmpl.key}`);
      }
    }
  } catch (err: any) {
    console.error('seedEmailTemplates error:', err.message);
  }
}

async function seedSystemSettings() {
  try {
    // Check if maintenance mode record exists
    const existing = await prisma.$queryRaw`SELECT id FROM maintenance_mode LIMIT 1`;
    if (!existing || (Array.isArray(existing) && existing.length === 0)) {
      await prisma.$executeRaw`
        INSERT INTO maintenance_mode (id, "isEnabled", message, "countdownEnabled", theme, "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, false, 'We are performing scheduled maintenance. Please check back soon.', false, 'dark', now(), now())
      `;
      console.log('Maintenance mode settings created');
    }
  } catch (err: any) {
    console.error('seedSystemSettings error:', err.message);
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
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
      return;
    }
    // Allow Cloudflare Pages domains
    if (origin?.match(/\.pages\.dev$/)) {
      cb(null, true);
      return;
    }
    cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
// Dedicated keep-alive endpoint — accepts optional ?token= or x-ping-token header
// to help bypass CDN/WAF rate limiting on automated cron job requests.
app.get('/ping', (req, res) => {
  const expected = process.env.PING_SECRET;
  if (expected) {
    const provided = (req.query.token as string) || req.headers['x-ping-token'];
    if (provided !== expected) { res.status(401).json({ error: 'unauthorized' }); return; }
  }
  res.status(200).json({ alive: true, ts: new Date().toISOString() });
});

app.use('/api/auth',             authRouter);
app.use('/api/config',           configRouter);
app.use('/api/blog',             blogRouter);
app.use('/api/pages',            pagesRouter);
app.use('/api/media',            mediaRouter);
app.use('/api/publish',          publishRouter);
app.use('/api/admin',            adminRouter);
app.use('/api/admin',            adminFeaturesRouter);
app.use('/api/template-schema',  templateSchemaRouter);
app.use('/api/site',             siteManagementRouter);
app.use('/api/analytics',        analyticsRouter);
app.use('/api/domain',           domainRouter);
app.use('/api/ai',               aiRouter);
app.use('/api/news',             newsRouter);
app.use('/api/site-public',      siteApiRouter);

app.use(errorHandler);

ensureTables()
  .then(() => seedAdminClient())
  .then(() => seedEmailTemplates())
  .then(() => seedSystemSettings())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`CMS API running on http://localhost:${PORT}`);
      
      // Start auto backup (every 30 minutes)
      const { runAutoBackup } = require('./services/backup');
      setInterval(() => {
        runAutoBackup().catch(console.error);
      }, 30 * 60 * 1000); // 30 minutes
      console.log('Auto backup scheduler started (30min interval)');
    });
  });
