import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { groqChat } from '../lib/groq-ai';

export const aiRouter: Router = Router();
aiRouter.use(requireAuth);

// FREE AI using Cloudflare Workers AI (generous free tier)
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CF_AI_API_TOKEN;
const AI_MODEL = '@cf/meta/llama-3.1-8b-instruct'; // FREE model on Cloudflare

// ── Helpers ────────────────────────────────────────────────────────────────

// ── Credit costs per action (in tokens) ───────────────────────────────────
export const AI_COSTS = {
  'generate-blog':   { tokens: 4000,  label: 'Blog AI Generate',      dailyLimit: 2 },
  'news-blog':       { tokens: 4000,  label: 'News → Blog Generate',  dailyLimit: 2 },
  'niche-news':      { tokens: 500,   label: 'News Fetch',            dailyLimit: 10 },
  'suggestions':     { tokens: 300,   label: 'AI Suggestions',        dailyLimit: 20 },
  'chat':            { tokens: 150,   label: 'Chatbot Message',       dailyLimit: 200 },
} as const;

export type AiAction = keyof typeof AI_COSTS;

async function getOrCreateCredits(clientId: string) {
  // Try to insert with ON CONFLICT DO NOTHING to handle race conditions gracefully
  try {
    await prisma.$executeRaw`
      INSERT INTO client_credits (id, "clientId", "totalCredits", "usedCredits", "monthlyLimit", "monthlyUsed", "resetAt", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, ${clientId}, 100000, 0, 50000, 0, now() + interval '30 days', now(), now())
      ON CONFLICT ("clientId") DO NOTHING
    `;
  } catch (e: any) {
    // If error is not a conflict, rethrow
    if (!e.message?.includes('23505') && !e.message?.includes('unique')) throw e;
  }
  // Always return the existing or newly created row
  const rows = await prisma.$queryRaw<any[]>`SELECT * FROM client_credits WHERE "clientId" = ${clientId} LIMIT 1`;
  if (!rows?.length) throw new AppError(500, 'Failed to get or create credits');
  return rows[0];
}

async function consumeCredits(clientId: string, tokens: number) {
  await prisma.$executeRaw`
    UPDATE client_credits SET "usedCredits"="usedCredits"+${tokens}, "monthlyUsed"="monthlyUsed"+${tokens}, "updatedAt"=now()
    WHERE "clientId"=${clientId}
  `;
}

async function checkAndConsumeCredits(clientId: string, estimated: number) {
  const credits = await getOrCreateCredits(clientId);
  const remaining = credits.monthlyLimit - credits.monthlyUsed;
  if (remaining < estimated) throw new AppError(402, 'Monthly AI credit limit reached. Please upgrade your plan.');
}

async function logUsage(clientId: string, action: AiAction, tokensUsed: number) {
  await prisma.$executeRaw`
    INSERT INTO ai_usage_log (id, "clientId", action, "tokensUsed", "createdAt")
    VALUES (gen_random_uuid()::text, ${clientId}, ${action}, ${tokensUsed}, now())
  `;
}

async function checkDailyLimit(clientId: string, action: AiAction) {
  const cfg = AI_COSTS[action];
  if (!cfg.dailyLimit) return;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const rows = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*)::int as cnt FROM ai_usage_log
    WHERE "clientId"=${clientId} AND action=${action} AND "createdAt" >= ${todayStart.toISOString()}::timestamptz
  `;
  const used = Number(rows?.[0]?.cnt ?? 0);
  if (used >= cfg.dailyLimit) {
    throw new AppError(429, `Daily limit reached: ${cfg.dailyLimit} ${cfg.label} per day. Try again tomorrow.`);
  }
  return { used, limit: cfg.dailyLimit };
}

export async function getDailyUsage(clientId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const rows = await prisma.$queryRaw<any[]>`
    SELECT action, COUNT(*)::int as count, SUM("tokensUsed")::int as tokens
    FROM ai_usage_log
    WHERE "clientId"=${clientId} AND "createdAt" >= ${todayStart.toISOString()}::timestamptz
    GROUP BY action
  `;
  const usage: Record<string, { count: number; tokens: number; limit: number; cost: number }> = {};
  for (const [action, cfg] of Object.entries(AI_COSTS)) {
    const row = rows.find(r => r.action === action);
    usage[action] = {
      count: Number(row?.count ?? 0),
      tokens: Number(row?.tokens ?? 0),
      limit: cfg.dailyLimit,
      cost: cfg.tokens,
    };
  }
  return usage;
}

async function callAI(prompt: string, maxTokens = 1500): Promise<{ text: string; tokensUsed: number }> {
  // FREE Cloudflare Workers AI
  if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
    throw new AppError(503, 'AI service not configured. Contact administrator.');
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    throw new AppError(502, err?.errors?.[0]?.message ?? `AI API error ${res.status}`);
  }
  const data = await res.json() as any;
  const text = data.result?.response ?? '';
  // Cloudflare doesn't always return token counts, estimate
  const tokensUsed = data.result?.usage?.total_tokens ?? Math.ceil(prompt.length / 4 + text.length / 4);
  return { text, tokensUsed };
}

function parseJson<T>(text: string, fallback: T): T {
  try {
    // Try direct parse first
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    // Extract first JSON object or array from anywhere in the text
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) { try { return JSON.parse(objMatch[0]); } catch {} }
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch {} }
    return fallback;
  }
}

// ── GET /api/ai/credits ────────────────────────────────────────────────────

aiRouter.get('/credits', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const credits = await getOrCreateCredits(clientId);
  res.json({
    total: credits.totalCredits,
    used: credits.usedCredits,
    remaining: credits.totalCredits - credits.usedCredits,
    monthlyLimit: credits.monthlyLimit,
    monthlyUsed: credits.monthlyUsed,
    monthlyRemaining: credits.monthlyLimit - credits.monthlyUsed,
    resetAt: credits.resetAt,
  });
});

// ── GET /api/ai/usage-today ────────────────────────────────────────────────

aiRouter.get('/usage-today', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const [usage, credits] = await Promise.all([
    getDailyUsage(clientId),
    getOrCreateCredits(clientId),
  ]);
  res.json({
    today: usage,
    monthly: {
      used: credits.monthlyUsed,
      limit: credits.monthlyLimit,
      remaining: credits.monthlyLimit - credits.monthlyUsed,
      resetAt: credits.resetAt,
    },
    costs: AI_COSTS,
  });
});

// ── POST /api/ai/generate-blog ─────────────────────────────────────────────

aiRouter.post('/generate-blog', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  await checkDailyLimit(clientId, 'generate-blog');
  await checkAndConsumeCredits(clientId, AI_COSTS['generate-blog'].tokens);

  const { topic, tone = 'professional', keywords = '', niche } = req.body;
  if (!topic) throw new AppError(400, 'topic is required');

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { businessName: true, template: { select: { niche: true } } },
  });
  const resolvedNiche = niche ?? client?.template?.niche ?? 'business';

  const prompt = `You are an expert content writer for a ${resolvedNiche} business.
Write a complete, SEO-optimized blog post for "${client?.businessName}" about: "${topic}"
Tone: ${tone}${keywords ? `\nKeywords to include: ${keywords}` : ''}

You MUST return ONLY a raw JSON object, no explanation, no markdown, no code blocks. Start your response with { and end with }.
The "blocks" array must follow this EXACT structure with these block types: "keypoints", "section", "blockquote", "infobox".
Each section must have real, detailed content — minimum 150 words per section.

{
  "title": "Engaging SEO title (60 chars max)",
  "excerpt": "Compelling meta description (150-160 chars)",
  "leadParagraph": "2-3 sentence intro paragraph that hooks the reader and introduces the topic clearly.",
  "metaTitle": "SEO meta title (60 chars max)",
  "metaDesc": "SEO meta description (150-160 chars)",
  "tags": ["tag1","tag2","tag3"],
  "readTime": "X min read",
  "blocks": [
    {
      "id": "kp-1",
      "type": "keypoints",
      "visible": true,
      "title": "Key Points of This Article",
      "text": "First key point about the topic\\nSecond key point\\nThird key point\\nFourth key point"
    },
    {
      "id": "sec-1",
      "type": "section",
      "visible": true,
      "title": "Section Title 1",
      "text": "Detailed section content with at least 150 words covering this aspect of the topic thoroughly..."
    },
    {
      "id": "sec-2",
      "type": "section",
      "visible": true,
      "title": "Section Title 2",
      "text": "Detailed section content with at least 150 words..."
    },
    {
      "id": "bq-1",
      "type": "blockquote",
      "visible": true,
      "text": "A relevant quote or important statement related to the topic...",
      "attribution": "Source or expert name"
    },
    {
      "id": "sec-3",
      "type": "section",
      "visible": true,
      "title": "Section Title 3",
      "text": "Detailed section content with at least 150 words..."
    },
    {
      "id": "ib-1",
      "type": "infobox",
      "visible": true,
      "text": "Important practical information or warning the reader must know about this topic."
    },
    {
      "id": "sec-4",
      "type": "section",
      "visible": true,
      "title": "Section Title 4",
      "text": "Detailed section content with at least 150 words..."
    },
    {
      "id": "sec-5",
      "type": "section",
      "visible": true,
      "title": "Conclusions and Recommendations",
      "text": "Summary of main points and a clear call to action for the reader..."
    }
  ]
}`;

  const text = await groqChat(prompt, 'llama-3.3-70b-versatile', 4000);
  const tokensUsed = Math.ceil(text.length / 4);
  await consumeCredits(clientId, tokensUsed);
  await logUsage(clientId, 'generate-blog', tokensUsed);

  const blogData = parseJson(text, null);
  if (!blogData) throw new AppError(500, 'Failed to parse AI response. Please try again.');

  const dailyUsage = await getDailyUsage(clientId);
  res.json({ success: true, blog: blogData, creditsUsed: tokensUsed, dailyUsed: dailyUsage['generate-blog'].count, dailyLimit: 2 });
});

// ── POST /api/ai/niche-news ────────────────────────────────────────────────

aiRouter.post('/niche-news', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  await checkDailyLimit(clientId, 'niche-news');

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { template: { select: { niche: true } }, businessName: true },
  });
  const niche = client?.template?.niche ?? 'business';

  // Check cache — return if last fetch < 6h ago
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const cached = await prisma.$queryRaw<any[]>`
    SELECT * FROM news_cache WHERE "clientId"=${clientId} AND "fetchedAt" > ${sixHoursAgo}::timestamptz
    ORDER BY "fetchedAt" DESC LIMIT 8
  `;
  if (cached?.length >= 4) {
    return res.json({ news: cached, fromCache: true });
  }

  await checkAndConsumeCredits(clientId, AI_COSTS['niche-news'].tokens);

  const prompt = `Generate 5 realistic, current-sounding news headlines and summaries for the ${niche} industry.
Make them sound like real industry news from this week. Include practical business insights.

Return ONLY a JSON array (no markdown):
[
  {
    "title": "News headline",
    "summary": "2-3 sentence summary with key insights",
    "source": "Industry source name",
    "url": "#",
    "imageUrl": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400"
  }
]`;

  const text = await groqChat(prompt, 'llama-3.1-8b-instant', 800);
  const tokensUsed = Math.ceil(text.length / 4);
  await consumeCredits(clientId, tokensUsed);
  await logUsage(clientId, 'niche-news', tokensUsed);

  const newsItems = parseJson<any[]>(text, []);

  // Clear old cache and save new
  await prisma.$executeRaw`DELETE FROM news_cache WHERE "clientId"=${clientId}`;
  for (const item of newsItems) {
    await prisma.$executeRaw`
      INSERT INTO news_cache (id, "clientId", niche, title, summary, url, source, "imageUrl", "fetchedAt")
      VALUES (gen_random_uuid()::text, ${clientId}, ${niche}, ${item.title ?? ''}, ${item.summary ?? ''}, ${item.url ?? '#'}, ${item.source ?? ''}, ${item.imageUrl ?? null}, now())
    `;
  }

  const saved = await prisma.$queryRaw<any[]>`
    SELECT * FROM news_cache WHERE "clientId"=${clientId} ORDER BY "fetchedAt" DESC LIMIT 8
  `;
  res.json({ news: saved, fromCache: false, creditsUsed: tokensUsed });
});

// ── POST /api/ai/suggestions ───────────────────────────────────────────────

aiRouter.post('/suggestions', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  await checkDailyLimit(clientId, 'suggestions');
  await checkAndConsumeCredits(clientId, AI_COSTS['suggestions'].tokens);

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      businessName: true,
      template: { select: { niche: true } },
      lastPublishedAt: true,
    },
  });

  const niche = client?.template?.niche ?? 'business';
  const blogCountRows = await prisma.$queryRaw<any[]>`SELECT COUNT(*) as cnt FROM blog_posts WHERE "clientId"=${clientId}`;
  const blogCount = parseInt(blogCountRows?.[0]?.cnt ?? '0');
  const daysSincePublish = client?.lastPublishedAt
    ? Math.floor((Date.now() - new Date(client.lastPublishedAt).getTime()) / 86400000)
    : 999;

  const prompt = `Give 4 specific, actionable growth suggestions for a ${niche} business website.
Context: ${blogCount} blog posts published, last updated ${daysSincePublish} days ago.
Business: ${client?.businessName}

Return ONLY a JSON array (no markdown):
[
  {
    "id": "unique-id",
    "title": "Short action title",
    "description": "1-2 sentence specific advice",
    "priority": "high|medium|low",
    "category": "seo|content|conversion|trust",
    "action": "Short CTA text",
    "route": "/blog|/site|/settings|null"
  }
]`;

  const text = await groqChat(prompt, 'llama-3.1-8b-instant', 600);
  const tokensUsed = Math.ceil(text.length / 4);
  await consumeCredits(clientId, tokensUsed);
  await logUsage(clientId, 'suggestions', tokensUsed);

  const suggestions = parseJson<any[]>(text, []);
  res.json({ suggestions, creditsUsed: tokensUsed });
});
