import { Router } from 'express';
import { z } from 'zod';
import slugify from 'slugify';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const blogRouter: Router = Router();
blogRouter.use(requireAuth);

// Extended schema with all new fields
const postSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  coverImage: z.string().url().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  authorId: z.string().optional().nullable(),
  readTime: z.number().int().min(1).optional(),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  metaTitle: z.string().optional().nullable(),
  metaDesc: z.string().optional().nullable(),
  bullets: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.union([z.array(z.any()), z.record(z.any())]).optional(),
});

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().optional(),
  color: z.string().optional(),
});

const authorSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional().nullable(),
  avatar: z.string().url().optional().nullable(),
  role: z.string().optional(),
  bio: z.string().optional(),
  socialLinks: z.record(z.string()).optional(),
});

// ========== BLOG POSTS ==========

blogRouter.get('/', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { category, author, status, featured, search } = req.query;
  
  const where: any = { clientId };
  
  if (category) where.categoryId = category as string;
  if (author) where.authorId = author as string;
  if (status === 'published') where.isPublished = true;
  if (status === 'draft') where.isPublished = false;
  if (featured === 'true') where.isFeatured = true;
  if (search) {
    where.OR = [
      { title: { contains: search as string, mode: 'insensitive' } },
      { excerpt: { contains: search as string, mode: 'insensitive' } },
      { content: { contains: search as string, mode: 'insensitive' } },
    ];
  }
  
  const posts = await prisma.blogPost.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      category: { select: { id: true, name: true, slug: true, color: true } },
      author: { select: { id: true, name: true, avatar: true, role: true } },
    },
  });
  res.json(posts);
});

blogRouter.get('/:id', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const post = await prisma.blogPost.findFirst({
    where: { id: req.params.id, clientId },
    include: {
      category: true,
      author: true,
    },
  });
  if (!post) throw new AppError(404, 'Post not found');
  res.json(post);
});

blogRouter.post('/', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const data = postSchema.parse(req.body);

  let slug = data.slug || slugify(data.title, { lower: true, strict: true });
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
      categoryId: data.categoryId ?? null,
      authorId: data.authorId ?? null,
      readTime: data.readTime ?? 5,
      isPublished: data.isPublished ?? false,
      isFeatured: data.isFeatured ?? false,
      publishedAt: data.isPublished ? new Date() : null,
      metaTitle: data.metaTitle ?? null,
      metaDesc: data.metaDesc ?? null,
      bullets: data.bullets ?? [],
      tags: data.tags ?? [],
      customFields: data.customFields ?? {},
    },
    include: {
      category: true,
      author: true,
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
    include: {
      category: true,
      author: true,
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

// ========== CATEGORIES ==========

blogRouter.get('/categories/list', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const categories = await prisma.category.findMany({
    where: { clientId },
    include: { _count: { select: { posts: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(categories);
});

blogRouter.post('/categories', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const data = categorySchema.parse(req.body);
  
  let slug = data.slug || slugify(data.name, { lower: true, strict: true });
  const existing = await prisma.category.findUnique({ 
    where: { clientId_slug: { clientId, slug } } 
  });
  if (existing) slug = `${slug}-${Date.now()}`;
  
  const category = await prisma.category.create({
    data: {
      clientId,
      name: data.name,
      slug,
      color: data.color ?? '#c9a962',
    },
  });
  res.status(201).json(category);
});

blogRouter.put('/categories/:id', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const data = categorySchema.partial().parse(req.body);
  
  const existing = await prisma.category.findFirst({ 
    where: { id: req.params.id, clientId } 
  });
  if (!existing) throw new AppError(404, 'Category not found');
  
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data,
  });
  res.json(category);
});

blogRouter.delete('/categories/:id', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const existing = await prisma.category.findFirst({ 
    where: { id: req.params.id, clientId } 
  });
  if (!existing) throw new AppError(404, 'Category not found');
  
  // Check if category has posts
  const postsCount = await prisma.blogPost.count({ 
    where: { categoryId: req.params.id } 
  });
  if (postsCount > 0) {
    throw new AppError(400, 'Cannot delete category with existing posts');
  }
  
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// ========== AUTHORS ==========

blogRouter.get('/authors/list', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const authors = await prisma.author.findMany({
    where: { clientId },
    include: { _count: { select: { posts: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(authors);
});

blogRouter.get('/authors/:id', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const author = await prisma.author.findFirst({
    where: { id: req.params.id, clientId },
    include: {
      posts: {
        where: { isPublished: true },
        select: { id: true, title: true, slug: true, coverImage: true, createdAt: true },
      },
    },
  });
  if (!author) throw new AppError(404, 'Author not found');
  res.json(author);
});

blogRouter.post('/authors', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const data = authorSchema.parse(req.body);
  
  const author = await prisma.author.create({
    data: {
      clientId,
      name: data.name,
      email: data.email,
      avatar: data.avatar,
      role: data.role,
      bio: data.bio,
      socialLinks: data.socialLinks ?? {},
    },
  });
  res.status(201).json(author);
});

blogRouter.put('/authors/:id', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const data = authorSchema.partial().parse(req.body);
  
  const existing = await prisma.author.findFirst({ 
    where: { id: req.params.id, clientId } 
  });
  if (!existing) throw new AppError(404, 'Author not found');
  
  const author = await prisma.author.update({
    where: { id: req.params.id },
    data,
  });
  res.json(author);
});

blogRouter.delete('/authors/:id', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const existing = await prisma.author.findFirst({ 
    where: { id: req.params.id, clientId } 
  });
  if (!existing) throw new AppError(404, 'Author not found');
  
  await prisma.author.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// ========== STATS ==========

blogRouter.get('/stats/overview', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  
  const [totalPosts, publishedPosts, draftPosts, totalCategories, totalAuthors, featuredPosts] = await Promise.all([
    prisma.blogPost.count({ where: { clientId } }),
    prisma.blogPost.count({ where: { clientId, isPublished: true } }),
    prisma.blogPost.count({ where: { clientId, isPublished: false } }),
    prisma.category.count({ where: { clientId } }),
    prisma.author.count({ where: { clientId } }),
    prisma.blogPost.count({ where: { clientId, isFeatured: true } }),
  ]);
  
  res.json({
    totalPosts,
    publishedPosts,
    draftPosts,
    totalCategories,
    totalAuthors,
    featuredPosts,
  });
});

// ========== BULK OPERATIONS ==========

blogRouter.post('/bulk/publish', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { ids } = z.object({ ids: z.array(z.string()) }).parse(req.body);
  
  await prisma.blogPost.updateMany({
    where: { id: { in: ids }, clientId },
    data: { isPublished: true, publishedAt: new Date() },
  });
  
  res.json({ success: true, count: ids.length });
});

blogRouter.post('/bulk/unpublish', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { ids } = z.object({ ids: z.array(z.string()) }).parse(req.body);
  
  await prisma.blogPost.updateMany({
    where: { id: { in: ids }, clientId },
    data: { isPublished: false, publishedAt: null },
  });
  
  res.json({ success: true, count: ids.length });
});

blogRouter.post('/bulk/delete', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { ids } = z.object({ ids: z.array(z.string()) }).parse(req.body);
  
  await prisma.blogPost.deleteMany({
    where: { id: { in: ids }, clientId },
  });
  
  res.json({ success: true, count: ids.length });
});
