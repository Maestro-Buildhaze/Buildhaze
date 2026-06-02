import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const bookingsRouter = Router();

// ── PUBLIC endpoints (called from booking page on the website) ────

// GET /api/bookings/public/:clientSlug/services
bookingsRouter.get('/public/:clientSlug/services', async (req, res) => {
  const client = await prisma.client.findUnique({ where: { slug: req.params.clientSlug } });
  if (!client) throw new AppError(404, 'Not found');

  const services = await prisma.bookingService.findMany({
    where: { clientId: client.id, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  res.json(services);
});

// GET /api/bookings/public/:clientSlug/slots?date=2026-06-15&serviceId=xxx
bookingsRouter.get('/public/:clientSlug/slots', async (req, res) => {
  const { date, serviceId } = req.query as { date: string; serviceId?: string };
  const client = await prisma.client.findUnique({ where: { slug: req.params.clientSlug } });
  if (!client) throw new AppError(404, 'Not found');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AppError(400, 'Invalid date');

  const dayOfWeek = new Date(date + 'T12:00:00').getDay();
  const availability = await prisma.bookingAvailability.findFirst({
    where: { clientId: client.id, dayOfWeek, isActive: true },
  });

  if (!availability) {
    return res.json({ slots: [], message: 'Nu există disponibilitate pentru această zi.' });
  }

  const service = serviceId
    ? await prisma.bookingService.findFirst({ where: { id: serviceId, clientId: client.id } })
    : null;
  const duration = service?.duration ?? 60;

  const slots: string[] = [];
  const [startH, startM] = availability.startTime.split(':').map(Number);
  const [endH, endM] = availability.endTime.split(':').map(Number);
  let current = startH * 60 + startM;
  const end = endH * 60 + endM;

  while (current + duration <= end) {
    const h = Math.floor(current / 60).toString().padStart(2, '0');
    const m = (current % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
    current += duration;
  }

  const maxPerSlot = (availability as any).maxClientsPerSlot ?? 1;

  const existingBookings = await prisma.booking.findMany({
    where: { clientId: client.id, date, status: { notIn: ['cancelled'] } },
    select: { time: true },
  });

  // Count how many bookings per slot
  const slotCounts: Record<string, number> = {};
  for (const b of existingBookings) {
    slotCounts[b.time] = (slotCounts[b.time] ?? 0) + 1;
  }

  const available = slots.filter(s => (slotCounts[s] ?? 0) < maxPerSlot);
  const slotsWithCount = slots.map(s => ({
    time: s,
    available: (slotCounts[s] ?? 0) < maxPerSlot,
    spotsLeft: maxPerSlot - (slotCounts[s] ?? 0),
    maxPerSlot,
  }));

  return res.json({ slots: available, slotsWithCount, date, availability });
});

// POST /api/bookings/public/:clientSlug — customer makes a booking
bookingsRouter.post('/public/:clientSlug', async (req, res) => {
  const { clientSlug } = req.params;
  const { customerName, customerEmail, customerPhone, date, time, serviceId, notes } = req.body;

  if (!customerName || !customerEmail || !date || !time) {
    throw new AppError(400, 'Name, email, date, and time are required');
  }

  const client = await prisma.client.findUnique({ where: { slug: clientSlug } });
  if (!client) throw new AppError(404, 'Not found');

  const service = serviceId
    ? await prisma.bookingService.findFirst({ where: { id: serviceId, clientId: client.id } })
    : null;

  // Check slot capacity
  const dayOfWeekForBook = new Date(date + 'T12:00:00').getDay();
  const availForBook = await prisma.bookingAvailability.findFirst({
    where: { clientId: client.id, dayOfWeek: dayOfWeekForBook, isActive: true },
  });
  const maxPerSlotBook = (availForBook as any)?.maxClientsPerSlot ?? 1;
  const existingCount = await prisma.booking.count({
    where: { clientId: client.id, date, time, status: { notIn: ['cancelled'] } },
  });
  if (existingCount >= maxPerSlotBook) throw new AppError(409, 'This time slot is no longer available');

  const booking = await prisma.booking.create({
    data: {
      clientId: client.id,
      serviceId: serviceId ?? null,
      customerName,
      customerEmail,
      customerPhone: customerPhone ?? null,
      date,
      time,
      durationMin: service?.duration ?? 60,
      notes: notes ?? null,
      status: 'pending',
    },
  });

  res.json({ success: true, booking: { id: booking.id, date, time, status: 'pending' } });
});

// ── AUTHENTICATED endpoints ──────────────────────────────────────
bookingsRouter.use(requireAuth);

// GET /api/bookings
bookingsRouter.get('/', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { status, from, to } = req.query;
  const bookings = await prisma.booking.findMany({
    where: {
      clientId,
      ...(status ? { status: status as string } : {}),
      ...(from ? { date: { gte: from as string } } : {}),
      ...(to ? { date: { lte: to as string } } : {}),
    },
    include: { service: true },
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  });
  res.json(bookings);
});

// GET /api/bookings/stats
bookingsRouter.get('/stats', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const today = new Date().toISOString().split('T')[0];
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStr = weekStart.toISOString().split('T')[0];

  const [todayCount, weekCount, pending, confirmed] = await Promise.all([
    prisma.booking.count({ where: { clientId, date: today } }),
    prisma.booking.count({ where: { clientId, date: { gte: weekStr } } }),
    prisma.booking.count({ where: { clientId, status: 'pending' } }),
    prisma.booking.count({ where: { clientId, status: 'confirmed' } }),
  ]);

  res.json({ today: todayCount, thisWeek: weekCount, pending, confirmed });
});

// PUT /api/bookings/:id/status
bookingsRouter.put('/:id/status', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { status, cancelReason } = req.body;
  const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
  if (!validStatuses.includes(status)) throw new AppError(400, 'Invalid status');

  const booking = await prisma.booking.findFirst({ where: { id: req.params.id, clientId } });
  if (!booking) throw new AppError(404, 'Booking not found');

  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: { status, cancelReason: cancelReason ?? null },
    include: { service: true },
  });
  res.json(updated);
});

// ── SERVICES CRUD ────────────────────────────────────────────────

// GET /api/bookings/services
bookingsRouter.get('/services', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const services = await prisma.bookingService.findMany({
    where: { clientId },
    orderBy: { sortOrder: 'asc' },
  });
  res.json(services);
});

// POST /api/bookings/services
bookingsRouter.post('/services', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { name, description, duration, price, currency, color } = req.body;
  if (!name || !duration) throw new AppError(400, 'name and duration required');

  const count = await prisma.bookingService.count({ where: { clientId } });
  const service = await prisma.bookingService.create({
    data: {
      clientId, name, description: description ?? null,
      duration: Number(duration), price: price ?? null,
      currency: currency ?? 'RON', color: color ?? '#059669',
      sortOrder: count,
    },
  });
  res.json(service);
});

// PUT /api/bookings/services/:id
bookingsRouter.put('/services/:id', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { name, description, duration, price, isActive, color } = req.body;
  const service = await prisma.bookingService.findFirst({ where: { id: req.params.id, clientId } });
  if (!service) throw new AppError(404, 'Service not found');
  const updated = await prisma.bookingService.update({
    where: { id: req.params.id },
    data: { name, description, duration: duration ? Number(duration) : undefined, price, isActive, color },
  });
  res.json(updated);
});

// DELETE /api/bookings/services/:id
bookingsRouter.delete('/services/:id', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const service = await prisma.bookingService.findFirst({ where: { id: req.params.id, clientId } });
  if (!service) throw new AppError(404, 'Not found');
  await prisma.bookingService.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// ── AVAILABILITY ─────────────────────────────────────────────────

// GET /api/bookings/availability
bookingsRouter.get('/availability', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const availability = await prisma.bookingAvailability.findMany({
    where: { clientId },
    orderBy: { dayOfWeek: 'asc' },
  });
  res.json(availability);
});

// PUT /api/bookings/availability
bookingsRouter.put('/availability', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { days } = req.body as {
    days: { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean; maxClientsPerSlot?: number; bufferMinutes?: number }[];
  };

  for (const day of days) {
    await prisma.$executeRaw`
      INSERT INTO booking_availability (id, "clientId", "dayOfWeek", "startTime", "endTime", "isActive", "maxClientsPerSlot", "bufferMinutes")
      VALUES (gen_random_uuid()::text, ${clientId}, ${day.dayOfWeek}, ${day.startTime}, ${day.endTime}, ${day.isActive}, ${day.maxClientsPerSlot ?? 1}, ${day.bufferMinutes ?? 0})
      ON CONFLICT ("clientId", "dayOfWeek") DO UPDATE
        SET "startTime" = EXCLUDED."startTime",
            "endTime" = EXCLUDED."endTime",
            "isActive" = EXCLUDED."isActive",
            "maxClientsPerSlot" = EXCLUDED."maxClientsPerSlot",
            "bufferMinutes" = EXCLUDED."bufferMinutes"
    `;
  }
  const updated = await prisma.$queryRaw<any[]>`
    SELECT * FROM booking_availability WHERE "clientId" = ${clientId} ORDER BY "dayOfWeek" ASC
  `;
  res.json(updated);
});

// GET /api/bookings/settings
bookingsRouter.get('/settings', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const rows = await prisma.$queryRaw<any[]>`
    SELECT * FROM booking_settings WHERE "clientId" = ${clientId} LIMIT 1
  `;
  res.json(rows[0] ?? {});
});

// PUT /api/bookings/settings
bookingsRouter.put('/settings', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const {
    bookingEnabled, advanceBookingDays, minNoticeHours,
    confirmationEmail, reminderHours, autoConfirm,
    cancelDeadlineHours, bookingPageTitle, bookingPageSubtitle, thankYouMessage,
  } = req.body;

  await prisma.$executeRaw`
    INSERT INTO booking_settings (
      id, "clientId", "bookingEnabled", "advanceBookingDays", "minNoticeHours",
      "confirmationEmail", "reminderHours", "autoConfirm",
      "cancelDeadlineHours", "bookingPageTitle", "bookingPageSubtitle", "thankYouMessage", "updatedAt"
    ) VALUES (
      gen_random_uuid()::text, ${clientId},
      ${bookingEnabled ?? true}, ${advanceBookingDays ?? 30}, ${minNoticeHours ?? 2},
      ${confirmationEmail ?? true}, ${reminderHours ?? 24}, ${autoConfirm ?? false},
      ${cancelDeadlineHours ?? 24}, ${bookingPageTitle ?? 'Programare Online'},
      ${bookingPageSubtitle ?? null}, ${thankYouMessage ?? 'Mulțumim! Programarea a fost înregistrată.'}, now()
    )
    ON CONFLICT ("clientId") DO UPDATE SET
      "bookingEnabled" = EXCLUDED."bookingEnabled",
      "advanceBookingDays" = EXCLUDED."advanceBookingDays",
      "minNoticeHours" = EXCLUDED."minNoticeHours",
      "confirmationEmail" = EXCLUDED."confirmationEmail",
      "reminderHours" = EXCLUDED."reminderHours",
      "autoConfirm" = EXCLUDED."autoConfirm",
      "cancelDeadlineHours" = EXCLUDED."cancelDeadlineHours",
      "bookingPageTitle" = EXCLUDED."bookingPageTitle",
      "bookingPageSubtitle" = EXCLUDED."bookingPageSubtitle",
      "thankYouMessage" = EXCLUDED."thankYouMessage",
      "updatedAt" = now()
  `;
  const rows = await prisma.$queryRaw<any[]>`
    SELECT * FROM booking_settings WHERE "clientId" = ${clientId} LIMIT 1
  `;
  res.json(rows[0]);
});

// GET /api/bookings/calendar-feed.ics — iCal export
bookingsRouter.get('/calendar-feed.ics', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { businessName: true },
  });
  const bookings = await prisma.booking.findMany({
    where: { clientId, status: { notIn: ['cancelled'] } },
    include: { service: true },
    orderBy: { date: 'asc' },
  });

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Buildhaze//${client?.businessName ?? 'CMS'}//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...bookings.flatMap(b => {
      const start = b.date.replace(/-/g, '') + 'T' + b.time.replace(':', '') + '00';
      const endMin = parseInt(b.time.split(':')[0]) * 60 + parseInt(b.time.split(':')[1]) + b.durationMin;
      const endH = Math.floor(endMin / 60).toString().padStart(2, '0');
      const endM = (endMin % 60).toString().padStart(2, '0');
      const endStr = b.date.replace(/-/g, '') + 'T' + endH + endM + '00';
      return [
        'BEGIN:VEVENT',
        `DTSTART:${start}`,
        `DTEND:${endStr}`,
        `SUMMARY:${(b.service?.name ?? 'Programare')} - ${b.customerName}`,
        `DESCRIPTION:${b.customerEmail}${b.customerPhone ? ' / ' + b.customerPhone : ''}${b.notes ? '\\n' + b.notes : ''}`,
        `STATUS:${b.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`,
        `UID:${b.id}@buildhaze`,
        'END:VEVENT',
      ];
    }),
    'END:VCALENDAR',
  ];

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="bookings.ics"');
  res.send(lines.join('\r\n'));
});
