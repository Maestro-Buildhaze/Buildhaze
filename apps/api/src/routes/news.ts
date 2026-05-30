import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const newsRouter: Router = Router();
newsRouter.use(requireAuth);

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;
const AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';

// FREE News Sources with RSS/API
const NEWS_SOURCES = {
  // General news - RSS feeds
  general: [
    { name: 'BBC News', rss: 'http://feeds.bbci.co.uk/news/rss.xml', lang: 'en' },
    { name: 'Reuters', rss: 'http://feeds.reuters.com/reuters/topNews', lang: 'en' },
    { name: 'CNN', rss: 'http://rss.cnn.com/rss/edition.rss', lang: 'en' },
    { name: 'The Guardian', rss: 'https://www.theguardian.com/world/rss', lang: 'en' },
    { name: 'Le Monde', rss: 'https://www.lemonde.fr/rss/en_continu.xml', lang: 'fr' },
    { name: 'Spiegel', rss: 'https://www.spiegel.de/international/index.rss', lang: 'de' },
    { name: 'Corriere della Sera', rss: 'https://www.corriere.it/rss/homepage.xml', lang: 'it' },
    { name: 'El País', rss: 'https://feeds.elpais.com/feeds/rss/elpais/portada.xml', lang: 'es' },
    { name: 'Libération', rss: 'https://www.liberation.fr/rss/11.xml', lang: 'fr' },
  ],
  // Business/Law
  business: [
    { name: 'Financial Times', rss: 'https://www.ft.com/?format=rss', lang: 'en' },
    { name: 'Bloomberg', rss: 'https://feeds.bloomberg.com/business/news.rss', lang: 'en' },
    { name: 'Wall Street Journal', rss: 'https://feeds.content.dowjones.com/public/rss/RSSMarketsMain', lang: 'en' },
    { name: 'Forbes', rss: 'https://www.forbes.com/business/feed/', lang: 'en' },
    { name: 'Business Insider', rss: 'https://www.businessinsider.com/rss', lang: 'en' },
    { name: 'The Economist', rss: 'https://www.economist.com/latest/rss.xml', lang: 'en' },
  ],
  // Tech
  tech: [
    { name: 'TechCrunch', rss: 'https://techcrunch.com/feed/', lang: 'en' },
    { name: 'The Verge', rss: 'https://www.theverge.com/rss/index.xml', lang: 'en' },
    { name: 'Wired', rss: 'https://www.wired.com/feed/rss', lang: 'en' },
    { name: 'Ars Technica', rss: 'http://feeds.arstechnica.com/arstechnica/index', lang: 'en' },
  ],
  // Health
  health: [
    { name: 'Medical News Today', rss: 'https://www.medicalnewstoday.com/news.rss', lang: 'en' },
    { name: 'Health.com', rss: 'https://www.health.com/rss', lang: 'en' },
    { name: 'WebMD', rss: 'https://www.webmd.com/rss/news.xml', lang: 'en' },
  ],
  // Real Estate
  realestate: [
    { name: 'HousingWire', rss: 'https://www.housingwire.com/feed/', lang: 'en' },
    { name: 'Inman News', rss: 'https://www.inman.com/feed/', lang: 'en' },
    { name: 'Realtor.com', rss: 'https://www.realtor.com/news/feed/', lang: 'en' },
  ],
};

// Niche mapping to news categories
const NICHE_TO_CATEGORY: Record<string, string[]> = {
  lawyer: ['business', 'general'],
  attorney: ['business', 'general'],
  law: ['business', 'general'],
  doctor: ['health', 'general'],
  medical: ['health', 'general'],
  dentist: ['health', 'general'],
  tech: ['tech', 'general'],
  technology: ['tech', 'general'],
  software: ['tech', 'general'],
  realestate: ['realestate', 'business'],
  realtor: ['realestate', 'business'],
  construction: ['business', 'general'],
  restaurant: ['business', 'general'],
  retail: ['business', 'general'],
  finance: ['business', 'general'],
  consulting: ['business', 'general'],
  default: ['general', 'business'],
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

// ── Helper: Fetch and parse RSS ────────────────────────────────────────────
async function fetchRSS(url: string): Promise<Array<{ title: string; link: string; description: string; pubDate: string; imageUrl?: string }>> {
  try {
    const res = await fetch(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return [];
    const xml = await res.text();
    
    // Simple XML parsing
    const items: any[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<\!\[CDATA\[(.*?)\]\]>/, '$1').trim() ?? '';
      const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? '';
      const description = itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.replace(/<\!\[CDATA\[(.*?)\]\]>/, '$1').replace(/<[^>]+>/g, '').trim() ?? '';
      const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? new Date().toISOString();
      // Try to find image in content or media
      let imageUrl = itemXml.match(/<media:content[^>]*url="([^"]+)"/)?.[1];
      if (!imageUrl) {
        imageUrl = itemXml.match(/<enclosure[^>]*url="([^"]+)"/)?.[1];
      }
      if (!imageUrl) {
        // Extract from description img tag
        const imgMatch = description.match(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|gif|webp))"/i);
        imageUrl = imgMatch?.[1];
      }
      
      if (title && link) {
        items.push({ title, link, description, pubDate, imageUrl });
      }
    }
    return items.slice(0, 5); // Top 5 per source
  } catch (e) {
    console.error('RSS fetch error:', url, e);
    return [];
  }
}

// ── Helper: Get fallback news from NewsAPI-like free sources ───────────────
async function getFallbackNews(category: string): Promise<any[]> {
  // Use worldnewsapi.com free tier (100 requests/day) or similar
  const apiKey = process.env.NEWS_API_KEY; // Optional - for newsdata.io or worldnewsapi
  if (!apiKey) {
    // Return empty - will use cached or generated
    return [];
  }
  try {
    const res = await fetch(`https://api.worldnewsapi.com/search-news?api-key=${apiKey}&text=${category}&language=en&number=10`, {
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.news || []).map((n: any) => ({
      title: n.title,
      link: n.url,
      description: n.summary || n.text?.slice(0, 300) || '',
      pubDate: n.publish_date || new Date().toISOString(),
      imageUrl: n.image,
      source: n.source?.name || 'News Source',
    }));
  } catch (e) {
    return [];
  }
}

// ── Helper: AI Summarize ───────────────────────────────────────────────────
async function summarizeNews(title: string, content: string, lang: string): Promise<string> {
  const prompt = `Summarize this news article in ${lang === 'en' ? 'English' : lang} language.
Title: ${title}
Content: ${content.slice(0, 2000)}

Provide a concise 2-3 sentence summary highlighting the key points. Be factual and objective.`;
  
  try {
    const summary = await callFreeAI(prompt, 300);
    return summary.trim() || content.slice(0, 200);
  } catch {
    return content.slice(0, 200);
  }
}

// ── Helper: Get client's country and language ─────────────────────────────
async function getClientLocale(clientId: string): Promise<{ country: string; language: string; niche: string }> {
  // Use raw SQL to avoid type issues until Prisma client is regenerated
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
    niche: client?.niche ?? 'general',
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
    if (cached?.length >= 6) {
      return res.json({ news: cached, fromCache: true });
    }
  }
  
  // Determine news categories based on niche
  const categories = NICHE_TO_CATEGORY[locale.niche] || NICHE_TO_CATEGORY.default;
  
  // Fetch from RSS sources
  const allNews: any[] = [];
  const sources = new Set<string>();
  
  for (const category of categories) {
    const catSources = NEWS_SOURCES[category as keyof typeof NEWS_SOURCES] || NEWS_SOURCES.general;
    // Filter by language preference
    const langSources = catSources.filter(s => 
      locale.language === 'en' ? s.lang === 'en' : true
    ).slice(0, 3); // Top 3 sources per category
    
    for (const source of langSources) {
      if (sources.has(source.name)) continue;
      sources.add(source.name);
      
      const items = await fetchRSS(source.rss);
      for (const item of items) {
        // AI summarize if description is long
        let summary = item.description.slice(0, 300);
        if (item.description.length > 150) {
          try {
            summary = await summarizeNews(item.title, item.description, locale.language);
          } catch {
            summary = item.description.slice(0, 300);
          }
        }
        
        allNews.push({
          title: item.title,
          summary,
          url: item.link,
          source: source.name,
          imageUrl: item.imageUrl || `https://source.unsplash.com/800x400/?${locale.niche},news`,
          publishedAt: item.pubDate,
          language: source.lang,
          category: locale.niche,
        });
      }
    }
  }
  
  // If RSS failed, try fallback API
  if (allNews.length < 5) {
    const fallback = await getFallbackNews(locale.niche);
    for (const item of fallback.slice(0, 5)) {
      const summary = await summarizeNews(item.title, item.description, locale.language);
      allNews.push({
        title: item.title,
        summary,
        url: item.link,
        source: item.source,
        imageUrl: item.imageUrl,
        publishedAt: item.pubDate,
        language: locale.language,
        category: locale.niche,
      });
    }
  }
  
  // Clear old cache and save new
  await prisma.$executeRaw`DELETE FROM news_cache WHERE "clientId" = ${clientId}`;
  
  // Save top 10 news items
  const topNews = allNews.slice(0, 10);
  for (const item of topNews) {
    await prisma.$executeRaw`
      INSERT INTO news_cache (
        id, "clientId", niche, title, summary, url, source, "imageUrl", "fetchedAt"
      ) VALUES (
        gen_random_uuid()::text, ${clientId}, ${item.category}, 
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
1. References this news as industry update/trend
2. Adds professional commentary and insights
3. Connects to the business's expertise
4. Includes practical advice for readers
5. Is SEO-optimized with relevant keywords

Return ONLY valid JSON:
{
  "title": "Engaging blog title (max 70 chars)",
  "excerpt": "Compelling meta description (150-160 chars)",
  "content": "Full HTML content with <h2>, <p>, <ul> tags. Minimum 500 words.",
  "metaTitle": "SEO title (60 chars max)",
  "metaDesc": "SEO description (150-160 chars)",
  "tags": ["tag1","tag2","tag3"],
  "readTime": "X min read",
  "category": "Industry News"
}`;

  const aiResponse = await callFreeAI(prompt, 2000);
  
  // Parse JSON response
  let blogData: any;
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    blogData = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
  } catch {
    // Fallback - create simple blog structure
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
  const blog = await prisma.$executeRaw`
    INSERT INTO blog_posts (
      id, "clientId", title, slug, excerpt, content, 
      "metaTitle", "metaDesc", category, tags, "readTime", 
      "coverImage", published, "publishedAt", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid()::text, ${clientId}, ${blogData.title}, 
      ${blogData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')},
      ${blogData.excerpt}, ${blogData.content}, ${blogData.metaTitle || blogData.title},
      ${blogData.metaDesc || blogData.excerpt}, ${blogData.category || 'News'},
      ${JSON.stringify(blogData.tags || [])}, ${blogData.readTime || '3 min read'},
      ${news.imageUrl}, true, now(), now(), now()
    )
  `;
  
  // Update client's last published
  await prisma.$executeRaw`UPDATE clients SET "lastPublishedAt" = now() WHERE id = ${clientId}`;
  
  res.json({ 
    success: true, 
    message: 'Blog post created from news',
    blog: blogData,
    sourceNews: { id: newsId, title: news.title, source: news.source }
  });
});

// ── POST /api/news/summarize ───────────────────────────────────────────────
// AI summarize any URL (for manual news entry)
newsRouter.post('/summarize', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { url, title, content } = req.body;
  
  if (!url && !content) throw new AppError(400, 'url or content required');
  
  const locale = await getClientLocale(clientId);
  
  // If URL provided, we'd ideally fetch it (but CORS/security issues)
  // For now, use provided content
  const textToSummarize = content || title || '';
  
  const summary = await summarizeNews(title || 'News Article', textToSummarize, locale.language);
  
  res.json({ summary, url, language: locale.language });
});

// ── DELETE /api/news/:id ──────────────────────────────────────────────────
// Remove a news item from client's feed
newsRouter.delete('/:id', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { id } = req.params;
  
  await prisma.$executeRaw`
    DELETE FROM news_cache WHERE id = ${id} AND "clientId" = ${clientId}
  `;
  
  res.json({ success: true, message: 'News item removed' });
});
