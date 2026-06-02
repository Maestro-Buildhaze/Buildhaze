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

  const langMap: Record<string, string> = {
    ro: 'romana', en: 'English', de: 'Deutsch', fr: 'Francais', es: 'Espanol',
    it: 'Italiano', hu: 'Magyar', pl: 'Polski',
  };
  const lang = langMap[config.language] ?? 'romana';
  const tone = config.tone === 'professional' ? 'profesional si competent' : config.tone === 'friendly' ? 'prietenos si accesibil' : 'formal si precis';
  const niche = escPrompt(config.niche ?? (client as any).template?.niche ?? 'servicii profesionale');
  const country = config.country ?? 'RO';
  const phone = config.phone ? `Telefon: ${escPrompt(config.phone)}` : '';
  const hours = config.workingHours ? `Program: ${escPrompt(config.workingHours)}` : '';

  return `Esti ${escPrompt(config.botName)}, asistentul virtual al firmei "${escPrompt(client.businessName)}", specializata in ${niche}, din ${country}.

LIMBA: Raspunde MEREU in ${lang}. Niciodata in alta limba.
TON: ${tone}. Raspunsuri scurte, clare, maximum 3-4 propozitii.

INFORMATII FIRMA:
${escPrompt(config.businessInfo ?? `${client.businessName} ofera servicii profesionale de calitate.`)}
${phone}
${hours}

${faqText ? `INTREBARI FRECVENTE (raspunde exact din acestea cand sunt relevante):\n${faqText}\n` : ''}
${config.bookingEnabled ? 'PROGRAMARI: Daca vizitatorii intreaba de programare sau consultatie, spune-le ca pot face o programare direct in acest chat.\n' : ''}
REGULI STRICTE:
1. Raspunde DOAR la intrebari legate de firma aceasta si serviciile ei
2. NICIODATA nu inventa informatii juridice, medicale sau financiare - indruma spre specialistul firmei
3. Daca nu stii ceva specific firmei, spune "Pentru detalii exacte, va rog sa contactati direct firma"
4. NU mentiona alte firme sau concurenti
5. NU prelungi inutil raspunsurile - fii concis si util
6. Daca cineva pune o intrebare juridica sau medicala generala, raspunde scurt si corect bazat pe legislatia / practica din ${country}, dar adauga ca pentru cazul lor specific trebuie sa consulte un specialist al firmei`;
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
