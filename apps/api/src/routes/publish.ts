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

// Escape HTML entities
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Turn a section title into a safe DOM id
function titleToId(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 60);
}

// Render a single blog post page by injecting post data into the template's
// blog-post.html using cheerio. Supports both data-field="article-*" (legacy)
// and data-field="post-*" (LAWYER-GEMIR) naming conventions.
function renderBlogPostPage(blogPostHtml: string, post: any, prefix: string): string {
  const $ = cheerio.load(blogPostHtml);
  const title = post.title || '';

  // ── Title + meta ─────────────────────────────────────────────────
  $('[data-field="article-title"],[data-field="post-title"]').text(title);
  if (title) $('title').text(post.metaTitle || title);
  const desc = post.metaDesc || post.excerpt || '';
  if (desc) {
    let meta = $('meta[name="description"]');
    if (!meta.length) { $('head').append('<meta name="description" content="">'); meta = $('meta[name="description"]'); }
    meta.attr('content', desc);
  }

  // ── Category ─────────────────────────────────────────────────────
  if (post.category?.name) {
    const $cat = $('[data-field="article-category"],[data-field="post-category"]');
    $cat.text(post.category.name);
    if (post.category.color) $cat.attr('style', `background:${post.category.color};color:var(--primary)`);
  }

  // ── Cover image ───────────────────────────────────────────────────
  if (post.coverImage) {
    $('[data-field="article-hero-image"],[data-field="post-cover-image"]').attr('src', post.coverImage).attr('alt', title);
  }

  // ── Author ────────────────────────────────────────────────────────
  const authorName = post.author?.name || '';
  if (authorName) {
    $('[data-field="author-name"],[data-field="post-author-name"]').text(authorName);
    $('[data-field="author-bio-name"]').text(authorName);
    $('[data-field="post-author-avatar"]').text(authorName.charAt(0).toUpperCase());
  }
  if (post.author?.avatar) {
    $('[data-field="author-image"],[data-field="author-bio-image"]').attr('src', post.author.avatar);
  }
  if (post.author?.role) $('[data-field="author-bio-role"],[data-field="post-author-role"]').text(post.author.role);
  if (post.author?.bio)  $('[data-field="author-bio-text"]').text(post.author.bio);

  // ── Date + read time ─────────────────────────────────────────────
  const dateStr = formatRoDate(post.publishedAt);
  if (dateStr) $('[data-field="article-date"],[data-field="post-date"]').text(dateStr);
  if (post.readTime) $('[data-field="article-read-time"],[data-field="post-read-time"]').text(`${post.readTime} min de citire`);
  if (post.excerpt)  $('[data-field="post-excerpt"]').text(post.excerpt);

  // ── Build article body ────────────────────────────────────────────
  const blocks: any[]   = post.customFields?.blocks || [];
  const sections: any[] = post.customFields?.sections || [];
  const lead: string    = post.customFields?.leadParagraph || '';
  const bullets: string[] = post.bullets || [];
  let body = '';

  if (lead) body += `<p class="post-lead">${escHtml(lead)}</p>\n`;

  if (blocks.length > 0) {
    // ── New block-based rendering ────────────────────────────────────
    const visibleBlocks = blocks.filter((b: any) => b.visible !== false);

    // Auto TOC from section blocks
    const tocSections = visibleBlocks.filter((b: any) => b.type === 'section' && b.title);
    if (tocSections.length > 1) {
      body += `<div class="post-toc"><h3 class="post-toc__title">Cuprins</h3><ol class="post-toc__list">`;
      tocSections.forEach((b: any, i: number) => {
        const id = titleToId(b.title || '');
        body += `<li><a href="#${id}"><span class="post-toc__num">${String(i + 1).padStart(2, '0')}</span>${escHtml(b.title)}</a></li>`;
      });
      body += `</ol></div>\n`;
    }

    for (const b of visibleBlocks) {
      const id = titleToId(b.title || b.id || '');
      switch (b.type) {
        case 'keypoints': {
          const kpLines = (b.text || '').split('\n').filter(Boolean);
          if (kpLines.length > 0) {
            body += `<div class="post-key-points">`;
            if (b.title) body += `<h3 class="post-key-points__title">${escHtml(b.title)}</h3>`;
            body += `<ul class="post-key-points__list">`;
            kpLines.forEach((l: string) => { body += `<li>${escHtml(l)}</li>`; });
            body += `</ul></div>\n`;
          }
          break;
        }
        case 'section': {
          if (b.title) body += `<h2 id="${id}">${escHtml(b.title)}</h2>\n`;
          (b.text || '').split(/\n\n+/).filter(Boolean).forEach((para: string) => {
            body += `<p>${escHtml(para).replace(/\n/g, '<br />')}</p>\n`;
          });
          break;
        }
        case 'paragraph': {
          (b.text || '').split(/\n\n+/).filter(Boolean).forEach((para: string) => {
            body += `<p>${escHtml(para).replace(/\n/g, '<br />')}</p>\n`;
          });
          break;
        }
        case 'heading': {
          const tag = b.level === 3 ? 'h3' : 'h2';
          if (b.title) body += `<${tag} id="${id}">${escHtml(b.title)}</${tag}>\n`;
          break;
        }
        case 'bullets': {
          const lines = (b.text || '').split('\n').filter(Boolean);
          if (lines.length > 0) {
            if (b.title) body += `<p class="post-list-title"><strong>${escHtml(b.title)}</strong></p>`;
            body += `<ul class="post-bullets">`;
            lines.forEach((l: string) => { body += `<li>${escHtml(l)}</li>`; });
            body += `</ul>\n`;
          }
          break;
        }
        case 'numbered': {
          const lines = (b.text || '').split('\n').filter(Boolean);
          if (lines.length > 0) {
            if (b.title) body += `<p class="post-list-title"><strong>${escHtml(b.title)}</strong></p>`;
            body += `<ol class="post-numbered">`;
            lines.forEach((l: string) => { body += `<li>${escHtml(l)}</li>`; });
            body += `</ol>\n`;
          }
          break;
        }
        case 'blockquote': {
          body += `<blockquote class="post-blockquote">`;
          body += `<p>${escHtml(b.text || '')}</p>`;
          if (b.attribution) body += `<footer class="post-blockquote__footer">${escHtml(b.attribution)}</footer>`;
          body += `</blockquote>\n`;
          break;
        }
        case 'infobox': {
          body += `<div class="post-info-box"><p>${escHtml(b.text || '')}</p></div>\n`;
          break;
        }
        case 'image': {
          if (b.src) {
            body += `<figure class="post-figure">`;
            body += `<img src="${b.src}" alt="${escHtml(b.caption || b.title || '')}" loading="lazy" />`;
            if (b.caption) body += `<figcaption>${escHtml(b.caption)}</figcaption>`;
            body += `</figure>\n`;
          }
          break;
        }
        case 'card': {
          body += `<div class="post-card">`;
          if (b.title) body += `<h4 class="post-card__title">${escHtml(b.title)}</h4>`;
          if (b.text) body += `<p class="post-card__text">${escHtml(b.text)}</p>`;
          body += `</div>\n`;
          break;
        }
      }
    }

    const tocHtml = tocSections.map((b: any, i: number) => {
      const id = titleToId(b.title || '');
      return `<li><a href="#${id}"><span class="toc-number">${i + 1}</span>${escHtml(b.title)}</a></li>`;
    }).join('');
    if (tocHtml) $('[data-section="toc"]').html(tocHtml);

  } else if (sections.length > 0) {
    // ── Legacy sections rendering ────────────────────────────────────
    if (bullets.length > 0) {
      body += `<div class="post-key-points"><h3 class="post-key-points__title">Puncte Cheie ale Articolului</h3><ul class="post-key-points__list">`;
      bullets.forEach((b: string) => { body += `<li>${escHtml(b)}</li>`; });
      body += `</ul></div>\n`;
    }
    body += `<div class="post-toc"><h3 class="post-toc__title">Cuprins</h3><ol class="post-toc__list">`;
    sections.forEach((s: any, i: number) => {
      const id = s.id || titleToId(s.title || '');
      body += `<li><a href="#${id}"><span class="post-toc__num">${String(i + 1).padStart(2, '0')}</span>${escHtml(s.title || '')}</a></li>`;
    });
    body += `</ol></div>\n`;
    for (const s of sections) {
      const id = s.id || titleToId(s.title || '');
      if (s.type === 'blockquote') {
        body += `<blockquote id="${id}">${escHtml(s.content || '')}</blockquote>\n`;
      } else if (s.type === 'infobox') {
        body += `<div class="post-info-box" id="${id}"><p>${escHtml(s.content || '')}</p></div>\n`;
      } else {
        body += `<h2 id="${id}">${escHtml(s.title || '')}</h2>\n`;
        (s.content || '').split(/\n\n+/).filter(Boolean).forEach((para: string) => {
          body += `<p>${escHtml(para).replace(/\n/g, '<br />')}</p>\n`;
        });
      }
    }
    const tocHtml = sections.map((s: any, i: number) => {
      const id = s.id || titleToId(s.title || '');
      return `<li><a href="#${id}"><span class="toc-number">${i + 1}</span>${escHtml(s.title || '')}</a></li>`;
    }).join('');
    $('[data-section="toc"]').html(tocHtml);
  } else {
    const rich = post.content && post.content.replace(/<[^>]*>/g, '').trim().length > 40
      ? post.content
      : (post.customFields?.content || post.content || '');
    body += rich;
  }

  if (body) {
    const $art = $('[data-section="article-content"],.article-body,[data-field="post-content"],article.post-content,article').first();
    if ($art.length) $art.html(body);
  }

  // ── Tags (only rendered when non-empty) ───────────────────────────
  if (Array.isArray(post.tags) && post.tags.length > 0) {
    const tagsHtml = post.tags.map((t: string) => `<a href="#" class="article-tag">${t}</a>`).join('');
    $('.article-tags').html(tagsHtml);
  }

  rewriteRelativeUrls($, prefix);
  return $.html();
}

// Generate HTML for a news card shown in the homepage #news-grid
function renderNewsCard(item: any, index: number): string {
  const id = `news-${index}`;
  const title = (item.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const displaySummary = (item.customSummary || item.summary || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const source = item.source || '';
  const imgSrc = item.imageUrl || '';
  const url = item.url || '#';
  const dateStr = item.postedAt ? formatRoDate(item.postedAt) : '';
  return [
    `<div class="news-card reveal" data-news-id="${id}" data-news-title="${title.replace(/"/g, '&quot;')}" data-news-summary="${displaySummary.replace(/"/g, '&quot;')}" data-news-url="${url}" data-news-img="${imgSrc}" data-news-source="${source}">`,
    imgSrc ? `  <div class="news-card__img-wrap"><img src="${imgSrc}" alt="" class="news-card__img" loading="lazy" /></div>` : '',
    `  <div class="news-card__body">`,
    `    <div class="news-card__meta">`,
    source ? `      <span class="news-card__source">${source}</span>` : '',
    dateStr ? `      <span class="news-card__date">${dateStr}</span>` : '',
    `    </div>`,
    `    <h3 class="news-card__title">${title}</h3>`,
    displaySummary ? `    <p class="news-card__excerpt">${displaySummary.slice(0, 120)}${displaySummary.length > 120 ? '…' : ''}</p>` : '',
    `    <button class="news-card__cta" onclick="openNewsModal('${id}')">`,
    `      Vezi știrea <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`,
    `    </button>`,
    `  </div>`,
    `</div>`,
  ].filter(Boolean).join('\n');
}

// Generate HTML for a single blog card injected into the article grid / index teaser
function renderBlogCard(post: any, index: number): string {
  const slug = post.slug || '';
  const title = (post.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const excerpt = (post.excerpt || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const catName = post.category?.name || '';
  const authorName = post.author?.name || '';
  const dateStr = formatRoDate(post.publishedAt);
  const readTime = post.readTime ? `${post.readTime} min citire` : '';
  const imgSrc = post.coverImage || 'https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=400&h=220&fit=crop';
  return [
    `<div class="blog-card shimmer" data-article-id="${index}">`,
    `  <div class="blog-card__img-wrap">`,
    `    <img src="${imgSrc}" alt="${title}" class="blog-card__img" loading="lazy" />`,
    catName ? `    <span class="blog-card__cat">${catName}</span>` : '',
    `  </div>`,
    `  <div class="blog-card__body">`,
    `    <div class="blog-card__meta">`,
    `      <span>${dateStr}</span>`,
    readTime ? `      <span>·</span><span>${readTime}</span>` : '',
    `    </div>`,
    `    <h3 class="blog-card__title"><a href="blog/${slug}/">${title}</a></h3>`,
    `    <p class="blog-card__excerpt">${excerpt}</p>`,
    `    <div class="blog-card__footer">`,
    `      <a href="blog/${slug}/" class="blog-card__read">Citește articolul <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>`,
    authorName ? `      <span style="font-size:0.8rem;color:var(--text-4)">${authorName}</span>` : '',
    `    </div>`,
    `  </div>`,
    `</div>`,
  ].filter(Boolean).join('\n');
}

function buildBookingPage(client: any, services: any[]): string {
  const apiBase = process.env.API_BASE_URL ?? 'https://api.buildhaze.com';
  const slug = client.slug;
  const biz = client.businessName ?? 'Cabinet de Avocatură';

  const serviceOptions = services.length
    ? services.map(s => `<option value="${s.id}" data-duration="${s.duration}">${escHtml(s.name)}${s.price ? ` — ${s.price} ${s.currency}` : ''}</option>`).join('')
    : '<option value="">— Serviciu general —</option>';

  return `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Programare Online — ${escHtml(biz)}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#1e293b;min-height:100vh}
.bk-header{background:#fff;border-bottom:1px solid #e2e8f0;padding:20px 24px;display:flex;align-items:center;gap:16px}
.bk-header h1{font-size:1.25rem;font-weight:700;color:#1e293b}
.bk-header p{font-size:.875rem;color:#64748b}
.bk-container{max-width:640px;margin:40px auto;padding:0 16px}
.bk-card{background:#fff;border-radius:16px;box-shadow:0 1px 8px rgba(0,0,0,.08);padding:32px}
.bk-step{display:none}.bk-step.active{display:block}
.bk-title{font-size:1.125rem;font-weight:700;margin-bottom:20px;color:#1e293b}
.bk-field{margin-bottom:16px}
.bk-field label{display:block;font-size:.875rem;font-weight:600;color:#374151;margin-bottom:6px}
.bk-field input,.bk-field select,.bk-field textarea{width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:10px;font-size:.9rem;outline:none;transition:border-color .15s;font-family:inherit}
.bk-field input:focus,.bk-field select:focus,.bk-field textarea:focus{border-color:#059669}
.bk-slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;margin-top:8px}
.bk-slot{padding:8px;border:2px solid #e2e8f0;border-radius:8px;text-align:center;cursor:pointer;font-size:.875rem;transition:all .15s}
.bk-slot:hover{border-color:#059669;color:#059669}
.bk-slot.selected{background:#059669;border-color:#059669;color:#fff;font-weight:600}
.bk-slot.unavailable{opacity:.4;cursor:not-allowed;pointer-events:none}
.bk-btn{width:100%;padding:12px;background:#059669;color:#fff;border:none;border-radius:10px;font-size:1rem;font-weight:600;cursor:pointer;transition:background .15s;margin-top:20px}
.bk-btn:hover{background:#047857}
.bk-btn:disabled{opacity:.6;cursor:not-allowed}
.bk-btn-sec{background:#f1f5f9;color:#1e293b;margin-top:10px}
.bk-btn-sec:hover{background:#e2e8f0}
.bk-msg{padding:12px 16px;border-radius:8px;font-size:.9rem;margin-top:12px;display:none}
.bk-msg.error{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
.bk-msg.success{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0}
.bk-success-icon{text-align:center;font-size:3rem;margin-bottom:12px}
.bk-cal-input{margin-top:12px}
</style>
</head>
<body>
<div class="bk-header">
  <div>
    <h1>📅 Programare Online</h1>
    <p>${escHtml(biz)}</p>
  </div>
</div>
<div class="bk-container">
  <div class="bk-card">

    <!-- Step 1: Service + Date -->
    <div class="bk-step active" id="step1">
      <div class="bk-title">Alegeți serviciul și data</div>
      <div class="bk-field">
        <label>Serviciu</label>
        <select id="bk-service">
          ${serviceOptions}
        </select>
      </div>
      <div class="bk-field">
        <label>Data dorită</label>
        <input type="date" id="bk-date" min="" />
      </div>
      <div class="bk-field">
        <label>Ore disponibile</label>
        <div class="bk-slots" id="bk-slots"><p style="color:#94a3b8;font-size:.875rem">Selectați o dată pentru a vedea orele disponibile.</p></div>
      </div>
      <div class="bk-msg" id="msg1"></div>
      <button class="bk-btn" id="next1">Continuă →</button>
    </div>

    <!-- Step 2: Contact Details -->
    <div class="bk-step" id="step2">
      <div class="bk-title">Datele dumneavoastră</div>
      <div class="bk-field"><label>Nume complet *</label><input type="text" id="bk-name" placeholder="Ion Popescu" /></div>
      <div class="bk-field"><label>Email *</label><input type="email" id="bk-email" placeholder="email@exemplu.ro" /></div>
      <div class="bk-field"><label>Telefon</label><input type="tel" id="bk-phone" placeholder="+40 7xx xxx xxx" /></div>
      <div class="bk-field"><label>Mesaj / mențiuni</label><textarea id="bk-notes" rows="3" placeholder="Orice detalii suplimentare..."></textarea></div>
      <div class="bk-msg" id="msg2"></div>
      <button class="bk-btn" id="bk-submit">Confirmă programarea</button>
      <button class="bk-btn bk-btn-sec" id="back1">← Înapoi</button>
    </div>

    <!-- Step 3: Confirmed -->
    <div class="bk-step" id="step3">
      <div class="bk-success-icon">✅</div>
      <div class="bk-title" style="text-align:center">Programare confirmată!</div>
      <p style="text-align:center;color:#64748b;margin-bottom:16px">Veți primi o confirmare pe email. Vă așteptăm!</p>
      <div id="bk-summary" style="background:#f8fafc;border-radius:10px;padding:16px;font-size:.9rem;line-height:1.7;color:#374151"></div>
      <button class="bk-btn" onclick="location.href='/'">← Înapoi pe site</button>
    </div>

  </div>
</div>

<script>
(function(){
  var API = '${apiBase}';
  var SLUG = '${slug}';
  var selectedTime = null;

  var dateEl = document.getElementById('bk-date');
  var today = new Date().toISOString().split('T')[0];
  dateEl.min = today;
  dateEl.value = today;

  function showStep(n){
    document.querySelectorAll('.bk-step').forEach(function(el){ el.classList.remove('active'); });
    document.getElementById('step'+n).classList.add('active');
  }

  function showMsg(id,text,type){
    var el=document.getElementById(id);
    el.textContent=text; el.className='bk-msg '+type; el.style.display='block';
  }
  function hideMsg(id){ document.getElementById(id).style.display='none'; }

  function loadSlots(){
    var date=dateEl.value;
    var svcId=document.getElementById('bk-service').value;
    if(!date) return;
    selectedTime=null;
    document.getElementById('bk-slots').innerHTML='<p style="color:#94a3b8;font-size:.875rem">Se încarcă...</p>';
    fetch(API+'/api/bookings/public/'+SLUG+'/slots?date='+date+'&serviceId='+svcId)
      .then(function(r){return r.json();})
      .then(function(d){
        var slots=d.slots||[];
        if(!slots.length){
          document.getElementById('bk-slots').innerHTML='<p style="color:#94a3b8;font-size:.875rem">Nu există ore disponibile pentru această zi.</p>';
          return;
        }
        document.getElementById('bk-slots').innerHTML=slots.map(function(s){
          return '<div class="bk-slot" data-time="'+s+'" onclick="pickSlot(this)">'+s+'</div>';
        }).join('');
      })
      .catch(function(){
        document.getElementById('bk-slots').innerHTML='<p style="color:#dc2626;font-size:.875rem">Eroare la încărcare. Reîncercați.</p>';
      });
  }

  window.pickSlot=function(el){
    document.querySelectorAll('.bk-slot').forEach(function(s){s.classList.remove('selected');});
    el.classList.add('selected');
    selectedTime=el.getAttribute('data-time');
  };

  dateEl.addEventListener('change',loadSlots);
  document.getElementById('bk-service').addEventListener('change',loadSlots);
  loadSlots();

  document.getElementById('next1').addEventListener('click',function(){
    if(!selectedTime){showMsg('msg1','Vă rugăm selectați o oră disponibilă.','error');return;}
    hideMsg('msg1'); showStep(2);
  });
  document.getElementById('back1').addEventListener('click',function(){ showStep(1); });

  document.getElementById('bk-submit').addEventListener('click',function(){
    var name=document.getElementById('bk-name').value.trim();
    var email=document.getElementById('bk-email').value.trim();
    if(!name||!email){showMsg('msg2','Vă rugăm completați numele și email-ul.','error');return;}
    hideMsg('msg2');
    var btn=document.getElementById('bk-submit');
    btn.disabled=true; btn.textContent='Se trimite...';
    fetch(API+'/api/bookings/public/'+SLUG,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        customerName:name,
        customerEmail:email,
        customerPhone:document.getElementById('bk-phone').value.trim()||null,
        date:dateEl.value,
        time:selectedTime,
        serviceId:document.getElementById('bk-service').value||null,
        notes:document.getElementById('bk-notes').value.trim()||null,
      }),
    })
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.success){
        document.getElementById('bk-summary').innerHTML=
          '<strong>Data:</strong> '+dateEl.value+'<br>'+
          '<strong>Ora:</strong> '+selectedTime+'<br>'+
          '<strong>Nume:</strong> '+name+'<br>'+
          '<strong>Email:</strong> '+email;
        showStep(3);
      } else {
        showMsg('msg2',d.error||'Eroare. Vă rugăm reîncercați.','error');
        btn.disabled=false; btn.textContent='Confirmă programarea';
      }
    })
    .catch(function(){
      showMsg('msg2','Eroare de rețea. Vă rugăm reîncercați.','error');
      btn.disabled=false; btn.textContent='Confirmă programarea';
    });
  });
})();
</script>
</body>
</html>`;
}

export async function buildAndPublish(clientId: string): Promise<void> {
  const [client, siteNewsItems] = await Promise.all([
    prisma.client.findUniqueOrThrow({
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
        chatbotConfig: true,
        bookingServices: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    }),
    prisma.$queryRaw<any[]>`
      SELECT * FROM site_news_items
      WHERE "clientId" = ${clientId} AND "isVisible" = true
      ORDER BY "postedAt" DESC
      LIMIT 9
    `,
  ]);
  // Attach to client object for downstream use
  (client as any).siteNewsItems = siteNewsItems;

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

    // For blog.html: inject published posts into featured section + article grid, rewrite links
    if (filename === 'blog.html') {
      const posts = client.blogPosts; // already ordered by publishedAt desc

      if (posts.length > 0) {
        // ── Rewrite data-post-slug / fallback structural links ────────
        const slugEls = $('[data-post-slug]');
        if (slugEls.length > 0) {
          const slotMap: Record<string, string> = { featured: posts[0]?.slug ?? '' };
          for (let i = 0; i < 6; i++) {
            slotMap[`article-${i + 1}`] = posts[i + 1]?.slug ?? posts[i]?.slug ?? posts[0]?.slug ?? '';
          }
          slugEls.each((_: number, el: any) => {
            const slot = $(el).attr('data-post-slug') ?? '';
            const realSlug = slotMap[slot] ?? slotMap['featured'];
            if (realSlug) {
              $(el).attr('href', `blog/${realSlug}/`);
              $(el).removeAttr('data-post-slug');
            }
          });
          console.log(`[publish] rewrote blog links via data-post-slug (${slugEls.length} elements)`);
        } else {
          const featuredSlug = posts[0]?.slug;
          if (featuredSlug) {
            $('.blog-featured a[href="blog-post.html"]').each((_: number, el: any) => {
              $(el).attr('href', `blog/${featuredSlug}/`);
            });
          }
          for (let i = 0; i < 6; i++) {
            const post = posts[i + 1] ?? posts[i] ?? posts[0];
            if (post?.slug) {
              $(`[data-article-id="${i + 1}"] a[href="blog-post.html"]`).each((_: number, el: any) => {
                $(el).attr('href', `blog/${post.slug}/`);
              });
            }
          }
          console.log(`[publish] rewrote blog links via structural selectors (${posts.length} posts)`);
        }

        // ── Inject featured post data into the featured hero section ──
        const fp = posts[0];
        if (fp.title) $('[data-field="featured-title"]').text(fp.title);
        if (fp.excerpt) $('[data-field="featured-excerpt"]').text(fp.excerpt);
        if (fp.coverImage) $('[data-field="featured-img"]').attr('src', fp.coverImage).attr('alt', fp.title || '');
        if (fp.publishedAt) $('[data-field="featured-date"]').text(formatRoDate(fp.publishedAt));
        if (fp.readTime) $('[data-field="featured-read"]').text(`${fp.readTime} min citire`);
        if (fp.category?.name) {
          $('[data-field="featured-cat"]').text(`${fp.category.name.toUpperCase()} · ARTICOL RECOMANDAT`);
          $('[data-field="featured-cat-tag"]').text(fp.category.name.toUpperCase());
        }
        if (fp.author?.name) $('[data-field="featured-author"]').text(fp.author.name);
        // Fix featured CTA button href (any remaining blog-post.html links)
        $('[data-section="blog-featured"] a[href="blog-post.html"], .blog-featured a[href="blog-post.html"], .blog-featured a[href]').each((_: number, el: any) => {
          const href = $(el).attr('href') || '';
          if (href === 'blog-post.html' || href.includes('blog-post')) $(el).attr('href', `blog/${fp.slug}/`);
        });

        // ── Populate #blog-article-grid with rendered cards ───────────
        const gridEl = $('#blog-article-grid');
        if (gridEl.length) {
          gridEl.html(posts.map((p: any, i: number) => renderBlogCard(p, i + 1)).join('\n'));
          console.log(`[publish] injected ${posts.length} blog cards into #blog-article-grid`);
        }

        // ── Build pagination ──────────────────────────────────────────
        const paginationEl = $('#blog-pagination');
        if (paginationEl.length) {
          const totalPages = Math.ceil(posts.length / 8);
          if (totalPages > 1) {
            let pageHtml = `<button class="page-btn" disabled>\u2190</button>`;
            for (let p = 1; p <= Math.min(totalPages, 5); p++) {
              pageHtml += `<button class="page-btn${p === 1 ? ' active' : ''}">${p}</button>`;
            }
            pageHtml += `<button class="page-btn">\u2192</button>`;
            paginationEl.attr('style', 'margin-top:48px;display:flex').html(pageHtml);
          } else {
            paginationEl.attr('style', 'margin-top:48px;display:none');
          }
        }
      }
    }

    // For index.html: inject news items into #news-grid + add modal
    if (filename === 'index.html') {
      const siteNews: any[] = (client as any).siteNewsItems ?? [];
      const newsGrid = $('#news-grid');
      if (newsGrid.length && siteNews.length > 0) {
        newsGrid.html(siteNews.map((n: any, i: number) => renderNewsCard(n, i)).join('\n'));
        // Remove the "no news" fallback placeholder if present
        newsGrid.siblings('[data-news-empty]').remove();
        console.log(`[publish] injected ${siteNews.length} news cards into #news-grid`);
      }
      // Inject a single news modal overlay (opened via JS) with self-contained
      // inline script so the button always works regardless of main.js caching.
      // Always force-replace so stale template states never block injection.
      if (siteNews.length > 0) {
        $('#news-modal').remove();
        $('script[data-news-modal-script]').remove();
        $('style[data-news-styles]').remove();
        // Inject all news card + modal CSS inline — works regardless of R2 style.css version
        $('head').append(`<style data-news-styles>
.news-card__cta{display:inline-flex;align-items:center;gap:6px;font-size:.8125rem;font-weight:700;color:var(--primary,#f97316);background:none;border:none;outline:none;-webkit-appearance:none;appearance:none;cursor:pointer;padding:0;transition:gap .15s ease,color .15s ease}
.news-card__cta:hover{gap:10px;color:var(--primary-dark,#ea6500)}
.news-card__cta:focus-visible{outline:2px solid var(--primary,#f97316);outline-offset:4px;border-radius:4px}
.news-modal-overlay{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:24px}
.news-modal-panel{position:relative;background:#fff;border-radius:16px;max-width:560px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 32px 80px rgba(0,0,0,.25);animation:nmIn .28s ease both}
@keyframes nmIn{from{opacity:0;transform:scale(.94) translateY(16px)}to{opacity:1;transform:none}}
.news-modal-close{position:absolute;top:16px;right:16px;z-index:2;width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,.08);border:none;cursor:pointer;font-size:1.25rem;line-height:1;display:flex;align-items:center;justify-content:center;color:#666;transition:background .15s ease}
.news-modal-close:hover{background:rgba(0,0,0,.14)}
.news-modal-img-wrap img{width:100%;max-height:240px;object-fit:cover;border-radius:16px 16px 0 0;display:block}
.news-modal-img-wrap img[src=""]{display:none}
.news-modal-body{padding:28px 32px 32px}
.news-modal-source{display:inline-flex;padding:3px 10px;border-radius:999px;background:rgba(249,115,22,.1);color:var(--primary,#f97316);font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px}
.news-modal-title{font-size:1.35rem;font-weight:800;line-height:1.35;color:#111;margin-bottom:14px}
.news-modal-summary{font-size:.9375rem;color:#555;line-height:1.7;margin-bottom:24px}
@media(max-width:640px){.news-modal-body{padding:20px 20px 24px}.news-modal-title{font-size:1.1rem}}
</style>`);
        $('body').append(`
<div id="news-modal" class="news-modal-overlay" style="display:none" onclick="if(event.target===this)window.closeNewsModal()">
  <div class="news-modal-panel">
    <button class="news-modal-close" onclick="window.closeNewsModal()" aria-label="Inchide">&times;</button>
    <div class="news-modal-img-wrap"><img id="news-modal-img" src="" alt="" /></div>
    <div class="news-modal-body">
      <span id="news-modal-source" class="news-modal-source"></span>
      <h2 id="news-modal-title" class="news-modal-title"></h2>
      <p id="news-modal-summary" class="news-modal-summary"></p>
      <a id="news-modal-link" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Citește știrea completă &rarr;</a>
    </div>
  </div>
</div>
<script data-news-modal-script>
(function(){
  function om(id){
    var c=document.querySelector('[data-news-id="'+id+'"]'),m=document.getElementById('news-modal');
    if(!c||!m)return;
    var ti=document.getElementById('news-modal-title');
    var su=document.getElementById('news-modal-summary');
    var li=document.getElementById('news-modal-link');
    var im=document.getElementById('news-modal-img');
    var so=document.getElementById('news-modal-source');
    if(ti)ti.textContent=c.getAttribute('data-news-title')||'';
    if(su)su.textContent=c.getAttribute('data-news-summary')||'';
    if(li)li.href=c.getAttribute('data-news-url')||'#';
    if(im){im.src=c.getAttribute('data-news-img')||'';im.style.display=im.src?'':'none';}
    if(so){so.textContent=c.getAttribute('data-news-source')||'';so.style.display=so.textContent?'':'none';}
    m.style.display='flex';document.body.style.overflow='hidden';
  }
  function cm(){
    var m=document.getElementById('news-modal');
    if(m)m.style.display='none';
    document.body.style.overflow='';
  }
  window.openNewsModal=om;
  window.closeNewsModal=cm;
  document.addEventListener('keydown',function(e){if(e.key==='Escape')cm();});
  document.addEventListener('click',function(e){
    var btn=e.target&&e.target.closest&&e.target.closest('.news-card__cta');
    if(!btn)return;
    var card=btn.closest('[data-news-id]');
    if(card)om(card.getAttribute('data-news-id'));
  });
})();
</script>`);
      }
    }

    // For index.html: replace blog teaser card with latest published post
    if (filename === 'index.html' && client.blogPosts.length > 0) {
      const latestPost = client.blogPosts[0];
      const teaserCard = $('[data-article-id="1"]').first();
      if (teaserCard.length) {
        teaserCard.replaceWith(renderBlogCard(latestPost, 1));
      }
      // Rewrite any remaining data-post-slug links
      $('[data-post-slug]').each((_: number, el: any) => {
        $(el).attr('href', `blog/${latestPost.slug}/`).removeAttr('data-post-slug');
      });
      console.log(`[publish] injected blog teaser on index.html → "${latestPost.slug}"`);
    }

    // ── Inject chatbot widget script ───────────────────────────────
    const chatCfg = (client as any).chatbotConfig;
    $('script[data-chatbot-widget]').remove();
    if (chatCfg?.enabled) {
      const apiBase = process.env.API_BASE_URL ?? 'https://buildhaze.onrender.com';
      const configJson = JSON.stringify({
        enabled: true,
        botName: chatCfg.botName,
        welcomeMessage: chatCfg.welcomeMessage,
        tone: chatCfg.tone,
        language: chatCfg.language,
        primaryColor: chatCfg.primaryColor,
        position: chatCfg.position,
        bookingEnabled: chatCfg.bookingEnabled,
      });
      $('body').append(`<script data-chatbot-widget src="${apiBase}/static/chatbot.js?slug=${client.slug}&t=${Date.now()}" data-api="${apiBase}" data-slug="${client.slug}" data-config='${configJson}'></script>`);
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

  // ── Generate booking.html ────────────────────────────────────────
  const services: any[] = (client as any).bookingServices ?? [];
  const bookingHtml = buildBookingPage(client, services);
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: `${prefix}/booking.html`,
    Body: bookingHtml,
    ContentType: 'text/html; charset=utf-8',
    CacheControl: 'public, max-age=60',
  }));
  builtFiles.push({ path: 'booking.html', content: Buffer.from(bookingHtml) });
  console.log(`[publish] generated booking.html`);

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
