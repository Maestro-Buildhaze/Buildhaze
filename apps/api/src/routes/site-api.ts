import { Router } from 'express';
import { prisma } from '../lib/prisma';

const siteApiRouter = Router();

// Get client by domain or slug
async function getClientByIdentifier(domainOrSlug: string) {
  // Try exact domain match first
  const domainResult = await prisma.$queryRaw<{id: string}[]>`
    SELECT id FROM clients WHERE domain = ${domainOrSlug} AND "isActive" = true LIMIT 1
  `;
  
  if (domainResult && domainResult.length > 0) {
    return domainResult[0];
  }
  
  // Try by slug
  const slugResult = await prisma.$queryRaw<{id: string}[]>`
    SELECT id FROM clients WHERE slug = ${domainOrSlug} AND "isActive" = true LIMIT 1
  `;
  
  if (slugResult && slugResult.length > 0) {
    return slugResult[0];
  }
  
  // Try matching subdomain (e.g., waddaw-cmptvd-c4r4ux.pages.dev -> match client slug)
  // Extract subdomain before .pages.dev or similar
  if (domainOrSlug.includes('.pages.dev') || domainOrSlug.includes('.onrender.com')) {
    const subdomain = domainOrSlug.split('.')[0];
    const subdomainResult = await prisma.$queryRaw<{id: string}[]>`
      SELECT id FROM clients WHERE slug = ${subdomain} AND "isActive" = true LIMIT 1
    `;
    
    if (subdomainResult && subdomainResult.length > 0) {
      return subdomainResult[0];
    }
  }
  
  return null;
}

// ========== PUBLIC BLOG API ==========

// List published blog posts for a site
siteApiRouter.get('/:domainOrSlug/blog', async (req, res) => {
  try {
    const { domainOrSlug } = req.params;
    const { category, page = '1', limit = '10' } = req.query;
    
    const client = await getClientByIdentifier(domainOrSlug);
    
    if (!client) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);
    
    // Build conditions based on category filter
    let posts;
    let total;
    
    if (category) {
      // With category filter
      posts = await prisma.$queryRaw<any[]>`
        SELECT 
          bp.id, bp.title, bp.slug, bp.excerpt, bp.content, 
          bp."coverImage", bp.tags, bp.bullets, bp."customFields",
          bp."isFeatured", bp."readTime", bp."publishedAt",
          bp."metaTitle", bp."metaDesc",
          c.name as "categoryName", c.slug as "categorySlug", c.color as "categoryColor",
          a.name as "authorName", a.email as "authorEmail", a.avatar as "authorAvatar"
        FROM blog_posts bp
        LEFT JOIN categories c ON bp."categoryId" = c.id
        LEFT JOIN authors a ON bp."authorId" = a.id
        WHERE bp."clientId" = ${client.id} AND bp."isPublished" = true AND bp."categorySlug" = ${category as string}
        ORDER BY bp."publishedAt" DESC
        LIMIT ${take} OFFSET ${skip}
      `;
      
      const countResult = await prisma.$queryRaw<{count: number}[]>`
        SELECT COUNT(*) as count FROM blog_posts 
        WHERE "clientId" = ${client.id} AND "isPublished" = true AND "categorySlug" = ${category as string}
      `;
      total = Number(countResult[0]?.count || 0);
    } else {
      // Without category filter
      posts = await prisma.$queryRaw<any[]>`
        SELECT 
          bp.id, bp.title, bp.slug, bp.excerpt, bp.content, 
          bp."coverImage", bp.tags, bp.bullets, bp."customFields",
          bp."isFeatured", bp."readTime", bp."publishedAt",
          bp."metaTitle", bp."metaDesc",
          c.name as "categoryName", c.slug as "categorySlug", c.color as "categoryColor",
          a.name as "authorName", a.email as "authorEmail", a.avatar as "authorAvatar"
        FROM blog_posts bp
        LEFT JOIN categories c ON bp."categoryId" = c.id
        LEFT JOIN authors a ON bp."authorId" = a.id
        WHERE bp."clientId" = ${client.id} AND bp."isPublished" = true
        ORDER BY bp."publishedAt" DESC
        LIMIT ${take} OFFSET ${skip}
      `;
      
      const countResult = await prisma.$queryRaw<{count: number}[]>`
        SELECT COUNT(*) as count FROM blog_posts 
        WHERE "clientId" = ${client.id} AND "isPublished" = true
      `;
      total = Number(countResult[0]?.count || 0);
    }
    
    res.json({
      posts: posts.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        content: p.content,
        coverImage: p.coverImage,
        category: p.categorySlug ? {
          name: p.categoryName,
          slug: p.categorySlug,
          color: p.categoryColor,
        } : null,
        author: p.authorName ? {
          name: p.authorName,
          email: p.authorEmail,
          avatar: p.authorAvatar,
        } : null,
        tags: p.tags || [],
        bullets: p.bullets || [],
        customFields: p.customFields || {},
        isFeatured: p.isFeatured,
        readTime: p.readTime,
        publishedAt: p.publishedAt,
        metaTitle: p.metaTitle,
        metaDesc: p.metaDesc,
      })),
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err: any) {
    console.error('Error fetching blog posts:', err);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

// Get single blog post by slug
siteApiRouter.get('/:domainOrSlug/blog/:slug', async (req, res) => {
  try {
    const { domainOrSlug, slug } = req.params;
    
    const client = await getClientByIdentifier(domainOrSlug);
    
    if (!client) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    // Get single post
    const posts = await prisma.$queryRaw<any[]>`
      SELECT 
        bp.id, bp.title, bp.slug, bp.excerpt, bp.content, 
        bp."coverImage", bp.tags, bp.bullets, bp."customFields",
        bp."isFeatured", bp."readTime", bp."publishedAt",
        bp."metaTitle", bp."metaDesc",
        c.name as "categoryName", c.slug as "categorySlug", c.color as "categoryColor",
        a.name as "authorName", a.email as "authorEmail", a.avatar as "authorAvatar"
      FROM blog_posts bp
      LEFT JOIN categories c ON bp."categoryId" = c.id
      LEFT JOIN authors a ON bp."authorId" = a.id
      WHERE bp."clientId" = ${client.id} AND bp.slug = ${slug} AND bp."isPublished" = true
      LIMIT 1
    `;
    
    if (!posts || posts.length === 0) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    
    const post = posts[0];
    
    // Get related posts (same category or similar)
    const relatedPosts = await prisma.$queryRaw<any[]>`
      SELECT 
        bp.id, bp.title, bp.slug, bp.excerpt,
        bp."coverImage", bp."publishedAt", bp."readTime",
        c.name as "categoryName"
      FROM blog_posts bp
      LEFT JOIN categories c ON bp."categoryId" = c.id
      WHERE bp."clientId" = ${client.id} 
        AND bp."isPublished" = true 
        AND bp.id != ${post.id}
      ORDER BY bp."publishedAt" DESC
      LIMIT 3
    `;
    
    res.json({
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: post.coverImage,
        category: post.categorySlug ? {
          name: post.categoryName,
          slug: post.categorySlug,
          color: post.categoryColor,
        } : null,
        author: post.authorName ? {
          name: post.authorName,
          email: post.authorEmail,
          avatar: post.authorAvatar,
        } : null,
        tags: post.tags || [],
        bullets: post.bullets || [],
        customFields: post.customFields || {},
        isFeatured: post.isFeatured,
        readTime: post.readTime,
        publishedAt: post.publishedAt,
        metaTitle: post.metaTitle,
        metaDesc: post.metaDesc,
      },
      relatedPosts: relatedPosts.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        coverImage: p.coverImage,
        publishedAt: p.publishedAt,
        readTime: p.readTime,
        category: p.categoryName,
      })),
    });
  } catch (err: any) {
    console.error('Error fetching blog post:', err);
    res.status(500).json({ error: 'Failed to fetch blog post' });
  }
});

// Get blog categories for a site
siteApiRouter.get('/:domainOrSlug/blog/categories', async (req, res) => {
  try {
    const { domainOrSlug } = req.params;
    
    const client = await getClientByIdentifier(domainOrSlug);
    
    if (!client) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    const categories = await prisma.$queryRaw<any[]>`
      SELECT 
        c.id, c.name, c.slug, c.description, c.color,
        COUNT(bp.id) as "postCount"
      FROM categories c
      LEFT JOIN blog_posts bp ON c.id = bp."categoryId" AND bp."isPublished" = true
      WHERE c."clientId" = ${client.id}
      GROUP BY c.id, c.name, c.slug, c.description, c.color
      ORDER BY c.name ASC
    `;
    
    res.json({ 
      categories: categories.map(c => ({
        ...c,
        postCount: Number(c.postCount),
      }))
    });
  } catch (err: any) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get featured posts
siteApiRouter.get('/:domainOrSlug/blog/featured', async (req, res) => {
  try {
    const { domainOrSlug } = req.params;
    const { limit = '3' } = req.query;
    
    const client = await getClientByIdentifier(domainOrSlug);
    
    if (!client) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    const take = parseInt(limit as string);
    
    const posts = await prisma.$queryRaw<any[]>`
      SELECT 
        bp.id, bp.title, bp.slug, bp.excerpt,
        bp."coverImage", bp."publishedAt", bp."readTime",
        c.name as "categoryName", c.slug as "categorySlug", c.color as "categoryColor"
      FROM blog_posts bp
      LEFT JOIN categories c ON bp."categoryId" = c.id
      WHERE bp."clientId" = ${client.id} 
        AND bp."isPublished" = true 
        AND bp."isFeatured" = true
      ORDER BY bp."publishedAt" DESC
      LIMIT ${take}
    `;
    
    res.json({ 
      posts: posts.map(p => ({
        ...p,
        category: p.categorySlug ? {
          name: p.categoryName,
          slug: p.categorySlug,
          color: p.categoryColor,
        } : null,
      }))
    });
  } catch (err: any) {
    console.error('Error fetching featured posts:', err);
    res.status(500).json({ error: 'Failed to fetch featured posts' });
  }
});

export default siteApiRouter;
