import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const pagesRouter: Router = Router();
pagesRouter.use(requireAuth);

const sectionSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.record(z.unknown()),
  visible: z.boolean().optional(),
});

const pageSchema = z.object({
  title: z.string().min(1),
  sections: z.array(sectionSchema).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

pagesRouter.get('/', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const pages = await prisma.page.findMany({
    where: { clientId },
    orderBy: { sortOrder: 'asc' },
  });
  res.json(pages);
});

pagesRouter.get('/:slug', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const page = await prisma.page.findFirst({ where: { clientId, slug: req.params.slug } });
  if (!page) throw new AppError(404, 'Page not found');
  res.json(page);
});

pagesRouter.put('/:slug', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const data = pageSchema.partial().parse(req.body);

  const page = await prisma.page.findFirst({ where: { clientId, slug: req.params.slug } });
  if (!page) throw new AppError(404, 'Page not found');

  const updated = await prisma.page.update({
    where: { id: page.id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.sections !== undefined && { sections: data.sections as unknown[] }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
  });
  res.json(updated);
});
