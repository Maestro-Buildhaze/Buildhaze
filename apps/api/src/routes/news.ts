import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { groqChat } from '../lib/groq-ai';

export const newsRouter: Router = Router();
newsRouter.use(requireAuth);

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CF_AI_API_TOKEN;
const AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';

// Multiple FREE News APIs for redundancy
const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY; // 200 credits/day FREE
const NEWS_API_KEY = process.env.NEWS_API_KEY; // 100 requests/day FREE
const THENEWSAPI_KEY = process.env.THENEWSAPI_KEY; // 100 requests/day FREE

// Supported countries with their codes
const SUPPORTED_COUNTRIES = {
  US: { name: 'United States', code: 'us', lang: 'en', newsdataCode: 'us' },
  GB: { name: 'United Kingdom', code: 'gb', lang: 'en', newsdataCode: 'gb' },
  RO: { name: 'Romania', code: 'ro', lang: 'ro', newsdataCode: 'ro' },
  DE: { name: 'Germany', code: 'de', lang: 'de', newsdataCode: 'de' },
  AU: { name: 'Australia', code: 'au', lang: 'en', newsdataCode: 'au' },
  CA: { name: 'Canada', code: 'ca', lang: 'en', newsdataCode: 'ca' },
  FR: { name: 'France', code: 'fr', lang: 'fr', newsdataCode: 'fr' },
  IT: { name: 'Italy', code: 'it', lang: 'it', newsdataCode: 'it' },
  ES: { name: 'Spain', code: 'es', lang: 'es', newsdataCode: 'es' },
  NL: { name: 'Netherlands', code: 'nl', lang: 'nl', newsdataCode: 'nl' },
};

// Niche to search keywords mapping
// Easy to add more niches - just add entry here!
const NICHE_KEYWORDS: Record<string, string[]> = {
  // Legal - shortened for 100 char limit
  lawyer: ['law', 'legal', 'attorney', 'court', 'justice', 'crime', 'injury', 'fraud'],
  attorney: [
    'law', 'legal', 'attorney', 'court', 'case', 'lawsuit',
    'accident', 'injury', 'personal injury', 'medical malpractice',
    'crime', 'criminal defense', 'felony', 'misdemeanor',
    'business law', 'corporate', 'contract dispute',
    'immigration', 'visa', 'deportation', 'asylum',
    'bankruptcy', 'debt', 'foreclosure',
    'employment', 'discrimination', 'harassment', 'wrongful termination'
  ],
  law: [
    'law', 'legal', 'legislation', 'justice', 'court',
    'supreme court', 'appeal', 'ruling', 'verdict', 'settlement'
  ],
  
  // Medical
  doctor: ['health', 'medical', 'medicine', 'healthcare', 'doctor', 'hospital', 'clinic'],
  medical: ['health', 'medical', 'medicine', 'healthcare', 'hospital', 'surgery', 'treatment'],
  dentist: ['dental', 'teeth', 'oral health', 'dentistry', 'orthodontics', 'implant'],
  
  // Tech
  tech: ['technology', 'AI', 'software', 'startup', 'tech', 'innovation', 'app', 'digital'],
  technology: ['technology', 'AI', 'software', 'innovation', 'digital', 'automation'],
  software: ['software', 'programming', 'development', 'tech', 'coding', 'SaaS', 'cloud'],
  
  // Real Estate
  realestate: ['real estate', 'property', 'housing', 'market', 'mortgage', 'rent', 'sale'],
  realtor: ['real estate', 'property', 'housing', 'homes', 'construction', 'broker'],
  construction: ['construction', 'building', 'industry', 'architecture', 'renovation', 'contractor'],
  
  // Business
  restaurant: ['food', 'restaurant', 'hospitality', 'cuisine', 'dining', 'catering'],
  retail: ['retail', 'shopping', 'business', 'ecommerce', 'sales', 'consumer'],
  finance: ['finance', 'economy', 'business', 'market', 'investment', 'stock', 'banking', 'crypto'],
  consulting: ['business', 'consulting', 'management', 'strategy', 'advisory', 'expert'],
  marketing: ['marketing', 'advertising', 'digital marketing', 'SEO', 'social media', 'branding'],
  
  // Add more niches easily here!
  // Example: accountant: ['accounting', 'tax', 'audit', 'bookkeeping', 'CPA'],
  // Example: fitness: ['fitness', 'gym', 'workout', 'health', 'nutrition'],
  
  default: ['business', 'news', 'industry'],
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

// ── Helper: Fetch from NewsData.io (200/day FREE) ───────────────────────────
async function fetchNewsDataIO(query: string, country: string, lang: string): Promise<any[]> {
  if (!NEWSDATA_API_KEY) return [];
  
  try {
    const countryInfo = SUPPORTED_COUNTRIES[country as keyof typeof SUPPORTED_COUNTRIES];
    const countryCode = countryInfo?.newsdataCode || country.toLowerCase();
    
    const url = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&q=${encodeURIComponent(query)}&country=${countryCode}&language=${lang}&size=10`;
    
    const res = await fetch(url, { 
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'BuildHaze-CMS/1.0' }
    });
    
    if (!res.ok) {
      console.log('NewsData.io error:', res.status);
      return [];
    }
    
    const data = await res.json() as any;
    
    if (data.status !== 'success') {
      console.log('NewsData.io status:', data.status);
      return [];
    }
    
    return (data.results || []).map((a: any) => ({
      title: a.title,
      summary: a.description || a.content?.slice(0, 400) || '',
      url: a.link,
      source: a.source_id || 'News Source',
      imageUrl: a.image_url,
      publishedAt: a.pubDate,
      author: a.creator?.[0],
    }));
  } catch (e: any) {
    console.error('NewsData.io fetch error:', e.message);
    return [];
  }
}

// ── Helper: Fetch from NewsAPI (100/day FREE) ──────────────────────────────
async function fetchNewsAPI(query: string, country: string, lang: string): Promise<any[]> {
  if (!NEWS_API_KEY) return [];
  
  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=${lang}&sortBy=publishedAt&pageSize=10&apiKey=${NEWS_API_KEY}`;
    
    const res = await fetch(url, { 
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'BuildHaze-CMS/1.0' }
    });
    
    if (!res.ok) return [];
    
    const data = await res.json() as any;
    if (data.status !== 'ok') return [];
    
    return (data.articles || []).map((a: any) => ({
      title: a.title,
      summary: a.description || a.content?.slice(0, 400) || '',
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

// ── Helper: Fetch from TheNewsAPI (100/day FREE) ───────────────────────────
async function fetchTheNewsAPI(query: string, country: string, lang: string): Promise<any[]> {
  if (!THENEWSAPI_KEY) return [];
  
  try {
    const url = `https://api.thenewsapi.com/v1/news/all?api_token=${THENEWSAPI_KEY}&search=${encodeURIComponent(query)}&language=${lang}&limit=10`;
    
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];
    
    const data = await res.json() as any;
    
    return (data.data || []).map((a: any) => ({
      title: a.title,
      summary: a.description || a.snippet || a.content?.slice(0, 400) || '',
      url: a.url,
      source: a.source || 'News Source',
      imageUrl: a.image_url,
      publishedAt: a.published_at,
      author: null,
    }));
  } catch (e: any) {
    console.error('TheNewsAPI fetch error:', e.message);
    return [];
  }
}

// ── Helper: Smart Multi-API Fetch with Fallback ────────────────────────────
async function fetchNewsMultiAPI(query: string, country: string, lang: string): Promise<any[]> {
  // Try NewsData.io first (best free tier: 200/day)
  let articles = await fetchNewsDataIO(query, country, lang);
  console.log(`NewsData.io returned ${articles.length} articles for ${country}/${lang}`);
  
  // If insufficient, try NewsAPI
  if (articles.length < 5) {
    const newsAPIArticles = await fetchNewsAPI(query, country, lang);
    console.log(`NewsAPI returned ${newsAPIArticles.length} articles`);
    articles = [...articles, ...newsAPIArticles];
  }
  
  // If still insufficient, try TheNewsAPI
  if (articles.length < 5) {
    const theNewsArticles = await fetchTheNewsAPI(query, country, lang);
    console.log(`TheNewsAPI returned ${theNewsArticles.length} articles`);
    articles = [...articles, ...theNewsArticles];
  }
  
  // Remove duplicates by URL
  const seen = new Set();
  return articles.filter(a => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  }).slice(0, 12);
}

// ── Helper: AI Summarize ───────────────────────────────────────────────────
async function summarizeNews(title: string, content: string, lang: string): Promise<string> {
  const langName = lang === 'ro' ? 'Romanian' : lang === 'en' ? 'English' : lang === 'de' ? 'German' : lang === 'fr' ? 'French' : lang;
  const prompt = `Summarize this news article in ${langName} language.
Title: ${title}
Content: ${content.slice(0, 1500)}

Provide a clear 4-5 sentence summary that covers the key facts, context, and significance. Be informative and engaging.`;
  
  try {
    const summary = await callFreeAI(prompt, 600);
    return summary.trim() || content.slice(0, 200);
  } catch {
    return content.slice(0, 400);
  }
}

// ── Helper: Translate news if needed ────────────────────────────────────────
async function translateIfNeeded(title: string, summary: string, targetLang: string, sourceLang: string): Promise<{ title: string; summary: string }> {
  if (targetLang === sourceLang || targetLang === 'en' && sourceLang === 'en') {
    return { title, summary };
  }
  
  const langName = targetLang === 'ro' ? 'Romanian' : targetLang === 'de' ? 'German' : targetLang === 'fr' ? 'French' : targetLang === 'it' ? 'Italian' : targetLang === 'es' ? 'Spanish' : targetLang;
  
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
async function getClientLocale(clientId: string): Promise<{ country: string; language: string; niche: string; countries: string[] }> {
  // Try with countries column first (new schema), fallback to just country
  let client: any;
  try {
    const clients = await prisma.$queryRaw<any[]>`
      SELECT c.country, c.language, c.countries, t.niche 
      FROM clients c
      LEFT JOIN templates t ON c."templateId" = t.id
      WHERE c.id = ${clientId}
      LIMIT 1
    `;
    client = clients?.[0];
  } catch {
    // Fallback: countries column doesn't exist yet
    const clients = await prisma.$queryRaw<any[]>`
      SELECT c.country, c.language, t.niche 
      FROM clients c
      LEFT JOIN templates t ON c."templateId" = t.id
      WHERE c.id = ${clientId}
      LIMIT 1
    `;
    client = clients?.[0];
  }
  
  // Parse countries array if stored as JSON string
  let countries: string[] = [];
  if (client?.countries) {
    try {
      countries = typeof client.countries === 'string' ? JSON.parse(client.countries) : client.countries;
    } catch {
      countries = [];
    }
  }
  
  // If no countries selected, default to the single country field or US
  if (countries.length === 0 && client?.country) {
    countries = [client.country];
  }
  if (countries.length === 0) {
    countries = ['US'];
  }
  
  return {
    country: client?.country ?? 'US',
    language: client?.language ?? 'en',
    niche: client?.niche ?? 'default',
    countries,
  };
}

// ── GET /api/news ──────────────────────────────────────────────────────────
// Return news from NICHE+COUNTRY CACHE (shared across all clients with same niche+country)
newsRouter.get('/', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  
  const locale = await getClientLocale(clientId);
  const clientCountry = locale.countries[0] || 'US';
  const clientNiche = locale.niche || 'default';
  const cacheKey = `${clientNiche}:${clientCountry}`;
  
  // Get news from niche+country cache (shared across all clients with same niche+country)
  const cached = nicheCountryNewsCache.get(cacheKey);
  
  if (cached && cached.articles.length > 0) {
    // Check if cache is fresh (within 30 minutes)
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
    const isFresh = cached.fetchedAt.getTime() > thirtyMinAgo;
    
    return res.json({ 
      news: cached.articles.slice(0, 10), 
      fromCache: true, 
      niche: clientNiche,
      countries: [clientCountry],
      lastUpdated: cached.fetchedAt,
      shared: true // Indicates these are shared across clients with same niche
    });
  }
  
  // No cache available - try to fetch immediately
  console.log(`[API] No cache for ${cacheKey}, fetching immediately...`);
  const articles = await fetchNewsForNicheCountry(clientNiche, clientCountry);
  
  if (articles.length > 0) {
    nicheCountryNewsCache.set(cacheKey, {
      articles,
      fetchedAt: new Date(),
    });
    
    return res.json({
      news: articles.slice(0, 10),
      fromCache: false,
      niche: clientNiche,
      countries: [clientCountry],
      shared: true,
    });
  }
  
  // No news available
  return res.json({ 
    news: [], 
    fromCache: false, 
    niche: clientNiche,
    countries: [clientCountry],
    message: 'No news available. Cron job will fetch soon.' 
  });
});

// ── POST /api/news/refresh ─────────────────────────────────────────────────
// Manual refresh for a niche+country
newsRouter.post('/refresh', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const locale = await getClientLocale(clientId);
  const clientCountry = locale.countries[0] || 'US';
  const clientNiche = locale.niche || 'default';
  const cacheKey = `${clientNiche}:${clientCountry}`;
  
  const articles = await fetchNewsForNicheCountry(clientNiche, clientCountry);
  
  if (articles.length > 0) {
    nicheCountryNewsCache.set(cacheKey, {
      articles,
      fetchedAt: new Date(),
    });
  }
  
  res.json({
    success: true,
    count: articles.length,
    niche: clientNiche,
    country: clientCountry,
    news: articles.slice(0, 10),
  });
});

// ── GET /api/news/countries ─────────────────────────────────────────────────
// Get list of supported countries
newsRouter.get('/countries', async (req, res) => {
  res.json({
    countries: Object.entries(SUPPORTED_COUNTRIES).map(([code, info]) => ({
      code,
      name: info.name,
      flag: getFlagEmoji(code),
    })),
  });
});

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// ── POST /api/news/select-countries ─────────────────────────────────────────
// Client selects their countries
newsRouter.post('/select-countries', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { countries } = req.body;
  
  if (!Array.isArray(countries) || countries.length === 0) {
    throw new AppError(400, 'At least one country is required');
  }
  
  if (countries.length > 5) {
    throw new AppError(400, 'Maximum 5 countries allowed');
  }
  
  // Validate country codes
  const validCountries = countries.filter(c => SUPPORTED_COUNTRIES[c as keyof typeof SUPPORTED_COUNTRIES]);
  if (validCountries.length === 0) {
    throw new AppError(400, 'No valid country codes provided');
  }
  
  // Save to client
  await prisma.$executeRaw`
    UPDATE clients 
    SET countries = ${JSON.stringify(validCountries)},
        country = ${validCountries[0]},
        "updatedAt" = now()
    WHERE id = ${clientId}
  `;
  
  // Clear news cache to fetch fresh news for new countries
  await prisma.$executeRaw`DELETE FROM news_cache WHERE "clientId" = ${clientId}`;
  
  res.json({
    success: true,
    countries: validCountries,
    message: `News will now be fetched from: ${validCountries.join(', ')}`,
  });
});

// ── GET /api/news/public/:clientSlug ────────────────────────────────────────
// Public endpoint for client website - NO AUTH required
const publicNewsRouter = Router();

publicNewsRouter.get('/:clientSlug', async (req, res) => {
  const { clientSlug } = req.params;
  
  // Find client by slug
  const clients = await prisma.$queryRaw<any[]>`
    SELECT id, country, countries, language FROM clients WHERE slug = ${clientSlug} LIMIT 1
  `;
  
  if (!clients?.length) {
    return res.status(404).json({ error: 'Client not found' });
  }
  
  const clientId = clients[0].id;
  
  // Parse countries
  let countries: string[] = [];
  try {
    countries = clients[0].countries ? JSON.parse(clients[0].countries) : [clients[0].country];
  } catch {
    countries = [clients[0].country || 'US'];
  }
  
  // Get latest cached news
  const news = await prisma.$queryRaw<any[]>`
    SELECT * FROM news_cache 
    WHERE "clientId" = ${clientId}
    ORDER BY "fetchedAt" DESC LIMIT 12
  `;
  
  res.json({ 
    news, 
    clientInfo: {
      country: clients[0].country,
      countries,
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
  
  const locale = await getClientLocale(clientId);
  const _autoBlogCacheKey = `${locale.niche || 'default'}:${locale.countries[0] || 'US'}`;
  const _autoBlogCached = nicheCountryNewsCache.get(_autoBlogCacheKey);
  const news = _autoBlogCached?.articles.find((a: any) => a.id === newsId);
  if (!news) throw new AppError(404, 'News item not found — try refreshing the news feed');
  
  // AI generates blog post based on news
  const prompt = `Write a professional blog post for a ${locale.niche} business website based on this news:

Title: ${news.title}
Summary: ${news.summary}
Source: ${news.source}
Country: ${news.sourceCountryName || locale.country}

Write an engaging blog post that:
1. References this news as industry update
2. Adds professional commentary and insights
3. Connects to the business's expertise in ${locale.country}
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
      "coverImage", "isPublished", "publishedAt", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid()::text, ${clientId}, ${blogData.title}, ${slug},
      ${blogData.excerpt || ''}, ${blogData.content || ''},
      ${news.imageUrl || null}, true, now(), now(), now()
    )
    ON CONFLICT DO NOTHING
  `;
  
  await prisma.$executeRaw`UPDATE clients SET "lastPublishedAt" = now() WHERE id = ${clientId}`;
  
  res.json({ 
    success: true, 
    message: 'Blog post created from news',
    blog: blogData,
    sourceNews: { id: newsId, title: news.title, source: news.source }
  });
});

// ── GET /api/news/published ───────────────────────────────────────────────
// Returns all site_news_items posted for this client.
newsRouter.get('/published', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const rows = await prisma.$queryRaw<any[]>`
    SELECT id, title, summary, "customSummary", url, "imageUrl", source, "isVisible", "postedAt"
    FROM site_news_items
    WHERE "clientId" = ${clientId}
    ORDER BY "postedAt" DESC
    LIMIT 50
  `;
  res.json({ items: rows });
});

// ── DELETE /api/news/site-news/:id ────────────────────────────────────────
newsRouter.delete('/site-news/:id', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { id } = req.params;
  await prisma.$executeRaw`
    DELETE FROM site_news_items WHERE id = ${id} AND "clientId" = ${clientId}
  `;
  res.json({ success: true });
});

// ── POST /api/news/post-to-site ───────────────────────────────────────────
// Save a news item to the homepage news section (NOT a blog post).
// Accepts optional customSummary to override the AI-generated summary.
newsRouter.post('/post-to-site', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { newsId, customSummary, newsData } = req.body;

  if (!newsId) throw new AppError(400, 'newsId is required');

  const locale = await getClientLocale(clientId);
  const cacheKey = `${locale.niche || 'default'}:${locale.countries[0] || 'US'}`;
  const cached = nicheCountryNewsCache.get(cacheKey);
  // Fall back to client-supplied newsData when cache is empty (e.g. after server restart)
  const news = cached?.articles.find((a: any) => a.id === newsId) ?? newsData;
  if (!news) throw new AppError(404, 'News item not found — try refreshing the news feed');

  // Remove any previous entry for this same URL to avoid duplicates
  await prisma.$executeRaw`
    DELETE FROM site_news_items
    WHERE "clientId" = ${clientId} AND url = ${news.url || ''}
  `;

  await prisma.$executeRaw`
    INSERT INTO site_news_items (
      id, "clientId", title, summary, "customSummary", url,
      "imageUrl", source, "isVisible", "postedAt", "createdAt"
    ) VALUES (
      gen_random_uuid()::text, ${clientId}, ${news.title || ''},
      ${news.summary || ''}, ${customSummary ?? null}, ${news.url || null},
      ${news.imageUrl || null}, ${news.source || null}, true, now(), now()
    )
  `;

  // Trigger full site re-publish so the news card appears live
  try {
    const { buildAndPublish } = await import('./publish');
    await buildAndPublish(clientId);
    console.log(`[news/post-to-site] Re-published site for client ${clientId}`);
  } catch (publishErr) {
    console.error('[news/post-to-site] Re-publish failed (non-fatal):', publishErr);
  }

  res.json({ success: true, message: 'News posted to site homepage', title: news.title });
});

// ── Helper: scrape article URL ────────────────────────────────────────────
async function scrapeArticleText(url: string): Promise<string> {
  if (!url || url === '#') return '';
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BuildHazeCMS/1.0)' },
    });
    if (!res.ok) return '';
    const html = await res.text();
    // Strip tags, collapse whitespace, limit to 3000 chars
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000);
  } catch {
    return '';
  }
}

// ── POST /api/news/generate-blog ──────────────────────────────────────────
// Generate a full AI blog post from a news item and save to blog_posts.
newsRouter.post('/generate-blog', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { newsId, newsData } = req.body;

  if (!newsId) throw new AppError(400, 'newsId is required');

  const locale = await getClientLocale(clientId);
  const cacheKey = `${locale.niche || 'default'}:${locale.countries[0] || 'US'}`;
  const cached = nicheCountryNewsCache.get(cacheKey);
  const news = cached?.articles.find((a: any) => a.id === newsId) ?? newsData;
  if (!news) throw new AppError(404, 'News item not found — try refreshing the news feed');

  // Try to scrape full article text
  const articleText = await scrapeArticleText(news.url || '');

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { businessName: true },
  });

  const systemPrompt = `You are an expert content writer for a ${locale.niche} business. Write detailed, SEO-optimized blog posts in the language of the news article (Romanian if source is Romanian, English otherwise). Return ONLY valid JSON, no markdown fences.`;

  const prompt = `Transform this news story into a comprehensive, detailed blog post for "${client?.businessName || 'our business'}".

NEWS TITLE: ${news.title}
NEWS SUMMARY: ${news.summary || ''}
SOURCE: ${news.source || ''}
URL: ${news.url || ''}
${articleText ? `
FULL ARTICLE TEXT (scraped):
${articleText}` : ''}

INSTRUCTIONS:
1. Use ALL the scraped content — go deep, explain everything thoroughly
2. Add expert commentary and insights relevant to ${locale.niche} professionals
3. Explain implications for clients/customers
4. Include practical advice based on the news
5. Minimum 800 words in the content HTML
6. Structure: intro → key findings (H2) → implications (H2) → practical advice (H2) → conclusion with CTA

Return ONLY valid JSON:
{
  "title": "Engaging SEO blog title (max 80 chars)",
  "excerpt": "Compelling meta description (150-160 chars)",
  "content": "Full HTML blog post — use <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <blockquote>. Min 800 words.",
  "tags": ["tag1","tag2","tag3","tag4"],
  "readTime": 8
}`;

  let blogData: any;
  try {
    const raw = await groqChat(prompt, 'llama-3.3-70b-versatile', 3000, systemPrompt);
    const jsonMatch = raw.replace(/```json|```/g, '').match(/\{[\s\S]*\}/);
    blogData = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    blogData = {
      title: `Actualitate: ${news.title}`.slice(0, 70),
      excerpt: (news.summary || '').slice(0, 160),
      content: `<h2>Noutăți din industrie</h2><p>${news.summary}</p><p>Citiți articolul original: <a href="${news.url}">${news.source}</a></p>`,
      tags: [locale.niche, 'stiri', 'actualitate'],
      readTime: 5,
    };
  }

  const slug = (blogData.title as string)
    .toLowerCase()
    .replace(/[^a-z0-9\u00e0-\u024f]+/g, '-')
    .replace(/^-|-$/g, '');

  await prisma.$executeRaw`
    INSERT INTO blog_posts (
      id, "clientId", title, slug, excerpt, content,
      "coverImage", "isPublished", "publishedAt", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid()::text, ${clientId}, ${blogData.title}, ${slug},
      ${blogData.excerpt || ''}, ${blogData.content || ''},
      ${news.imageUrl || null}, true, now(), now(), now()
    )
    ON CONFLICT DO NOTHING
  `;

  try {
    const { buildAndPublish } = await import('./publish');
    await buildAndPublish(clientId);
  } catch (publishErr) {
    console.error('[news/generate-blog] Re-publish failed (non-fatal):', publishErr);
  }

  res.json({ success: true, message: 'Blog post generated from news', slug, title: blogData.title });
});

// ── DELETE /api/news/:id ──────────────────────────────────────────────────
newsRouter.delete('/:id', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { id } = req.params;
  
  const delLocale = await getClientLocale(clientId);
  const delCacheKey = `${delLocale.niche || 'default'}:${delLocale.countries[0] || 'US'}`;
  const delCached = nicheCountryNewsCache.get(delCacheKey);
  if (delCached) {
    delCached.articles = delCached.articles.filter((a: any) => a.id !== id);
  }
  
  res.json({ success: true, message: 'News item removed' });
});

// ═══════════════════════════════════════════════════════════════════════════
// CRON JOB: Auto-fetch news per COUNTRY (not per client) every 15 minutes
// ═══════════════════════════════════════════════════════════════════════════

// Global cache for niche + country news (shared across all clients)
// Key format: "niche:country" (e.g., "lawyer:US", "doctor:RO")
const nicheCountryNewsCache: Map<string, { articles: any[]; fetchedAt: Date }> = new Map();

// Get unique niche + country combinations from all active clients
async function getUniqueNicheCountryCombos(): Promise<{niche: string, country: string}[]> {
  const clients = await prisma.$queryRaw<any[]>`
    SELECT DISTINCT c.country, c.countries, t.niche 
    FROM clients c
    LEFT JOIN templates t ON c."templateId" = t.id
    WHERE c."isActive" = true
  `;
  
  const combos = new Map<string, {niche: string, country: string}>();
  
  for (const client of clients) {
    const niche = client.niche || 'default';
    
    // Check countries array first
    if (client.countries) {
      try {
        const countries = typeof client.countries === 'string' 
          ? JSON.parse(client.countries) 
          : client.countries;
        if (Array.isArray(countries)) {
          countries.forEach((c: string) => {
            const countryCode = c.toUpperCase();
            if (SUPPORTED_COUNTRIES[countryCode as keyof typeof SUPPORTED_COUNTRIES]) {
              const key = `${niche}:${countryCode}`;
              combos.set(key, { niche, country: countryCode });
            }
          });
        }
      } catch {
        // Ignore parse error
      }
    }
    // Fallback to single country
    if (client.country) {
      const countryCode = client.country.toUpperCase();
      if (SUPPORTED_COUNTRIES[countryCode as keyof typeof SUPPORTED_COUNTRIES]) {
        const key = `${niche}:${countryCode}`;
        combos.set(key, { niche, country: countryCode });
      }
    }
  }
  
  return Array.from(combos.values());
}

// Fetch news for a specific niche + country combination
async function fetchNewsForNicheCountry(niche: string, countryCode: string): Promise<any[]> {
  const country = SUPPORTED_COUNTRIES[countryCode as keyof typeof SUPPORTED_COUNTRIES];
  if (!country) {
    console.log(`[FETCH] Country ${countryCode} not supported`);
    return [];
  }
  
  const keywords = NICHE_KEYWORDS[niche] || NICHE_KEYWORDS.default;
  // Use first 15 keywords for broader search (includes accidents, crimes, drugs, etc.)
  const query = keywords.slice(0, 15).join(' OR ');
  
  console.log(`[FETCH] Fetching news for ${niche}:${countryCode} with query: ${query}`);
  console.log(`[FETCH] API Key exists: ${!!NEWSDATA_API_KEY}`);
  
  // Try NewsData.io first
  if (NEWSDATA_API_KEY) {
    try {
      const url = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&country=${country.newsdataCode}&language=${country.lang}&q=${encodeURIComponent(query)}&size=10`;
      console.log(`[FETCH] NewsData.io URL: ${url.substring(0, 60)}...`);
      
      const res = await fetch(
        url,
        { signal: AbortSignal.timeout(10000) }
      );
      
      console.log(`[FETCH] NewsData.io response status: ${res.status}`);
      
      if (res.ok) {
        const data = await res.json();
        console.log(`[FETCH] NewsData.io results: ${data.results?.length || 0}`);
        
        if (data.results?.length > 0) {
          return data.results.slice(0, 10).map((article: any, i: number) => ({
            id: `newsd-${countryCode}-${Date.now()}-${i}`,
            title: article.title,
            summary: article.description || article.content?.substring(0, 200) || article.title,
            url: article.link,
            imageUrl: article.image_url,
            source: article.source_id || 'NewsData',
            sourceCountry: countryCode,
            sourceCountryName: country.name,
            fetchedAt: new Date(),
          }));
        }
        
        // No results with niche query - try generic news
        console.log(`[FETCH] No results for niche query, trying generic news...`);
      } else {
        const errorText = await res.text();
        console.log(`[FETCH] NewsData.io error: ${errorText}`);
      }
    } catch (e) {
      console.log(`[FETCH] NewsData.io failed for ${countryCode}:`, e);
    }
  }
  
  // Fallback 1: Generic news without query (just country)
  if (NEWSDATA_API_KEY) {
    try {
      console.log(`[FETCH] Trying generic news for ${countryCode}...`);
      const res = await fetch(
        `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&country=${country.newsdataCode}&language=${country.lang}&size=10`,
        { signal: AbortSignal.timeout(10000) }
      );
      
      if (res.ok) {
        const data = await res.json();
        console.log(`[FETCH] Generic NewsData.io results: ${data.results?.length || 0}`);
        
        if (data.results?.length > 0) {
          return data.results.slice(0, 10).map((article: any, i: number) => ({
            id: `newsd-gen-${countryCode}-${Date.now()}-${i}`,
            title: article.title,
            summary: article.description || article.content?.substring(0, 200) || article.title,
            url: article.link,
            imageUrl: article.image_url,
            source: article.source_id || 'NewsData',
            sourceCountry: countryCode,
            sourceCountryName: country.name,
            fetchedAt: new Date(),
          }));
        }
      }
    } catch (e) {
      console.log(`[FETCH] Generic NewsData.io failed:`, e);
    }
  }
  
  // Fallback 2: NewsAPI
  if (NEWS_API_KEY) {
    try {
      const res = await fetch(
        `https://newsapi.org/v2/top-headlines?country=${country.code}&category=business&pageSize=10&apiKey=${NEWS_API_KEY}`,
        { signal: AbortSignal.timeout(10000) }
      );
      
      if (res.ok) {
        const data = await res.json();
        if (data.articles?.length > 0) {
          return data.articles.slice(0, 10).map((article: any, i: number) => ({
            id: `newsapi-${countryCode}-${Date.now()}-${i}`,
            title: article.title,
            summary: article.description || article.title,
            url: article.url,
            imageUrl: article.urlToImage,
            source: article.source?.name || 'NewsAPI',
            sourceCountry: countryCode,
            sourceCountryName: country.name,
            fetchedAt: new Date(),
          }));
        }
      }
    } catch (e) {
      console.log(`NewsAPI failed for ${countryCode}:`, e);
    }
  }
  
  return [];
}

// Main cron job function
async function cronFetchNewsForAllCountries() {
  console.log('[CRON] Starting news fetch for all niche+country combos...');
  
  try {
    const combos = await getUniqueNicheCountryCombos();
    console.log(`[CRON] Found ${combos.length} unique niche+country combos:`, combos);
    
    for (const { niche, country } of combos) {
      const cacheKey = `${niche}:${country}`;
      try {
        const articles = await fetchNewsForNicheCountry(niche, country);
        if (articles.length > 0) {
          nicheCountryNewsCache.set(cacheKey, {
            articles,
            fetchedAt: new Date(),
          });
          console.log(`[CRON] Fetched ${articles.length} articles for ${cacheKey}`);
        }
      } catch (e) {
        console.error(`[CRON] Failed to fetch for ${cacheKey}:`, e);
      }
      
      // Small delay between requests to not hit rate limits
      await new Promise(r => setTimeout(r, 2000));
    }
    
    console.log('[CRON] News fetch completed');
  } catch (e) {
    console.error('[CRON] Cron job failed:', e);
  }
}

// Start cron job every 15 minutes
const CRON_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

setInterval(cronFetchNewsForAllCountries, CRON_INTERVAL_MS);

// Also run immediately on startup
cronFetchNewsForAllCountries();

console.log('[CRON] News auto-fetcher initialized (every 15 minutes)');

// Export for manual trigger
export { cronFetchNewsForAllCountries, nicheCountryNewsCache };
export { publicNewsRouter };
