import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { groqChat } from '../lib/groq-ai';
import { checkDailyLimit, incrementUsage, getQuotaSummary } from '../lib/rate-limiter';
import { prisma } from '../lib/prisma';

export const aiBlogRouter = Router();
aiBlogRouter.use(requireAuth);

const LAWYER_BLOG_SYSTEM_PROMPT = `You are an expert Romanian legal content writer specializing in SEO-optimized blog posts for law firms.

WRITING STYLE:
- Professional but accessible (avoid excessive jargon)
- Romanian language unless specified otherwise
- Use real Romanian legal references (Codul Civil, Codul Penal, OUG, etc.)
- Include specific actionable advice readers can use
- Structure with clear H2 sections and bullet lists

OUTPUT FORMAT — Return ONLY valid JSON (no markdown fences, no extra text):
{
  "title": "compelling SEO title (50-70 chars)",
  "slug": "url-slug-in-romanian",
  "excerpt": "2-3 sentence compelling excerpt",
  "content": "FULL HTML article — minimum 800 words using: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>. Include: intro paragraph, 4-6 main sections with H2s, a practical checklist, a conclusion with CTA",
  "category": "one of: Drept Civil | Drept Penal | Drept Comercial | Dreptul Muncii | Drept Imobiliar | Drept Familie | Stiri Legale",
  "tags": ["tag1", "tag2", "tag3"],
  "author": "Dr. [Name] — Avocat",
  "metaTitle": "SEO meta title 50-60 chars",
  "metaDesc": "SEO meta description 150-160 chars",
  "readTime": "X min citire",
  "coverImageQuery": "unsplash search query for cover image (3-4 words, English)"
}`;

// POST /api/ai-blog/generate — generate full blog, 2/day limit
aiBlogRouter.post('/generate', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { topic, tone = 'professional', keywords = '' } = req.body;

  if (!topic?.trim()) throw new AppError(400, 'Topic is required');

  const quota = await checkDailyLimit(clientId, 'blog_generation', 2);
  if (!quota.allowed) {
    throw new AppError(429, `Limita zilnică atinsă (2/zi). Revine mâine.`);
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { businessName: true },
  });

  const prompt = `Write a complete, SEO-optimized Romanian law firm blog post.

Business: ${client?.businessName ?? 'Cabinet de Avocatură'}
Topic: ${topic}
Keywords to include naturally: ${keywords || topic}
Tone: ${tone}

Make it genuinely useful and specific to Romanian law. Include real legal references.
Minimum 800 words in the content HTML field.`;

  const raw = await groqChat(prompt, 'llama-3.3-70b-versatile', 2000, LAWYER_BLOG_SYSTEM_PROMPT);

  let blogData: any;
  try {
    blogData = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new AppError(500, 'AI returned invalid format. Try again.');
    blogData = JSON.parse(match[0]);
  }

  const imageQuery = encodeURIComponent(blogData.coverImageQuery ?? 'law justice legal');
  blogData.coverImage = `https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80`;

  await incrementUsage(clientId, 'blog_generation');

  res.json({
    success: true,
    blog: blogData,
    quota: { used: quota.used + 1, limit: 2, remaining: quota.remaining - 1 },
  });
});

// POST /api/ai-blog/from-news — create blog from news article, 2/day limit
aiBlogRouter.post('/from-news', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { newsTitle, newsSummary, newsUrl = '' } = req.body;

  if (!newsTitle) throw new AppError(400, 'newsTitle is required');

  const quota = await checkDailyLimit(clientId, 'news_blog', 2);
  if (!quota.allowed) {
    throw new AppError(429, 'Limita de 2 blog-uri din știri pe zi a fost atinsă.');
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { businessName: true },
  });

  const prompt = `Transform this news story into a full, SEO-optimized Romanian law firm blog post that helps their potential clients understand the legal implications.

NEWS TITLE: ${newsTitle}
NEWS SUMMARY: ${newsSummary ?? '(not provided)'}
SOURCE URL: ${newsUrl}
LAW FIRM: ${client?.businessName ?? 'Cabinet de Avocatură'}

Instructions:
1. Start from the news story but expand it significantly with legal context
2. Explain what this means for ordinary Romanians
3. Add practical advice related to the topic
4. Connect it to services the law firm provides
5. Minimum 600 words`;

  const raw = await groqChat(prompt, 'llama-3.3-70b-versatile', 2000, LAWYER_BLOG_SYSTEM_PROMPT);

  let blogData: any;
  try {
    blogData = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new AppError(500, 'AI returned invalid format. Try again.');
    blogData = JSON.parse(match[0]);
  }

  blogData.coverImage = `https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80`;
  blogData.sourceUrl = newsUrl;
  blogData.sourceTitle = newsTitle;

  await incrementUsage(clientId, 'news_blog');

  res.json({ success: true, blog: blogData });
});

// POST /api/ai-blog/suggest — AI topic suggestions, 20/day limit
aiBlogRouter.post('/suggest', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;

  const quota = await checkDailyLimit(clientId, 'suggestions', 20);
  if (!quota.allowed) {
    throw new AppError(429, 'Limita de sugestii AI atinsă pentru azi.');
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { businessName: true },
  });

  const prompt = `Give me 6 blog post topic ideas for a Romanian law firm "${client?.businessName ?? 'Cabinet de Avocatură'}".
Return ONLY a JSON array of objects: [{"title": "...", "keywords": "...", "category": "..."}]
Make them timely, SEO-friendly, and relevant to Romanian law in 2026.`;

  const raw = await groqChat(prompt, 'llama-3.1-8b-instant', 800);

  let suggestions: any[];
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    suggestions = JSON.parse(match ? match[0] : raw);
  } catch {
    suggestions = [];
  }

  await incrementUsage(clientId, 'suggestions');
  res.json({ success: true, suggestions });
});

// GET /api/ai-blog/quota — credits dashboard
aiBlogRouter.get('/quota', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const summary = await getQuotaSummary(clientId);
  res.json({ success: true, quotas: summary });
});
