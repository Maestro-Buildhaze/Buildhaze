import { Router } from 'express';
import { z } from 'zod';
import slugify from 'slugify';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const blogRouter: Router = Router();
blogRouter.use(requireAuth);

const postSchema = z.object({
  title: z.string().min(1).max(200),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  coverImage: z.string().url().optional().nullable(),
  isPublished: z.boolean().optional(),
  metaTitle: z.string().optional().nullable(),
  metaDesc: z.string().optional().nullable(),
});

blogRouter.get('/', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const posts = await prisma.blogPost.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, slug: true, excerpt: true,
      coverImage: true, isPublished: true, publishedAt: true,
      createdAt: true, updatedAt: true,
    },
  });
  res.json(posts);
});

blogRouter.get('/:id', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const post = await prisma.blogPost.findFirst({
    where: { id: req.params.id, clientId },
  });
  if (!post) throw new AppError(404, 'Post not found');
  res.json(post);
});

blogRouter.post('/', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const data = postSchema.parse(req.body);

  let slug = slugify(data.title, { lower: true, strict: true });
  const existing = await prisma.blogPost.findUnique({ where: { clientId_slug: { clientId, slug } } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const post = await prisma.blogPost.create({
    data: {
      clientId,
      slug,
      title: data.title,
      excerpt: data.excerpt,
      content: data.content,
      coverImage: data.coverImage ?? null,
      isPublished: data.isPublished ?? false,
      publishedAt: data.isPublished ? new Date() : null,
      metaTitle: data.metaTitle ?? null,
      metaDesc: data.metaDesc ?? null,
    },
  });
  res.status(201).json(post);
});

blogRouter.put('/:id', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const data = postSchema.partial().parse(req.body);

  const existing = await prisma.blogPost.findFirst({ where: { id: req.params.id, clientId } });
  if (!existing) throw new AppError(404, 'Post not found');

  const wasUnpublished = !existing.isPublished && data.isPublished;

  const post = await prisma.blogPost.update({
    where: { id: req.params.id },
    data: {
      ...data,
      publishedAt: wasUnpublished ? new Date() : existing.publishedAt,
    },
  });
  res.json(post);
});

blogRouter.delete('/:id', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const existing = await prisma.blogPost.findFirst({ where: { id: req.params.id, clientId } });
  if (!existing) throw new AppError(404, 'Post not found');
  await prisma.blogPost.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});
