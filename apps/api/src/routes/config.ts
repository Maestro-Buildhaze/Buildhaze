import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

export const configRouter: Router = Router();
configRouter.use(requireAuth);

configRouter.get('/', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const configs = await prisma.siteConfig.findMany({ where: { clientId } });
  const result: Record<string, string> = {};
  for (const c of configs) result[c.key] = c.value;
  res.json(result);
});

const upsertSchema = z.record(z.string(), z.string());

configRouter.put('/', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const data = upsertSchema.parse(req.body);

  await prisma.$transaction(
    Object.entries(data).map(([key, value]) =>
      prisma.siteConfig.upsert({
        where: { clientId_key: { clientId, key } },
        create: { clientId, key, value },
        update: { value },
      })
    )
  );

  res.json({ success: true, updated: Object.keys(data).length });
});

configRouter.delete('/:key', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  await prisma.siteConfig.deleteMany({ where: { clientId, key: req.params.key } });
  res.json({ success: true });
});
