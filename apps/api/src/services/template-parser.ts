import * as cheerio from 'cheerio';

export interface ExtractedBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
  bullets: string[];
  tags: string[];
  featured: boolean;
}

/**
 * Extract blog posts from template HTML
 * Looks for elements with data-article-id and data-field attributes
 */
export function extractBlogPostsFromTemplate(html: string): ExtractedBlogPost[] {
  const $ = cheerio.load(html);
  const posts: ExtractedBlogPost[] = [];
  
  // Find all article cards with data-article-id
  $('[data-article-id]').each((_, element) => {
    const $article = $(element);
    const id = $article.attr('data-article-id') || String(posts.length + 1);
    
    // Extract fields using data-field attributes
    const title = $article.find(`[data-field="article-${id}-title"]`).text().trim() ||
                  $article.find('.blog-article-title').text().trim();
    
    const excerpt = $article.find(`[data-field="article-${id}-excerpt"]`).text().trim() ||
                    $article.find('.blog-article-excerpt').text().trim();
    
    const category = $article.find(`[data-field="article-${id}-category"]`).text().trim() ||
                     $article.find('.blog-category').first().text().trim();
    
    const date = $article.find(`[data-field="article-${id}-date"]`).text().trim() ||
                 $article.find('.blog-date').first().text().trim();
    
    const readTime = $article.find(`[data-field="article-${id}-read-time"]`).text().trim() ||
                     $article.find('.blog-reading-time').first().text().trim() || '5 min';
    
    const image = $article.find(`[data-field="article-${id}-image"]`).attr('src') ||
                  $article.find('.blog-article-image').attr('src') || '';
    
    // Extract bullets
    const bullets: string[] = [];
    $article.find(`[data-field="article-${id}-bullets"] li, [data-field="article-${id}-key-points"] li`).each((_, li) => {
      bullets.push($(li).text().trim());
    });
    
    // Extract tags
    const tags: string[] = [];
    $article.find(`[data-field="article-${id}-tags"] .blog-tag, .blog-tag`).each((_, tag) => {
      tags.push($(tag).text().trim());
    });
    
    // Check if featured article
    const featured = $article.closest('.blog-featured, [data-section="featured-article"]').length > 0 ||
                     id === 'featured';
    
    // Generate slug from title
    const slug = generateSlug(title);
    
    posts.push({
      id,
      title: title || `Article ${id}`,
      slug,
      excerpt: excerpt || '',
      content: excerpt || '', // Content will be built separately
      category: category || 'General',
      date: parseDate(date),
      readTime,
      image,
      bullets: bullets.length > 0 ? bullets : [],
      tags: tags.length > 0 ? tags : [],
      featured,
    });
  });
  
  return posts;
}

/**
 * Extract featured article separately
 */
export function extractFeaturedArticle(html: string): ExtractedBlogPost | null {
  const $ = cheerio.load(html);
  
  const $featured = $('[data-section="featured-article"], .blog-featured-card').first();
  if (!$featured.length) return null;
  
  const title = $featured.find('[data-field="featured-title"]').text().trim() ||
                $featured.find('.blog-featured-title').text().trim();
  
  const excerpt = $featured.find('[data-field="featured-excerpt"]').text().trim() ||
                  $featured.find('.blog-featured-excerpt').text().trim();
  
  const category = $featured.find('[data-field="featured-category"]').text().trim() ||
                   $featured.find('.blog-category').first().text().trim();
  
  const date = $featured.find('[data-field="featured-date"]').text().trim() ||
               $featured.find('.blog-date').first().text().trim();
  
  const readTime = $featured.find('[data-field="featured-read-time"]').text().trim() || '15 min';
  
  const image = $featured.find('[data-field="featured-image"]').attr('src') || '';
  
  // Extract key points
  const bullets: string[] = [];
  $featured.find('[data-field="featured-key-points"] li, .blog-key-points-list li').each((_, li) => {
    bullets.push($(li).text().trim());
  });
  
  return {
    id: 'featured',
    title: title || 'Featured Article',
    slug: generateSlug(title),
    excerpt,
    content: excerpt,
    category: category || 'Featured',
    date: parseDate(date),
    readTime,
    image,
    bullets,
    tags: [],
    featured: true,
  };
}

/**
 * Extract blog stats from template
 */
export function extractBlogStats(html: string) {
  const $ = cheerio.load(html);
  
  const totalArticles = $('[data-field="total-articles"]').text().trim() || '0';
  const categories = $('[data-field="categories"]').text().trim() || '0';
  const authors = $('[data-field="authors"]').text().trim() || '0';
  const readers = $('[data-field="monthly-readers"]').text().trim() || '0';
  
  return {
    totalArticles: parseInt(totalArticles) || 0,
    categories: parseInt(categories) || 0,
    authors: parseInt(authors) || 0,
    monthlyReaders: readers,
  };
}

/**
 * Generate URL-friendly slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')     // Replace non-alphanumeric with -
    .replace(/^-+|-+$/g, '')          // Remove leading/trailing -
    .substring(0, 100);                // Limit length
}

/**
 * Parse date string to ISO format
 */
function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  
  // Try to parse Romanian date format (e.g., "30 Mai 2026")
  const months: Record<string, number> = {
    'ianuarie': 0, 'februarie': 1, 'martie': 2, 'aprilie': 3,
    'mai': 4, 'iunie': 5, 'iulie': 6, 'august': 7,
    'septembrie': 8, 'octombrie': 9, 'noiembrie': 10, 'decembrie': 11,
    'ian': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'iun': 5,
    'iul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11,
  };
  
  const match = dateStr.toLowerCase().match(/(\d{1,2})\s+([a-z\.]+)\s+(\d{4})/);
  if (match) {
    const day = parseInt(match[1]);
    const month = months[match[2].replace('.', '')] || 0;
    const year = parseInt(match[3]);
    const date = new Date(year, month, day);
    return date.toISOString();
  }
  
  // Fallback to current date
  return new Date().toISOString();
}
