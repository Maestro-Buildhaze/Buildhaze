import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const authRouter: Router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const client = await prisma.client.findUnique({ where: { email } });
  if (!client || !client.isActive) throw new AppError(401, 'Invalid credentials');

  const valid = await bcrypt.compare(password, client.passwordHash);
  if (!valid) throw new AppError(401, 'Invalid credentials');

  const token = signToken({ clientId: client.id, email: client.email });

  res.json({
    token,
    client: {
      id: client.id,
      email: client.email,
      businessName: client.businessName,
      slug: client.slug,
      plan: client.plan,
      domain: client.domain,
      lastPublishedAt: client.lastPublishedAt,
    },
  });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
    select: {
      id: true, email: true, businessName: true, slug: true,
      plan: true, domain: true, lastPublishedAt: true, createdAt: true,
      template: { select: { id: true, name: true, slug: true, niche: true } },
    },
  });
  res.json(client);
});

authRouter.post('/change-password', requireAuth, async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { currentPassword, newPassword } = z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8),
  }).parse(req.body);

  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  const valid = await bcrypt.compare(currentPassword, client.passwordHash);
  if (!valid) throw new AppError(400, 'Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.client.update({ where: { id: clientId }, data: { passwordHash } });

  res.json({ success: true });
});
