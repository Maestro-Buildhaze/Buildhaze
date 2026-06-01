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

// Format a date in Romanian long form (e.g. "30 mai 2026")
function formatRoDate(date: Date | null | undefined): string {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}

// Rewrite relative href/src URLs so a page nested in a subdirectory can still
// reach root-level assets (style.css, main.js, index.html, etc.).
function rewriteRelativeUrls($: cheerio.CheerioAPI, prefix: string): void {
  const targets: Array<[string, string]> = [
    ['a', 'href'], ['link', 'href'], ['script', 'src'],
    ['img', 'src'], ['source', 'src'], ['video', 'src'], ['use', 'href'],
  ];
  for (const [tag, attr] of targets) {
    $(tag).each((_, el) => {
      const val = $(el).attr(attr);
      if (!val) return;
      // Skip absolute URLs, protocol-relative, anchors, root-relative, and special schemes
      if (/^(https?:|\/\/|#|\/|data:|mailto:|tel:|javascript:)/i.test(val)) return;
      $(el).attr(attr, prefix + val);
    });
  }
}

// Render a single blog post page by injecting post data into the template's
// blog-post.html using cheerio. `prefix` rewrites relative asset URLs.
function renderBlogPostPage(blogPostHtml: string, post: any, prefix: string): string {
  const $ = cheerio.load(blogPostHtml);

  const title = post.title || '';

  // Title + meta
  $('[data-field="article-title"]').text(title);
  if (title) $('title').text(post.metaTitle || `${title}`);
  const desc = post.metaDesc || post.excerpt || '';
  if (desc) {
    let meta = $('meta[name="description"]');
    if (!meta.length) {
      $('head').append('<meta name="description" content="">');
      meta = $('meta[name="description"]');
    }
    meta.attr('content', desc);
  }

  // Category
  if (post.category?.name) {
    const $cat = $('[data-field="article-category"]');
    $cat.text(post.category.name);
    if (post.category.color) $cat.attr('style', `background: ${post.category.color}; color: var(--primary);`);
  }

  // Hero / cover image
  if (post.coverImage) {
    $('[data-field="article-hero-image"]').attr('src', post.coverImage).attr('alt', title);
  }

  // Author
  if (post.author?.name) {
    $('[data-field="author-name"]').text(post.author.name);
    $('[data-field="author-bio-name"]').text(post.author.name);
  }
  if (post.author?.avatar) {
    $('[data-field="author-image"]').attr('src', post.author.avatar);
    $('[data-field="author-bio-image"]').attr('src', post.author.avatar);
  }
  if (post.author?.role) $('[data-field="author-bio-role"]').text(post.author.role);
  if (post.author?.bio) $('[data-field="author-bio-text"]').text(post.author.bio);

  // Date + read time
  const dateStr = formatRoDate(post.publishedAt);
  if (dateStr) $('[data-field="article-date"]').text(dateStr);
  if (post.readTime) $('[data-field="article-read-time"]').text(`${post.readTime} min de citire`);

  // Main content — inject rich HTML into the article body. Prefer the post's
  // own content, but fall back to customFields.content for older imports where
  // the full HTML was stored there.
  const richContent =
    post.content && post.content.replace(/<[^>]*>/g, '').trim().length > 40
      ? post.content
      : (post.customFields?.content || post.content || '');
  if (richContent) {
    const $body = $('[data-section="article-content"], .article-body').first();
    if ($body.length) $body.html(richContent);
  }

  // Table of contents from customFields.sections (if available)
  const sections = post.customFields?.sections;
  if (Array.isArray(sections) && sections.length > 0) {
    const tocHtml = sections
      .map((s: any, i: number) => `<li><a href="#${s.id}"><span class="toc-number">${i + 1}</span>${s.title}</a></li>`)
      .join('');
    $('[data-section="toc"]').html(tocHtml);
  }

  // Tags
  if (Array.isArray(post.tags) && post.tags.length > 0) {
    const tagsHtml = post.tags.map((t: string) => `<a href="#" class="article-tag">${t}</a>`).join('');
    $('.article-tags').html(tagsHtml);
  }

  // Fix relative asset/link URLs since the page lives in /blog/{slug}/
  rewriteRelativeUrls($, prefix);

  return $.html();
}

export async function buildAndPublish(clientId: string): Promise<void> {
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
    include: {
      template: true,
      siteConfig: true,
      blogPosts: {
        where: { isPublished: true },
        orderBy: { publishedAt: 'desc' },
        include: { category: true, author: true },
      },
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

  // Built files to pass directly to CF Pages (avoid R2 round-trip)
  const builtFiles: { path: string; content: Buffer }[] = [];

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
      builtFiles.push({ path: filename, content: Buffer.isBuffer(content) ? content : Buffer.from(content as string) });
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
          if (els.length === 0) continue;
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

    // For blog.html: rewrite all [data-post-slug] links to /blog/{real-slug}/
    // using the client's published posts matched by position (featured=0, article-1=1 … article-6=6)
    if (filename === 'blog.html' && client.blogPosts.length > 0) {
      const posts = client.blogPosts; // already ordered by publishedAt desc
      // Map template slot → real post slug
      const slotMap: Record<string, string> = { featured: posts[0]?.slug ?? '' };
      for (let i = 0; i < 6; i++) {
        slotMap[`article-${i + 1}`] = posts[i + 1]?.slug ?? posts[i]?.slug ?? posts[0]?.slug ?? '';
      }
      $('[data-post-slug]').each((_: number, el: any) => {
        const slot = $(el).attr('data-post-slug') ?? '';
        const realSlug = slotMap[slot] ?? slotMap['featured'];
        if (realSlug) {
          $(el).attr('href', `../../blog/${realSlug}/`);
          $(el).removeAttr('data-post-slug');
        }
      });
      console.log(`[publish] rewrote blog card links → ${Object.keys(slotMap).length} slots mapped`);
    }

    let builtHtml = $.html();
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: `${prefix}/${filename}`,
      Body: builtHtml,
      ContentType: 'text/html; charset=utf-8',
      CacheControl: 'public, max-age=60',
    }));
    builtFiles.push({ path: filename, content: Buffer.from(builtHtml) });
  }

  // ── Generate individual blog post pages ──────────────────────────
  // Each published post gets a static page at blog/{slug}/index.html using the
  // template's blog-post.html with the post's rich content injected via cheerio.
  const blogPostTpl = templateFiles['blog-post.html'];
  if (blogPostTpl && !blogPostTpl.isBinary && client.blogPosts.length > 0) {
    const blogPostHtml = blogPostTpl.content as string;
    let generated = 0;
    for (const post of client.blogPosts) {
      try {
        // Page lives at {prefix}/blog/{slug}/index.html → two levels deep,
        // so relative root assets need a "../../" prefix.
        const rendered = renderBlogPostPage(blogPostHtml, post, '../../');
        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: `${prefix}/blog/${post.slug}/index.html`,
          Body: rendered,
          ContentType: 'text/html; charset=utf-8',
          CacheControl: 'public, max-age=60',
        }));
        builtFiles.push({ path: `blog/${post.slug}/index.html`, content: Buffer.from(rendered) });
        generated++;
      } catch (err) {
        console.error(`[publish] Failed to generate blog page for "${post.slug}":`, err);
      }
    }
    console.log(`[publish] Generated ${generated} individual blog post pages`);
  }

  await prisma.client.update({
    where: { id: clientId },
    data: { lastPublishedAt: new Date() },
  });

  // Auto-redeploy to Cloudflare Pages using already-built files (no R2 re-read needed)
  if (client.domain && client.domain.includes('.pages.dev') && builtFiles.length > 0) {
    try {
      const { cloudflarePagesService } = await import('../services/cloudflare-pages');
      const existingProjectName = client.domain.replace('https://', '').replace('.pages.dev', '');
      console.log(`[publish] CF Pages redeploy with ${builtFiles.length} built files → project="${existingProjectName}"`);
      await cloudflarePagesService.deployFiles(existingProjectName, builtFiles);
      console.log(`[publish] Auto-redeployed ${client.businessName} to CF Pages: ${existingProjectName}`);
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
