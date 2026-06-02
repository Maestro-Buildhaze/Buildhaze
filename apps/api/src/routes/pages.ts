import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import * as cheerio from 'cheerio';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { verifyToken } from '../lib/jwt';

export const pagesRouter: Router = Router();

// ── Preview endpoint (custom auth via ?token= query param) ────────────────
pagesRouter.get('/:slug/preview', async (req: Request, res: Response) => {
  let clientId: string;
  try {
    const hdr = req.headers.authorization;
    const tok = (hdr?.startsWith('Bearer ') ? hdr.slice(7) : null) ?? (req.query.token as string);
    if (!tok) throw new Error();
    clientId = verifyToken(tok).clientId;
  } catch { res.status(401).send('<html><body>Unauthorized</body></html>'); return; }

  const slugParam = req.params.slug; // 'index', 'contact', etc.
  const pageDbSlug = slugParam === 'index' ? '' : slugParam;

  const [client, page] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId }, include: { template: true } }),
    prisma.page.findFirst({ where: { clientId, slug: pageDbSlug } }),
  ]);

  if (!client?.template?.r2Key) { res.status(400).send('<html><body>No template</body></html>'); return; }

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '', secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '' },
  });

  let html: string;
  try {
    const r = await s3.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET ?? 'buildhaze-cms', Key: `${client.template.r2Key}/${slugParam}.html` }));
    html = await r.Body?.transformToString('utf-8') ?? '';
  } catch { res.status(404).send('<html><body>Template file not found</body></html>'); return; }

  const $ = cheerio.load(html);

  const sections: any[] = (page?.sections as any[]) ?? [];

  // Phase 1: Apply saved field values to the DOM
  for (const sec of sections) {
    if (sec.visible === false) continue;
    for (const f of (sec.fields ?? [])) {
      try {
        const el = $(f.selector).first();
        if (!el.length) continue;
        if (f.attribute === 'textContent') el.text(f.value ?? '');
        else if (f.attribute === 'innerHTML') el.html(f.value ?? '');
        else el.attr(f.attribute, f.value ?? '');
      } catch {}
    }
  }

  // Phase 2: Tag each section's container element with its DB section id.
  // Walk up from a field selector to find the nearest semantic container so the
  // click-to-select ID in the iframe matches the DB section id exactly.
  for (const sec of sections) {
    let tagged = false;
    for (const f of (sec.fields ?? [])) {
      const fieldEl = $(f.selector);
      if (!fieldEl.length) continue;
      let candidate = fieldEl.first().parent();
      for (let depth = 0; depth < 15; depth++) {
        if (!candidate.length || candidate.is('body') || candidate.is('html')) break;
        const ctag = (candidate.prop('tagName') ?? '').toLowerCase();
        const isContainer =
          ['section', 'header', 'footer', 'nav', 'main', 'article'].includes(ctag) ||
          candidate.is('[data-section]') ||
          candidate.parent().is('body');
        if (isContainer) {
          if (!candidate.attr('data-bh-section-id')) {
            candidate.attr('data-bh-section-id', sec.id);
          }
          tagged = true;
          break;
        }
        candidate = candidate.parent();
      }
      if (tagged) break;
    }
  }

  // Base URL for assets
  const domain = (client as any).domain as string | null;
  const baseUrl = domain ? (domain.startsWith('http') ? domain : `https://${domain}`) : `https://pub-61d0516b43b34d60b459185fed874027.r2.dev/${client.template.r2Key}`;
  $('head').prepend(`<base href="${baseUrl}/" />`);

  // Inject editor script
  $('body').append(`<style>[data-bh-section-id]{cursor:pointer;transition:outline .1s}[data-bh-section-id]:hover{outline:2px dashed rgba(5,150,105,.45)!important;outline-offset:3px}[data-bh-section-id][data-bh-sel]{outline:2px solid #059669!important;outline-offset:3px;box-shadow:0 0 0 5px rgba(5,150,105,.1)}</style><script>(function(){window.addEventListener('message',function(e){if(!e.data||!e.data.bhEditor)return;if(e.data.type==='highlight'){document.querySelectorAll('[data-bh-sel]').forEach(function(x){x.removeAttribute('data-bh-sel')});if(e.data.sectionId){var el=document.querySelector('[data-bh-section-id="'+e.data.sectionId+'"]');if(el){el.setAttribute('data-bh-sel','1');el.scrollIntoView({behavior:'smooth',block:'nearest'})}}}if(e.data.type==='update'){try{var el=document.querySelector(e.data.selector);if(!el)return;if(e.data.attribute==='textContent')el.textContent=e.data.value;else if(e.data.attribute==='innerHTML')el.innerHTML=e.data.value;else el.setAttribute(e.data.attribute,e.data.value)}catch(err){}}if(e.data.type==='toggle'){var tel=document.querySelector('[data-bh-section-id="'+e.data.sectionId+'"]');if(tel)tel.style.display=e.data.visible?'':'none'}});document.querySelectorAll('[data-bh-section-id]').forEach(function(el){el.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();window.parent.postMessage({bhEditor:true,type:'section-click',sectionId:el.getAttribute('data-bh-section-id')},'*')},true)});document.addEventListener('click',function(e){var t=e.target;while(t&&t!==document){if(t.tagName==='A'){e.preventDefault();return}t=t.parentElement}},true);window.parent.postMessage({bhEditor:true,type:'ready'},'*')})();<\/script>`);

  res.removeHeader('X-Frame-Options');
  res.removeHeader('Content-Security-Policy');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send($.html());
});

pagesRouter.use(requireAuth);

const sectionSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.record(z.unknown()),
  visible: z.boolean().optional(),
});

const pageSchema = z.object({
  title: z.string().min(1),
  sections: z.array(sectionSchema).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

pagesRouter.get('/', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const pages = await prisma.page.findMany({
    where: { clientId },
    orderBy: { sortOrder: 'asc' },
  });
  res.json(pages);
});

pagesRouter.get('/:slug', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const page = await prisma.page.findFirst({ where: { clientId, slug: req.params.slug } });
  if (!page) throw new AppError(404, 'Page not found');
  res.json(page);
});

pagesRouter.put('/:slug', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const data = pageSchema.partial().parse(req.body);

  const slugToFind = req.params.slug === 'index' ? '' : req.params.slug;
  const page = await prisma.page.findFirst({
    where: { clientId, slug: { in: [req.params.slug, slugToFind] } },
  });
  if (!page) throw new AppError(404, 'Page not found');

  const updated = await prisma.page.update({
    where: { id: page.id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.sections !== undefined && { sections: JSON.parse(JSON.stringify(data.sections)) }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
  });
  res.json(updated);
});

// PUT /pages/:slug/sections — update only sections array (used by SiteEditor)
pagesRouter.put('/:slug/sections', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { sections } = req.body;

  if (!Array.isArray(sections)) throw new AppError(400, 'sections must be an array');

  const slugToFind = req.params.slug === 'index' ? '' : req.params.slug;
  const page = await prisma.page.findFirst({
    where: { clientId, slug: { in: [req.params.slug, slugToFind] } },
  });
  if (!page) throw new AppError(404, 'Page not found');

  const updated = await prisma.page.update({
    where: { id: page.id },
    data: { sections: sections as any },
  });
  res.json(updated);
});
