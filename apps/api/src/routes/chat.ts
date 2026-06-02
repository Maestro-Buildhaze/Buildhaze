import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { cfAIChat } from '../lib/cf-ai';
import { AppError } from '../middleware/errorHandler';

export const chatRouter = Router();

// ── PUBLIC endpoint — called by chatbot widget on client websites ──
// POST /api/chat/:clientSlug
chatRouter.post('/:clientSlug', async (req, res) => {
  const { clientSlug } = req.params;
  const { message, sessionId, history = [] } = req.body as {
    message: string;
    sessionId: string;
    history: { role: string; content: string }[];
  };

  if (!message?.trim()) return res.json({ reply: '' });
  if (!sessionId) throw new AppError(400, 'sessionId required');

  // Per-session rate limit: max 30 messages per day
  const today = new Date(new Date().toISOString().split('T')[0]);
  const sessionMsgCount = await prisma.chatMessage.count({
    where: { sessionId, createdAt: { gte: today } },
  });
  if (sessionMsgCount >= 30) {
    return res.json({ reply: 'Limita de mesaje a fost atinsă. Vă rugăm contactați-ne direct.' });
  }

  const client = await prisma.client.findUnique({
    where: { slug: clientSlug },
    include: { chatbotConfig: true },
  });

  if (!client || !client.chatbotConfig?.enabled) {
    return res.json({ reply: 'Chatbot temporarily unavailable.' });
  }

  // Per-client daily chat limit (200/day keeps CF AI in free tier for 50 clients)
  const todayStr = new Date().toISOString().split('T')[0];
  const chatKey = `chat_msg:${todayStr}`;
  const quotaRec = await prisma.usageQuota.upsert({
    where: { clientId_key: { clientId: client.id, key: chatKey } },
    create: { clientId: client.id, key: chatKey, count: 0 },
    update: {},
  });
  if (quotaRec.count >= 200) {
    return res.json({ reply: client.chatbotConfig.offlineMessage ?? 'Momentan online. Reveniți mai târziu.' });
  }

  const config = client.chatbotConfig;
  const systemPrompt = buildSystemPrompt(client, config);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  let reply: string;
  try {
    reply = await cfAIChat(messages, 400);
  } catch (err) {
    console.error('CF AI chat error:', err);
    reply = config.offlineMessage ?? 'Momentan nu pot răspunde. Vă rugăm reveniți mai târziu.';
  }

  const bookingIntent = detectBookingIntent(message) || detectBookingIntent(reply);
  const bookingAction =
    bookingIntent && config.bookingEnabled
      ? { type: 'show_booking', message: 'Puteți face o programare direct aici:' }
      : null;

  // Increment counter + save messages async
  Promise.all([
    prisma.usageQuota.update({
      where: { clientId_key: { clientId: client.id, key: chatKey } },
      data: { count: { increment: 1 } },
    }),
    prisma.chatMessage.createMany({
      data: [
        { clientId: client.id, sessionId, role: 'user', content: message },
        { clientId: client.id, sessionId, role: 'assistant', content: reply },
      ],
    }),
  ]).catch(console.error);

  return res.json({ reply, bookingAction, botName: config.botName });
});

function buildSystemPrompt(client: any, config: any): string {
  let faqText = '';
  if (config.faq) {
    try {
      const faq = typeof config.faq === 'string' ? JSON.parse(config.faq) : config.faq;
      faqText = (faq as any[]).map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
    } catch { /* ignore */ }
  }

  return `You are ${config.botName}, the AI assistant for ${client.businessName}.

LANGUAGE: Always respond in ${config.language === 'ro' ? 'Romanian' : 'English'}.
TONE: ${config.tone === 'professional' ? 'Professional and helpful' : config.tone === 'friendly' ? 'Friendly and approachable' : 'Formal and precise'}.

ABOUT THIS BUSINESS:
${config.businessInfo ?? `${client.businessName} is a professional service business.`}

${faqText ? `FREQUENTLY ASKED QUESTIONS:\n${faqText}` : ''}

${config.bookingEnabled ? 'BOOKING: You can help visitors schedule appointments. When they ask about booking or appointments, mention you can help them book directly in this chat.' : ''}

IMPORTANT RULES:
1. Only answer questions related to this business and its services
2. If you don't know something specific, say to contact the business directly
3. Never provide specific legal/medical/financial advice — refer to a professional
4. Keep responses concise (2-4 sentences max unless explaining a service)
5. Do NOT mention competitor businesses
6. Always be helpful and guide visitors toward the business's services`;
}

function detectBookingIntent(text: string): boolean {
  const keywords = [
    'programare', 'program', 'rezervare', 'rezerv', 'appointment', 'book', 'schedule',
    'consultatie', 'consult', 'intalnire', 'meeting', 'disponibil', 'cand pot',
    'vreau sa vin', 'as vrea sa', 'pot veni', 'ora libera',
  ];
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

// ── AUTHENTICATED endpoints ──
chatRouter.use('/config', requireAuth);
chatRouter.use('/messages', requireAuth);

// GET /api/chat/config
chatRouter.get('/config', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const config = await prisma.chatbotConfig.findUnique({ where: { clientId } });
  res.json(config ?? {});
});

// PUT /api/chat/config
chatRouter.put('/config', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const {
    enabled, botName, welcomeMessage, tone, language,
    primaryColor, position, businessInfo, faq,
    bookingEnabled, offlineMessage,
  } = req.body;

  const config = await prisma.chatbotConfig.upsert({
    where: { clientId },
    create: {
      clientId,
      enabled: enabled ?? false,
      botName: botName ?? 'Assistant',
      welcomeMessage: welcomeMessage ?? 'Bună ziua! Cu ce vă pot ajuta?',
      tone: tone ?? 'professional',
      language: language ?? 'ro',
      primaryColor: primaryColor ?? '#059669',
      position: position ?? 'bottom-right',
      businessInfo: businessInfo ?? null,
      faq: faq ?? null,
      bookingEnabled: bookingEnabled ?? false,
      offlineMessage: offlineMessage ?? null,
    },
    update: {
      enabled, botName, welcomeMessage, tone, language,
      primaryColor, position, businessInfo, faq,
      bookingEnabled, offlineMessage,
    },
  });
  res.json(config);
});

// GET /api/chat/messages
chatRouter.get('/messages', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { limit = '50', sessionId } = req.query;
  const messages = await prisma.chatMessage.findMany({
    where: { clientId, ...(sessionId ? { sessionId: sessionId as string } : {}) },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit as string),
  });
  res.json(messages);
});

// GET /api/chat/sessions — list unique visitor sessions
chatRouter.get('/sessions', requireAuth, async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const sessions = await prisma.chatMessage.groupBy({
    by: ['sessionId'],
    where: { clientId, role: 'user' },
    _count: { sessionId: true },
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: 'desc' } },
    take: 50,
  });
  res.json(sessions);
});
