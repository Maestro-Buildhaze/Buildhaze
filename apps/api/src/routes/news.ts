import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const newsRouter: Router = Router();
newsRouter.use(requireAuth);

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
const AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';

// NewsAPI (free tier: 100 requests/day) - newsapi.org
const NEWS_API_KEY = process.env.NEWS_API_KEY;

// Niche to search keywords
const NICHE_QUERIES: Record<string, string[]> = {
  lawyer: ['law', 'legal', 'attorney', 'court', 'legislation'],
  attorney: ['law', 'legal', 'attorney', 'court', 'case'],
  law: ['law', 'legal', 'legislation', 'justice'],
  doctor: ['health', 'medical', 'medicine', 'healthcare'],
  medical: ['health', 'medical', 'medicine', 'healthcare'],
  dentist: ['dental', 'teeth', 'oral health'],
  tech: ['technology', 'AI', 'software', 'startup', 'tech'],
  technology: ['technology', 'AI', 'software', 'innovation'],
  software: ['software', 'programming', 'development', 'tech'],
  realestate: ['real estate', 'property', 'housing', 'market'],
  realtor: ['real estate', 'property', 'housing'],
  construction: ['construction', 'building', 'industry'],
  restaurant: ['food', 'restaurant', 'hospitality'],
  retail: ['retail', 'shopping', 'business'],
  finance: ['finance', 'economy', 'business', 'market'],
  consulting: ['business', 'consulting', 'management'],
  default: ['business', 'news'],
};

// Country to NewsAPI code
const COUNTRY_CODES: Record<string, string> = {
  US: 'us', GB: 'gb', CA: 'ca', AU: 'au', 
  RO: 'ro', DE: 'de', FR: 'fr', IT: 'it', ES: 'es',
  NL: 'nl', BR: 'br', IN: 'in', JP: 'jp',
};

// Language codes
const LANG_CODES: Record<string, string> = {
  en: 'en', ro: 'ro', de: 'de', fr: 'fr', it: 'it', 
  es: 'es', nl: 'nl', pt: 'pt', ja: 'ja',
};

// ── Helper: Call FREE Cloudflare AI ────────────────────────────────────────
async function callFreeAI(prompt: string, maxTokens = 800): Promise<string> {
  if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
    throw new AppError(503, 'AI service not configured');
  }
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${AI_MODEL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) throw new AppError(502, `AI error ${res.status}`);
  const data = await res.json() as any;
  return data.result?.response ?? '';
}

// ── Helper: Fetch from NewsAPI ───────────────────────────────────────────
async function fetchNewsAPI(query: string, country: string, lang: string): Promise<any[]> {
  if (!NEWS_API_KEY) {
    console.log('NEWS_API_KEY not set, skipping NewsAPI');
    return [];
  }
  
  try {
    const countryCode = COUNTRY_CODES[country] || 'us';
    const langCode = LANG_CODES[lang] || 'en';
    
    // NewsAPI everything endpoint (free tier)
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=${langCode}&sortBy=publishedAt&pageSize=10&apiKey=${NEWS_API_KEY}`;
    
    const res = await fetch(url, { 
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'BuildHaze-CMS/1.0' }
    });
    
    if (!res.ok) {
      console.log('NewsAPI error:', res.status);
      return [];
    }
    
    const data = await res.json() as any;
    
    if (data.status !== 'ok') {
      console.log('NewsAPI status error:', data.message);
      return [];
    }
    
    return (data.articles || []).map((a: any) => ({
      title: a.title,
      summary: a.description || a.content?.slice(0, 200) || '',
      url: a.url,
      source: a.source?.name || 'News Source',
      imageUrl: a.urlToImage,
      publishedAt: a.publishedAt,
      author: a.author,
    }));
  } catch (e: any) {
    console.error('NewsAPI fetch error:', e.message);
    return [];
  }
}

// ── Helper: AI Summarize ───────────────────────────────────────────────────
async function summarizeNews(title: string, content: string, lang: string): Promise<string> {
  const langName = lang === 'ro' ? 'Romanian' : lang === 'en' ? 'English' : lang;
  const prompt = `Summarize this news article in ${langName} language.
Title: ${title}
Content: ${content.slice(0, 1500)}

Provide a concise 2-3 sentence summary. Be factual and brief.`;
  
  try {
    const summary = await callFreeAI(prompt, 300);
    return summary.trim() || content.slice(0, 200);
  } catch {
    return content.slice(0, 200);
  }
}

// ── Helper: Translate news title/summary ────────────────────────────────────
async function translateNews(title: string, summary: string, targetLang: string): Promise<{ title: string; summary: string }> {
  if (targetLang === 'en') return { title, summary };
  
  const langName = targetLang === 'ro' ? 'Romanian' : targetLang;
  const prompt = `Translate this news to ${langName}:
Title: ${title}
Summary: ${summary}

Return ONLY this format:
TITLE: [translated title]
SUMMARY: [translated summary]`;

  try {
    const response = await callFreeAI(prompt, 400);
    const titleMatch = response.match(/TITLE:\s*(.+)/i)?.[1] || title;
    const summaryMatch = response.match(/SUMMARY:\s*(.+)/i)?.[1] || summary;
    return { title: titleMatch, summary: summaryMatch };
  } catch {
    return { title, summary };
  }
}

// ── Helper: Get client's locale ────────────────────────────────────────────
async function getClientLocale(clientId: string): Promise<{ country: string; language: string; niche: string }> {
  const clients = await prisma.$queryRaw<any[]>`
    SELECT c.country, c.language, t.niche 
    FROM clients c
    LEFT JOIN templates t ON c."templateId" = t.id
    WHERE c.id = ${clientId}
    LIMIT 1
  `;
  const client = clients?.[0];
  return {
    country: client?.country ?? 'US',
    language: client?.language ?? 'en',
    niche: client?.niche ?? 'default',
  };
}

// ── GET /api/news ──────────────────────────────────────────────────────────
// Fetch fresh news for client's niche and country
newsRouter.get('/', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { force = 'false' } = req.query;
  
  const locale = await getClientLocale(clientId);
  
  // Check cache (1 hour for news)
  if (force !== 'true') {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const cached = await prisma.$queryRaw<any[]>`
      SELECT * FROM news_cache 
      WHERE "clientId" = ${clientId} AND "fetchedAt" > ${oneHourAgo}::timestamptz
      ORDER BY "fetchedAt" DESC LIMIT 12
    `;
    if (cached?.length >= 4) {
      return res.json({ news: cached, fromCache: true });
    }
  }
  
  // Get search keywords for niche
  const keywords = NICHE_QUERIES[locale.niche] || NICHE_QUERIES.default;
  const query = keywords.join(' OR ');
  
  // Fetch from NewsAPI
  const articles = await fetchNewsAPI(query, locale.country, locale.language);
  
  if (articles.length === 0) {
    // No news available - return cached or empty
    const cached = await prisma.$queryRaw<any[]>`
      SELECT * FROM news_cache WHERE "clientId" = ${clientId} 
      ORDER BY "fetchedAt" DESC LIMIT 12
    `;
    if (cached?.length > 0) {
      return res.json({ news: cached, fromCache: true, stale: true });
    }
    return res.json({ news: [], fromCache: false, message: 'No news available. Please configure NEWS_API_KEY for live news.' });
  }
  
  // Process and save news
  const allNews: any[] = [];
  
  for (const article of articles.slice(0, 8)) {
    // Translate if needed
    const translated = await translateNews(article.title, article.summary, locale.language);
    
    // AI summarize
    const summary = await summarizeNews(translated.title, translated.summary, locale.language);
    
    allNews.push({
      title: translated.title,
      summary,
      url: article.url,
      source: article.source,
      imageUrl: article.imageUrl,
      publishedAt: article.publishedAt,
      author: article.author,
    });
  }
  
  // Clear old cache and save new
  await prisma.$executeRaw`DELETE FROM news_cache WHERE "clientId" = ${clientId}`;
  
  for (const item of allNews) {
    await prisma.$executeRaw`
      INSERT INTO news_cache (
        id, "clientId", niche, title, summary, url, source, "imageUrl", "fetchedAt"
      ) VALUES (
        gen_random_uuid()::text, ${clientId}, ${locale.niche}, 
        ${item.title}, ${item.summary}, ${item.url}, ${item.source}, 
        ${item.imageUrl}, now()
      )
    `;
  }
  
  // Return fresh news
  const saved = await prisma.$queryRaw<any[]>`
    SELECT * FROM news_cache WHERE "clientId" = ${clientId} ORDER BY "fetchedAt" DESC LIMIT 12
  `;
  
  res.json({ news: saved, fromCache: false, count: saved.length });
});

// ── GET /api/news/public/:clientSlug ────────────────────────────────────────
// Public endpoint for client website - NO AUTH required
const publicNewsRouter = Router();

publicNewsRouter.get('/:clientSlug', async (req, res) => {
  const { clientSlug } = req.params;
  
  // Find client by slug
  const clients = await prisma.$queryRaw<any[]>`
    SELECT id, country, language FROM clients WHERE slug = ${clientSlug} LIMIT 1
  `;
  
  if (!clients?.length) {
    return res.status(404).json({ error: 'Client not found' });
  }
  
  const clientId = clients[0].id;
  
  // Get latest cached news (even if stale, for reliability)
  const news = await prisma.$queryRaw<any[]>`
    SELECT * FROM news_cache 
    WHERE "clientId" = ${clientId}
    ORDER BY "fetchedAt" DESC LIMIT 10
  `;
  
  res.json({ 
    news, 
    clientInfo: {
      country: clients[0].country,
      language: clients[0].language,
    }
  });
});

// Mount public router without auth
newsRouter.use('/public', publicNewsRouter);

// ── POST /api/news/auto-blog ───────────────────────────────────────────────
// Create a blog post from a news item
newsRouter.post('/auto-blog', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { newsId } = req.body;
  
  if (!newsId) throw new AppError(400, 'newsId is required');
  
  // Get the news item
  const newsItems = await prisma.$queryRaw<any[]>`
    SELECT * FROM news_cache WHERE id = ${newsId} AND "clientId" = ${clientId} LIMIT 1
  `;
  if (!newsItems?.length) throw new AppError(404, 'News item not found');
  const news = newsItems[0];
  
  const locale = await getClientLocale(clientId);
  
  // AI generates blog post based on news
  const prompt = `Write a professional blog post for a ${locale.niche} business website based on this news:

Title: ${news.title}
Summary: ${news.summary}
Source: ${news.source}

Write an engaging blog post that:
1. References this news as industry update
2. Adds professional commentary and insights
3. Connects to the business's expertise
4. Includes practical advice for readers

Return ONLY valid JSON:
{
  "title": "Engaging blog title (max 70 chars)",
  "excerpt": "Compelling meta description (150-160 chars)",
  "content": "Full HTML content with <h2>, <p>, <ul> tags. Minimum 400 words.",
  "metaTitle": "SEO title (60 chars max)",
  "metaDesc": "SEO description (150-160 chars)",
  "tags": ["tag1","tag2","tag3"],
  "readTime": "X min read",
  "category": "Industry News"
}`;

  const aiResponse = await callFreeAI(prompt, 1800);
  
  // Parse JSON response
  let blogData: any;
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    blogData = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
  } catch {
    // Fallback
    blogData = {
      title: `Industry Update: ${news.title}`,
      excerpt: news.summary.slice(0, 160),
      content: `<h2>Latest Industry News</h2><p>${news.summary}</p><p>Stay tuned for more updates from our team.</p>`,
      metaTitle: news.title,
      metaDesc: news.summary.slice(0, 160),
      tags: [locale.niche, 'news', 'industry'],
      readTime: '3 min read',
      category: 'Industry News',
    };
  }
  
  // Save as blog post
  const slug = blogData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  
  await prisma.$executeRaw`
    INSERT INTO blog_posts (
      id, "clientId", title, slug, excerpt, content, 
      "metaTitle", "metaDesc", category, tags, "readTime", 
      "coverImage", published, "publishedAt", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid()::text, ${clientId}, ${blogData.title}, ${slug},
      ${blogData.excerpt}, ${blogData.content}, ${blogData.metaTitle || blogData.title},
      ${blogData.metaDesc || blogData.excerpt}, ${blogData.category || 'News'},
      ${JSON.stringify(blogData.tags || [])}, ${blogData.readTime || '3 min read'},
      ${news.imageUrl}, true, now(), now(), now()
    )
  `;
  
  await prisma.$executeRaw`UPDATE clients SET "lastPublishedAt" = now() WHERE id = ${clientId}`;
  
  res.json({ 
    success: true, 
    message: 'Blog post created from news',
    blog: blogData,
    sourceNews: { id: newsId, title: news.title, source: news.source }
  });
});

// ── POST /api/news/post-to-site ───────────────────────────────────────────
// Post news directly to client's live website as a news item (not blog)
newsRouter.post('/post-to-site', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { newsId } = req.body;
  
  if (!newsId) throw new AppError(400, 'newsId is required');
  
  // Get the news item
  const newsItems = await prisma.$queryRaw<any[]>`
    SELECT * FROM news_cache WHERE id = ${newsId} AND "clientId" = ${clientId} LIMIT 1
  `;
  if (!newsItems?.length) throw new AppError(404, 'News item not found');
  const news = newsItems[0];
  
  const locale = await getClientLocale(clientId);
  
  // Generate longer summary for the site
  const longSummary = await callFreeAI(
    `Expand this news into a detailed 300-word article in ${locale.language === 'ro' ? 'Romanian' : 'English'}:
    
Title: ${news.title}
Summary: ${news.summary}

Write as a professional news article with:
- Introduction paragraph
- Key details and context
- Industry implications
- Conclusion

Use HTML tags: <h3>, <p>, <ul> where appropriate.`,
    800
  );
  
  // Store as site config for news widget
  const newsData = {
    id: newsId,
    title: news.title,
    shortSummary: news.summary,
    fullContent: longSummary,
    imageUrl: news.imageUrl,
    source: news.source,
    sourceUrl: news.url,
    publishedAt: news.fetchedAt,
  };
  
  // Save to site config as featured news
  await prisma.$executeRaw`
    INSERT INTO site_configs (id, "clientId", key, value, "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, ${clientId}, 'featured_news', ${JSON.stringify(newsData)}, now(), now())
    ON CONFLICT ("clientId", key) DO UPDATE SET
      value = EXCLUDED.value,
      "updatedAt" = now()
  `;
  
  res.json({
    success: true,
    message: 'News posted to website',
    news: newsData,
  });
});

// ── DELETE /api/news/:id ──────────────────────────────────────────────────
newsRouter.delete('/:id', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { id } = req.params;
  
  await prisma.$executeRaw`
    DELETE FROM news_cache WHERE id = ${id} AND "clientId" = ${clientId}
  `;
  
  res.json({ success: true, message: 'News item removed' });
});

export { publicNewsRouter };
