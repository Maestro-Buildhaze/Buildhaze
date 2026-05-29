import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import slugify from 'slugify';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { verifyToken } from '../lib/jwt';
import { buildAndPublish } from './publish';

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

  // Auto-generate pages from template schema
  if (data.templateId) {
    try {
      const { generateClientPages } = await import('../services/cms-schema');
      const result = await generateClientPages(client.id, data.templateId);
      console.log(`Generated ${result.pagesCreated} pages and ${result.sectionsCreated} sections for client ${client.id}`);
    } catch (err) {
      console.error('Failed to generate client pages from template:', err);
      // Don't fail client creation if config generation fails
    }
  }

  // Also add any manual initial config if provided
  if (data.initialConfig && Object.keys(data.initialConfig).length > 0) {
    await prisma.$transaction(
      Object.entries(data.initialConfig).map(([key, value]) =>
        prisma.siteConfig.upsert({ 
          where: { clientId_key: { clientId: client.id, key } },
          create: { clientId: client.id, key, value },
          update: { value }
        })
      )
    );
  }

  // Auto-publish if template is assigned
  if (data.templateId) {
    try {
      await buildAndPublish(client.id);
    } catch (err) {
      console.error('Auto-publish failed:', err);
      // Don't fail client creation if publish fails
    }
  }

  res.status(201).json({
    id: client.id,
    email: client.email,
    businessName: client.businessName,
    slug: client.slug,
    plan: client.plan,
    publishedAt: data.templateId ? new Date() : null,
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

// Create template with r2Key and optional pre-parsed schema from upload step
adminRouter.post('/templates', async (req, res) => {
  const data = z.object({
    name: z.string(),
    slug: z.string(),
    niche: z.string(),
    description: z.string().optional(),
    r2Key: z.string(),
    thumbnail: z.string().optional(),
    parsedSchema: z.any().optional(), // pre-parsed schema from /upload step
  }).parse(req.body);

  const { parsedSchema, ...templateData } = data;
  const template = await prisma.template.upsert({
    where: { slug: templateData.slug },
    create: templateData,
    update: { name: templateData.name, niche: templateData.niche, description: templateData.description, r2Key: templateData.r2Key, thumbnail: templateData.thumbnail },
  });

  // If we already have parsed schema from upload step, save it directly
  if (parsedSchema?.pages && parsedSchema.pages.length > 0) {
    const pages = parsedSchema.pages;
    const totalSections = pages.reduce((s: number, p: any) => s + p.sections.length, 0);
    const totalFields = pages.reduce((s: number, p: any) =>
      s + p.sections.reduce((s2: number, sec: any) => s2 + sec.fields.length, 0), 0);
    await prisma.templateSchema.upsert({
      where: { templateId: template.id },
      create: {
        templateId: template.id,
        schema: { pages } as any,
        pages: pages.map((p: any) => ({ id: p.id, name: p.name, slug: p.slug, file: p.file })) as any,
        sections: pages.flatMap((p: any) => p.sections.map((s: any) => ({ ...s, pageId: p.id }))) as any,
        fields: {} as any,
        autoDetected: true,
      },
      update: {
        schema: { pages } as any,
        pages: pages.map((p: any) => ({ id: p.id, name: p.name, slug: p.slug, file: p.file })) as any,
        sections: pages.flatMap((p: any) => p.sections.map((s: any) => ({ ...s, pageId: p.id }))) as any,
        autoDetected: true,
      },
    });
    return res.status(201).json({
      ...template,
      schemaGenerated: true,
      pagesDetected: pages.length,
      sectionsDetected: totalSections,
      fieldsDetected: totalFields,
    });
  }

  // Fallback: try to detect from R2
  try {
    const { detectAndSaveTemplateSchema } = await import('../services/cms-schema');
    const result = await detectAndSaveTemplateSchema(template.id);
    res.status(201).json({
      ...template,
      schemaGenerated: true,
      pagesDetected: result.pagesDetected,
      sectionsDetected: result.sectionsDetected,
      fieldsDetected: result.fieldsDetected,
    });
  } catch (error) {
    console.error('Failed to auto-generate schema:', error);
    res.status(201).json({
      ...template,
      schemaGenerated: false,
      schemaError: (error as Error).message,
    });
  }
});

// Get single template details (with schema)
adminRouter.get('/templates/:id', async (req, res) => {
  const template = await prisma.template.findUnique({
    where: { id: req.params.id },
    include: { schema: true },
  });
  if (!template) throw new AppError(404, 'Template not found');
  res.json(template);
});

// POST /api/admin/templates/:id/detect-schema
adminRouter.post('/templates/:id/detect-schema', async (req, res) => {
  try {
    const { detectAndSaveTemplateSchema } = await import('../services/cms-schema');
    const result = await detectAndSaveTemplateSchema(req.params.id);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/templates/:id/regenerate-schema (alias)
adminRouter.post('/templates/:id/regenerate-schema', async (req, res) => {
  try {
    const { detectAndSaveTemplateSchema } = await import('../services/cms-schema');
    const result = await detectAndSaveTemplateSchema(req.params.id);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/clients/:id/regenerate-pages
adminRouter.post('/clients/:id/regenerate-pages', async (req, res) => {
  try {
    const client = await prisma.client.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { id: true, templateId: true },
    });
    if (!client.templateId) {
      return res.status(400).json({ error: 'Client has no template assigned' });
    }
    const { generateClientPages } = await import('../services/cms-schema');
    const result = await generateClientPages(client.id, client.templateId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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
  const files = req.files as Express.Multer.File[];
  const paths = req.body.paths as string[];
  const templateSlug = req.body.templateSlug as string;
  
  if (!files || !paths || !templateSlug) {
    throw new AppError(400, 'Missing files, paths or templateSlug');
  }

  // Parse HTML files in-memory to extract schema immediately (no R2 needed)
  const { parseTemplateFiles } = await import('../services/cms-parser');
  const htmlMap: Record<string, string> = {};
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = Array.isArray(paths) ? paths[i] : paths;
    const cleanPath = filePath.replace(/^[^/]+\//, '');
    if (cleanPath.endsWith('.html')) {
      htmlMap[cleanPath] = file.buffer.toString('utf-8');
    }
  }
  const pages = parseTemplateFiles(htmlMap);
  const totalSections = pages.reduce((s, p) => s + p.sections.length, 0);
  const totalFields = pages.reduce((s, p) => s + p.sections.reduce((s2, sec) => s2 + sec.fields.length, 0), 0);

  // Upload to R2 if credentials available
  const r2Key = `templates/${templateSlug}`;
  if (process.env.CF_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID) {
    try {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
        },
      });
      const bucket = process.env.R2_BUCKET ?? 'buildhaze-cms';
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
        const cleanPath = filePath.replace(/^[^/]+\//, '');
        const ext = cleanPath.substring(cleanPath.lastIndexOf('.')).toLowerCase();
        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: `${r2Key}/${cleanPath}`,
          Body: file.buffer,
          ContentType: contentTypes[ext] || 'application/octet-stream',
        }));
      }
    } catch (r2Err) {
      console.error('R2 upload failed (non-fatal):', r2Err);
    }
  }

  res.json({
    success: true,
    r2Key,
    parsedSchema: { pages },
    pagesDetected: pages.length,
    sectionsDetected: totalSections,
    fieldsDetected: totalFields,
  });
});

// Get client full details with all data
adminRouter.get('/clients/:id/details', async (req, res) => {
  const client = await prisma.client.findUnique({
    where: { id: req.params.id },
    include: {
      template: { include: { schema: true } },
      siteConfig: true,
      blogPosts: { orderBy: { createdAt: 'desc' } },
      mediaFiles: { orderBy: { createdAt: 'desc' } },
      pages: { orderBy: { sortOrder: 'asc' } },
      siteStatistics: true,
      sitePublishLogs: { orderBy: { publishedAt: 'desc' }, take: 20 },
      _count: { select: { blogPosts: true, mediaFiles: true, pages: true } },
    },
  });
  if (!client) throw new AppError(404, 'Client not found');
  res.json(client);
});

// Get client statistics (from Cloudflare or cached)
adminRouter.get('/clients/:id/stats', async (req, res) => {
  const client = await prisma.client.findUnique({
    where: { id: req.params.id },
    select: { id: true, domain: true, slug: true, siteStatistics: true },
  });
  if (!client) throw new AppError(404, 'Client not found');

  // Try to fetch real-time stats from Cloudflare
  const { fetchCloudflareStats, updateClientStats } = await import('../services/cloudflare-analytics');
  const domain = client.domain || `${client.slug}.onrender.com`;
  const realTimeStats = await fetchCloudflareStats(domain);

  if (realTimeStats) {
    // Update database with fresh stats
    await updateClientStats(client.id, realTimeStats);
    
    res.json({
      clientId: client.id,
      domain: client.domain,
      ...realTimeStats,
      lastUpdated: new Date(),
      source: 'cloudflare',
    });
    return;
  }

  // Fallback to cached stats
  const stats = client.siteStatistics || {
    totalVisits: 0,
    uniqueVisitors: 0,
    pageViews: 0,
    bounceRate: 0,
    avgSessionDuration: 0,
    topPages: [],
    byCountry: [],
    byReferrer: [],
    dailyStats: [],
  };

  res.json({
    clientId: client.id,
    domain: client.domain,
    ...stats,
    lastUpdated: client.siteStatistics?.lastUpdated || null,
    source: 'cache',
  });
});

// Get client publish history
adminRouter.get('/clients/:id/publish-history', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const history = await prisma.sitePublishLog.findMany({
    where: { clientId: req.params.id },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });
  res.json({ history });
});

// Get client blog posts
adminRouter.get('/clients/:id/blog-posts', async (req, res) => {
  const posts = await prisma.blogPost.findMany({
    where: { clientId: req.params.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(posts);
});

// Get client media files
adminRouter.get('/clients/:id/media', async (req, res) => {
  const media = await prisma.mediaFile.findMany({
    where: { clientId: req.params.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(media);
});

// Get client site config
adminRouter.get('/clients/:id/config', async (req, res) => {
  const configs = await prisma.siteConfig.findMany({
    where: { clientId: req.params.id },
  });
  
  // Convert to key-value object
  const configMap: Record<string, any> = {};
  for (const c of configs) {
    configMap[c.key] = {
      value: c.value,
      type: c.type,
      jsonValue: c.jsonValue,
    };
  }
  
  res.json({ configs: configMap, raw: configs });
});

// Update client site config (batch)
adminRouter.post('/clients/:id/config', async (req, res) => {
  const { configs } = req.body;
  if (!Array.isArray(configs)) {
    throw new AppError(400, 'configs must be an array');
  }

  const results = await prisma.$transaction(
    configs.map((c: any) =>
      prisma.siteConfig.upsert({
        where: { clientId_key: { clientId: req.params.id, key: c.key } },
        create: {
          clientId: req.params.id,
          key: c.key,
          value: String(c.value),
          type: c.type || 'text',
          jsonValue: c.jsonValue || null,
        },
        update: {
          value: String(c.value),
          type: c.type || 'text',
          jsonValue: c.jsonValue || null,
        },
      })
    )
  );

  res.json({ success: true, updated: results.length });
});

// Global Analytics Dashboard - stats for all clients
adminRouter.get('/analytics/dashboard', async (_req, res) => {
  const { getAllClientsStats } = await import('../services/cloudflare-analytics');
  
  // Get all active clients
  const clients = await prisma.client.findMany({
    where: { isActive: true },
    select: { id: true, domain: true, slug: true, plan: true, createdAt: true },
  });

  // Get stats for each client
  const clientStats = await getAllClientsStats();

  // Aggregate totals
  const totals = clientStats.reduce((acc, c) => {
    if (c.stats) {
      acc.totalVisits += c.stats.totalVisits;
      acc.uniqueVisitors += c.stats.uniqueVisitors;
      acc.pageViews += c.stats.pageViews;
    }
    return acc;
  }, { totalVisits: 0, uniqueVisitors: 0, pageViews: 0 });

  // Plan breakdown
  const planBreakdown = clients.reduce((acc, c) => {
    acc[c.plan || 'basic'] = (acc[c.plan || 'basic'] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Today's new clients
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const newClientsToday = clients.filter(c => new Date(c.createdAt) >= today).length;

  // Calculate growth rate (compare with last 7 days)
  const lastWeek = await prisma.client.count({
    where: { createdAt: { gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) } },
  });
  const growthRate = lastWeek > 0 ? ((clients.length - lastWeek) / lastWeek) * 100 : 0;

  res.json({
    realtime: {
      tc: clients.length,
      ac: clients.filter(c => clientStats.find(s => s.clientId === c.id && s.stats)).length,
      ps: clients.filter(c => c.domain).length,
      totalMediaFiles: await prisma.mediaFile.count(),
    },
    today: {
      date: today.toISOString().split('T')[0],
      totalClients: clients.length,
      activeClients: totals.totalVisits > 0 ? clients.length : 0,
      totalVisits: totals.totalVisits,
      totalPageViews: totals.pageViews,
      storageUsedMB: Math.round(await prisma.mediaFile.aggregate({ _sum: { size: true } }).then(r => (r._sum.size || 0) / 1024 / 1024)),
      totalPublished: await prisma.sitePublishLog.count({ where: { status: 'success' } }),
      newClientsToday,
      growthRate,
      planBreakdown,
    },
    clients: clientStats.filter(c => c.stats).map(c => ({
      clientId: c.clientId,
      domain: c.domain,
      ...c.stats,
    })),
  });
});

// System Health Check with R2
adminRouter.get('/health', async (_req, res) => {
  const health: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {},
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'production',
  };

  // Check Database
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = {
      status: 'healthy',
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    health.services.database = { status: 'unhealthy', error: err.message };
    health.status = 'unhealthy';
  }

  // Check API (self)
  health.services.api = {
    status: 'healthy',
    uptime: process.uptime(),
  };

  // Check R2 Storage
  try {
    const { S3Client, ListBucketsCommand } = await import('@aws-sdk/client-s3');
    
    // Validate R2 endpoint
    const r2Endpoint = process.env.R2_ENDPOINT;
    const r2KeyId = process.env.R2_ACCESS_KEY_ID;
    
    console.log('R2 Debug:', {
      endpoint: r2Endpoint,
      hasKeyId: !!r2KeyId,
      keyIdPrefix: r2KeyId ? r2KeyId.substring(0, 10) + '...' : 'none',
      hasSecret: !!process.env.R2_SECRET_ACCESS_KEY,
    });
    
    if (!r2Endpoint) {
      throw new Error('R2_ENDPOINT not configured');
    }
    if (!r2KeyId) {
      throw new Error('R2_ACCESS_KEY_ID not configured');
    }
    if (!process.env.R2_SECRET_ACCESS_KEY) {
      throw new Error('R2_SECRET_ACCESS_KEY not configured');
    }
    
    // Validate endpoint format
    if (!r2Endpoint.includes('r2.cloudflarestorage.com')) {
      throw new Error(`Invalid R2 endpoint: ${r2Endpoint}. Must contain 'r2.cloudflarestorage.com'`);
    }
    
    const r2Client = new S3Client({
      region: 'auto',
      endpoint: r2Endpoint,
      credentials: {
        accessKeyId: r2KeyId,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
    
    const start = Date.now();
    const result = await r2Client.send(new ListBucketsCommand({}));
    
    health.services.r2 = {
      status: 'healthy',
      latencyMs: Date.now() - start,
      endpoint: r2Endpoint,
      bucketsFound: result.Buckets?.length || 0,
    };
  } catch (err: any) {
    console.error('R2 Health Check Error:', err);
    health.services.r2 = {
      status: 'degraded',
      error: err.message,
      errorType: err.name,
      endpoint: process.env.R2_ENDPOINT,
      hasCredentials: !!(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY),
    };
    if (health.status === 'healthy') health.status = 'degraded';
  }

  res.json(health);
});
