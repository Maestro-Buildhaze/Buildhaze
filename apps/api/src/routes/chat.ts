import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { groqChat } from '../lib/groq-ai';
import { AppError } from '../middleware/errorHandler';

export const chatRouter = Router();

// ── PUBLIC endpoint — called by chatbot widget on client websites ──
// POST /api/chat/:clientSlug
chatRouter.options('/:clientSlug', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(204);
});
chatRouter.post('/:clientSlug', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
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
    const systemPromptStr = messages[0].content;
    const userMessages = messages.slice(1);
    const fullPrompt = userMessages.map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
    reply = await groqChat(
      `${systemPromptStr}\n\nConversation:\n${fullPrompt}\n\nAssistant:`,
      'llama-3.3-70b-versatile',
      300,
    );
    reply = reply.trim();
  } catch (err) {
    console.error('Groq chat error:', err);
    reply = config.offlineMessage ?? 'Momentan nu pot răspunde. Vă rugăm reveniți mai târziu.';
  }

  const bookingIntent = detectBookingIntent(message) || detectBookingIntent(reply);
  const bookingAction =
    bookingIntent && config.bookingEnabled
      ? { type: 'show_booking', message: 'Puteți face o programare direct aici:' }
      : null;

  // Increment counter + save messages + log AI usage async
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
    prisma.$executeRaw`
      INSERT INTO ai_usage_log (id, "clientId", action, "tokensUsed", "createdAt")
      VALUES (gen_random_uuid()::text, ${client.id}, 'chat', 150, now())
    `,
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

  const lang = config.language === 'ro' ? 'română' : 'English';
  const tone = config.tone === 'professional' ? 'profesional și competent' : config.tone === 'friendly' ? 'prietenos și accesibil' : 'formal și precis';
  const niche = (client as any).template?.niche ?? 'servicii profesionale';

  return `Ești ${escPrompt(config.botName)}, asistentul virtual al firmei "${escPrompt(client.businessName)}", specializată în ${niche}.

LIMBĂ: Răspunde MEREU în ${lang}. Niciodată în altă limbă.
TON: ${tone}. Răspunsuri scurte, clare, maximum 3-4 propoziții.

INFORMAȚII FIRMĂ:
${escPrompt(config.businessInfo ?? `${client.businessName} oferă servicii profesionale de calitate.`)}

${faqText ? `ÎNTREBĂRI FRECVENTE (răspunde exact din acestea când sunt relevante):\n${faqText}\n` : ''}
${config.bookingEnabled ? 'PROGRAMĂRI: Dacă vizitatorii întreabă de programare sau consultație, spune-le că pot face o programare direct în acest chat.\n' : ''}
REGULI STRICTE:
1. Răspunde DOAR la întrebări legate de firma aceasta și serviciile ei
2. NICIODATĂ nu inventa informații juridice, medicale sau financiare — îndrumă spre specialistul firmei
3. Dacă nu știi ceva specific firmei, spune "Pentru detalii exacte, vă rog să contactați direct firma"
4. NU menționa alte firme sau concurenți
5. NU prelungi inutil răspunsurile — fii concis și util
6. Dacă cineva pune o întrebare juridică generală (ex: pedepse, legi), răspunde scurt și corect bazat pe legislația română, dar adaugă că pentru cazul lor specific trebuie să consulte un avocat al firmei`;
}

function escPrompt(s: any): string {
  return String(s ?? '').replace(/`/g, "'").slice(0, 500);
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
