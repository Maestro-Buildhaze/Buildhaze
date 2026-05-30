import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const newsRouter: Router = Router();
newsRouter.use(requireAuth);

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
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
const NICHE_KEYWORDS: Record<string, string[]> = {
  lawyer: ['law', 'legal', 'attorney', 'court', 'legislation', 'justice'],
  attorney: ['law', 'legal', 'attorney', 'court', 'case', 'lawsuit'],
  law: ['law', 'legal', 'legislation', 'justice', 'court'],
  doctor: ['health', 'medical', 'medicine', 'healthcare', 'doctor'],
  medical: ['health', 'medical', 'medicine', 'healthcare', 'hospital'],
  dentist: ['dental', 'teeth', 'oral health', 'dentistry'],
  tech: ['technology', 'AI', 'software', 'startup', 'tech', 'innovation'],
  technology: ['technology', 'AI', 'software', 'innovation', 'digital'],
  software: ['software', 'programming', 'development', 'tech', 'coding'],
  realestate: ['real estate', 'property', 'housing', 'market', 'mortgage'],
  realtor: ['real estate', 'property', 'housing', 'homes', 'construction'],
  construction: ['construction', 'building', 'industry', 'architecture'],
  restaurant: ['food', 'restaurant', 'hospitality', 'cuisine', 'dining'],
  retail: ['retail', 'shopping', 'business', 'ecommerce', 'sales'],
  finance: ['finance', 'economy', 'business', 'market', 'investment', 'stock'],
  consulting: ['business', 'consulting', 'management', 'strategy'],
  marketing: ['marketing', 'advertising', 'digital marketing', 'SEO', 'social media'],
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
      summary: a.description || a.content?.slice(0, 200) || '',
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
      summary: a.description || a.snippet || '',
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

Provide a concise 2-3 sentence summary. Be factual and brief.`;
  
  try {
    const summary = await callFreeAI(prompt, 300);
    return summary.trim() || content.slice(0, 200);
  } catch {
    return content.slice(0, 200);
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
// Return news from COUNTRY CACHE (shared across all clients with same country)
newsRouter.get('/', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  
  const locale = await getClientLocale(clientId);
  const clientCountry = locale.countries[0] || 'US'; // Only 1 country per client now
  
  // Get news from country cache (shared across all clients)
  const countryCache = countryNewsCache.get(clientCountry);
  
  if (countryCache && countryCache.articles.length > 0) {
    // Check if cache is fresh (within 30 minutes)
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
    const isFresh = countryCache.fetchedAt.getTime() > thirtyMinAgo;
    
    return res.json({ 
      news: countryCache.articles.slice(0, 10), 
      fromCache: true, 
      countries: [clientCountry],
      lastUpdated: countryCache.fetchedAt,
      shared: true // Indicates these are shared across clients
    });
  }
  
  // No cache available - try to fetch immediately
  console.log(`[API] No cache for ${clientCountry}, fetching immediately...`);
  const articles = await fetchNewsForCountry(clientCountry);
  
  if (articles.length > 0) {
    countryNewsCache.set(clientCountry, {
      articles,
      fetchedAt: new Date(),
    });
    
    return res.json({
      news: articles.slice(0, 10),
      fromCache: false,
      countries: [clientCountry],
      shared: true,
    });
  }
  
  // No news available
  return res.json({ 
    news: [], 
    fromCache: false, 
    countries: [clientCountry],
    message: 'No news available. Cron job will fetch soon.' 
  });
});

// ── POST /api/news/refresh ─────────────────────────────────────────────────
// Manual refresh for a country
newsRouter.post('/refresh', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const locale = await getClientLocale(clientId);
  const clientCountry = locale.countries[0] || 'US';
  
  const articles = await fetchNewsForCountry(clientCountry);
  
  if (articles.length > 0) {
    countryNewsCache.set(clientCountry, {
      articles,
      fetchedAt: new Date(),
    });
  }
  
  res.json({
    success: true,
    count: articles.length,
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

// ── DELETE /api/news/:id ──────────────────────────────────────────────────
newsRouter.delete('/:id', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { id } = req.params;
  
  await prisma.$executeRaw`
    DELETE FROM news_cache WHERE id = ${id} AND "clientId" = ${clientId}
  `;
  
  res.json({ success: true, message: 'News item removed' });
});

// ═══════════════════════════════════════════════════════════════════════════
// CRON JOB: Auto-fetch news per COUNTRY (not per client) every 15 minutes
// ═══════════════════════════════════════════════════════════════════════════

// Global cache for country news (shared across all clients)
const countryNewsCache: Map<string, { articles: any[]; fetchedAt: Date }> = new Map();

// Get unique countries from all active clients
async function getUniqueCountriesFromClients(): Promise<string[]> {
  const clients = await prisma.$queryRaw<any[]>`
    SELECT DISTINCT country, countries 
    FROM clients 
    WHERE isActive = true
  `;
  
  const uniqueCountries = new Set<string>();
  
  for (const client of clients) {
    // Check countries array first
    if (client.countries) {
      try {
        const countries = typeof client.countries === 'string' 
          ? JSON.parse(client.countries) 
          : client.countries;
        if (Array.isArray(countries)) {
          countries.forEach((c: string) => uniqueCountries.add(c.toUpperCase()));
        }
      } catch {
        // Ignore parse error
      }
    }
    // Fallback to single country
    if (client.country && !uniqueCountries.has(client.country.toUpperCase())) {
      uniqueCountries.add(client.country.toUpperCase());
    }
  }
  
  return Array.from(uniqueCountries).filter(c => SUPPORTED_COUNTRIES[c as keyof typeof SUPPORTED_COUNTRIES]);
}

// Fetch news for a specific country
async function fetchNewsForCountry(countryCode: string): Promise<any[]> {
  const country = SUPPORTED_COUNTRIES[countryCode as keyof typeof SUPPORTED_COUNTRIES];
  if (!country) return [];
  
  const keywords = NICHE_KEYWORDS.default;
  const query = keywords.join(' OR ');
  
  // Try NewsData.io first
  if (NEWSDATA_API_KEY) {
    try {
      const res = await fetch(
        `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&country=${country.newsdataCode}&language=${country.lang}&q=${encodeURIComponent(query)}&size=10`,
        { signal: AbortSignal.timeout(10000) }
      );
      
      if (res.ok) {
        const data = await res.json();
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
      }
    } catch (e) {
      console.log(`NewsData.io failed for ${countryCode}:`, e);
    }
  }
  
  // Fallback to NewsAPI
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
  console.log('[CRON] Starting news fetch for all countries...');
  
  try {
    const countries = await getUniqueCountriesFromClients();
    console.log(`[CRON] Found ${countries.length} unique countries:`, countries);
    
    for (const countryCode of countries) {
      try {
        const articles = await fetchNewsForCountry(countryCode);
        if (articles.length > 0) {
          countryNewsCache.set(countryCode, {
            articles,
            fetchedAt: new Date(),
          });
          console.log(`[CRON] Fetched ${articles.length} articles for ${countryCode}`);
        }
      } catch (e) {
        console.error(`[CRON] Failed to fetch for ${countryCode}:`, e);
      }
      
      // Small delay between countries to not hit rate limits
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
export { cronFetchNewsForAllCountries, countryNewsCache };
export { publicNewsRouter };
