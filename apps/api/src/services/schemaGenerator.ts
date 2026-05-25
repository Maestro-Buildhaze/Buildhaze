/**
 * Schema Generator Service - Full Content Structure Support
 * 
 * Generates complete CMS schema with pages and sections for any website type.
 */

import { prisma } from '../lib/prisma';

// Standard section definitions with editable fields
const STANDARD_SECTIONS = {
  hero: {
    name: 'Hero Section',
    icon: 'image',
    fields: [
      { id: 'badge', label: 'Badge Text', type: 'text', default: 'New Feature' },
      { id: 'title', label: 'Title', type: 'text', default: 'Welcome to Our Site' },
      { id: 'subtitle', label: 'Subtitle', type: 'text', default: '' },
      { id: 'description', label: 'Description', type: 'textarea', default: 'We offer the best services for you.' },
      { id: 'backgroundImage', label: 'Background Image', type: 'image', default: '' },
      { id: 'sideImage', label: 'Side Image', type: 'image', default: '' },
      { id: 'primaryButtonLabel', label: 'Primary Button', type: 'text', default: 'Get Started' },
      { id: 'primaryButtonUrl', label: 'Primary Button URL', type: 'text', default: '/contact' },
      { id: 'secondaryButtonLabel', label: 'Secondary Button', type: 'text', default: 'Learn More' },
      { id: 'secondaryButtonUrl', label: 'Secondary Button URL', type: 'text', default: '/about' },
    ]
  },
  services: {
    name: 'Services Section',
    icon: 'grid',
    fields: [
      { id: 'sectionTitle', label: 'Section Title', type: 'text', default: 'Our Services' },
      { id: 'sectionSubtitle', label: 'Section Subtitle', type: 'text', default: 'What we offer' },
      { id: 'services', label: 'Services List', type: 'repeater', default: [],
        repeaterFields: [
          { id: 'icon', label: 'Icon', type: 'text' },
          { id: 'title', label: 'Title', type: 'text' },
          { id: 'description', label: 'Description', type: 'textarea' },
          { id: 'image', label: 'Image', type: 'image' },
          { id: 'link', label: 'Link URL', type: 'text' },
        ]
      }
    ]
  },
  about: {
    name: 'About Section',
    icon: 'info',
    fields: [
      { id: 'sectionTitle', label: 'Section Title', type: 'text', default: 'About Us' },
      { id: 'mainText', label: 'Main Text', type: 'textarea', default: 'We are a company dedicated to excellence.' },
      { id: 'secondaryText', label: 'Secondary Text', type: 'textarea', default: '' },
      { id: 'image', label: 'Image', type: 'image', default: '' },
      { id: 'stats', label: 'Statistics', type: 'repeater', default: [],
        repeaterFields: [
          { id: 'number', label: 'Number', type: 'text' },
          { id: 'label', label: 'Label', type: 'text' },
        ]
      }
    ]
  },
  team: {
    name: 'Team Section',
    icon: 'users',
    fields: [
      { id: 'sectionTitle', label: 'Section Title', type: 'text', default: 'Our Team' },
      { id: 'sectionSubtitle', label: 'Section Subtitle', type: 'text', default: 'Meet our experts' },
      { id: 'members', label: 'Team Members', type: 'repeater', default: [],
        repeaterFields: [
          { id: 'name', label: 'Name', type: 'text' },
          { id: 'role', label: 'Role', type: 'text' },
          { id: 'bio', label: 'Bio', type: 'textarea' },
          { id: 'image', label: 'Photo', type: 'image' },
          { id: 'linkedin', label: 'LinkedIn', type: 'text' },
          { id: 'twitter', label: 'Twitter', type: 'text' },
        ]
      }
    ]
  },
  testimonials: {
    name: 'Testimonials Section',
    icon: 'message-square',
    fields: [
      { id: 'sectionTitle', label: 'Section Title', type: 'text', default: 'What Clients Say' },
      { id: 'testimonials', label: 'Testimonials', type: 'repeater', default: [],
        repeaterFields: [
          { id: 'quote', label: 'Quote', type: 'textarea' },
          { id: 'author', label: 'Author Name', type: 'text' },
          { id: 'role', label: 'Author Role', type: 'text' },
          { id: 'rating', label: 'Rating (1-5)', type: 'number' },
          { id: 'image', label: 'Author Photo', type: 'image' },
        ]
      }
    ]
  },
  gallery: {
    name: 'Gallery/Portfolio',
    icon: 'image',
    fields: [
      { id: 'sectionTitle', label: 'Section Title', type: 'text', default: 'Our Work' },
      { id: 'items', label: 'Gallery Items', type: 'repeater', default: [],
        repeaterFields: [
          { id: 'title', label: 'Title', type: 'text' },
          { id: 'category', label: 'Category', type: 'text' },
          { id: 'image', label: 'Image', type: 'image' },
          { id: 'description', label: 'Description', type: 'textarea' },
          { id: 'link', label: 'Link', type: 'text' },
        ]
      }
    ]
  },
  blog: {
    name: 'Blog/News Section',
    icon: 'file-text',
    fields: [
      { id: 'sectionTitle', label: 'Section Title', type: 'text', default: 'Latest News' },
      { id: 'posts', label: 'Blog Posts', type: 'repeater', default: [],
        repeaterFields: [
          { id: 'title', label: 'Title', type: 'text' },
          { id: 'excerpt', label: 'Excerpt', type: 'textarea' },
          { id: 'content', label: 'Content', type: 'textarea' },
          { id: 'image', label: 'Featured Image', type: 'image' },
          { id: 'date', label: 'Date', type: 'date' },
          { id: 'author', label: 'Author', type: 'text' },
          { id: 'category', label: 'Category', type: 'text' },
        ]
      }
    ]
  },
  contact: {
    name: 'Contact Section',
    icon: 'phone',
    fields: [
      { id: 'sectionTitle', label: 'Section Title', type: 'text', default: 'Get in Touch' },
      { id: 'description', label: 'Description', type: 'textarea', default: 'Contact us for more information.' },
      { id: 'phone', label: 'Phone', type: 'text', default: '' },
      { id: 'email', label: 'Email', type: 'text', default: '' },
      { id: 'address', label: 'Address', type: 'textarea', default: '' },
      { id: 'hours', label: 'Working Hours', type: 'text', default: '' },
      { id: 'mapUrl', label: 'Google Maps URL', type: 'text', default: '' },
    ]
  },
  cta: {
    name: 'Call to Action',
    icon: 'alert-circle',
    fields: [
      { id: 'title', label: 'Title', type: 'text', default: 'Ready to get started?' },
      { id: 'subtitle', label: 'Subtitle', type: 'text', default: 'Contact us today' },
      { id: 'buttonLabel', label: 'Button Label', type: 'text', default: 'Contact Now' },
      { id: 'buttonUrl', label: 'Button URL', type: 'text', default: '/contact' },
      { id: 'background', label: 'Background Image', type: 'image', default: '' },
    ]
  },
  features: {
    name: 'Features Section',
    icon: 'list',
    fields: [
      { id: 'sectionTitle', label: 'Section Title', type: 'text', default: 'Why Choose Us' },
      { id: 'features', label: 'Features', type: 'repeater', default: [],
        repeaterFields: [
          { id: 'icon', label: 'Icon', type: 'text' },
          { id: 'title', label: 'Title', type: 'text' },
          { id: 'description', label: 'Description', type: 'textarea' },
        ]
      }
    ]
  },
  text: {
    name: 'Text Section',
    icon: 'type',
    fields: [
      { id: 'sectionTitle', label: 'Section Title', type: 'text', default: '' },
      { id: 'content', label: 'Content', type: 'textarea', default: 'Your content here...' },
      { id: 'alignment', label: 'Alignment', type: 'select', default: 'center', options: ['left', 'center', 'right'] },
    ]
  },
  image: {
    name: 'Image Section',
    icon: 'image',
    fields: [
      { id: 'image', label: 'Image', type: 'image', default: '' },
      { id: 'caption', label: 'Caption', type: 'text', default: '' },
      { id: 'alt', label: 'Alt Text', type: 'text', default: '' },
    ]
  },
};

// Default page configurations by type
const DEFAULT_PAGE_CONFIGS: Record<string, any> = {
  home: {
    title: 'Home',
    slug: 'index',
    sections: ['hero', 'services', 'about', 'testimonials', 'cta'],
  },
  services: {
    title: 'Services',
    slug: 'services',
    sections: ['hero', 'services', 'cta'],
  },
  about: {
    title: 'About Us',
    slug: 'about',
    sections: ['hero', 'about', 'team', 'cta'],
  },
  team: {
    title: 'Our Team',
    slug: 'team',
    sections: ['hero', 'team', 'cta'],
  },
  portfolio: {
    title: 'Portfolio',
    slug: 'portfolio',
    sections: ['hero', 'gallery', 'cta'],
  },
  blog: {
    title: 'Blog',
    slug: 'blog',
    sections: ['hero', 'blog'],
  },
  contact: {
    title: 'Contact Us',
    slug: 'contact',
    sections: ['hero', 'contact'],
  },
};

/**
 * Get default content for a section type
 */
function getDefaultSectionContent(sectionType: string): any {
  const sectionDef = STANDARD_SECTIONS[sectionType as keyof typeof STANDARD_SECTIONS];
  if (!sectionDef) return {};

  const content: any = {};
  sectionDef.fields.forEach((field: any) => {
    content[field.id] = field.default;
  });

  // Add sample data for repeater fields
  if (sectionType === 'services') {
    content.services = [
      { icon: 'briefcase', title: 'Service 1', description: 'Description for service 1', image: '', link: '' },
      { icon: 'users', title: 'Service 2', description: 'Description for service 2', image: '', link: '' },
      { icon: 'star', title: 'Service 3', description: 'Description for service 3', image: '', link: '' },
    ];
  }
  if (sectionType === 'team') {
    content.members = [
      { name: 'John Doe', role: 'CEO', bio: 'Company leader', image: '', linkedin: '', twitter: '' },
      { name: 'Jane Smith', role: 'Manager', bio: 'Operations manager', image: '', linkedin: '', twitter: '' },
    ];
  }
  if (sectionType === 'testimonials') {
    content.testimonials = [
      { quote: 'Great service!', author: 'Client 1', role: 'Business Owner', rating: 5, image: '' },
      { quote: 'Highly recommended!', author: 'Client 2', role: 'Manager', rating: 5, image: '' },
    ];
  }
  if (sectionType === 'about') {
    content.stats = [
      { number: '10+', label: 'Years Experience' },
      { number: '500+', label: 'Happy Clients' },
      { number: '50+', label: 'Team Members' },
    ];
  }

  return content;
}

/**
 * Auto-detect schema for a template and create pages with sections
 */
export async function autoDetectSchemaForTemplate(templateId: string) {
  // Get template info
  const template = await prisma.template.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  // Determine page types based on niche or default
  const niche = template.niche || 'general';
  const pageTypes = ['home', 'services', 'about', 'contact'];
  
  // For lawyer niche, add more pages
  if (niche === 'lawyer' || niche === 'legal') {
    pageTypes.push('team');
  }

  const pages = pageTypes.map(type => {
    const config = DEFAULT_PAGE_CONFIGS[type] || DEFAULT_PAGE_CONFIGS.home;
    return {
      id: type,
      name: config.title,
      slug: config.slug,
      file: config.slug === 'index' ? 'index.html' : `${config.slug}.html`,
      sections: config.sections,
    };
  });

  // Build sections array
  const sections = pages.flatMap(page => 
    page.sections.map((sectionType: string, index: number) => ({
      id: `${page.id}-${sectionType}`,
      name: STANDARD_SECTIONS[sectionType as keyof typeof STANDARD_SECTIONS]?.name || sectionType,
      type: sectionType,
      pageId: page.id,
      order: index,
      fields: STANDARD_SECTIONS[sectionType as keyof typeof STANDARD_SECTIONS]?.fields || [],
    }))
  );

  // Delete existing schema
  await prisma.templateSchema.deleteMany({
    where: { templateId },
  });

  // Save new schema
  const schema = await prisma.templateSchema.create({
    data: {
      templateId,
      schema: { 
        pages,
        sections: Object.keys(STANDARD_SECTIONS).map(key => ({
          type: key,
          ...STANDARD_SECTIONS[key as keyof typeof STANDARD_SECTIONS]
        }))
      } as any,
      sections: sections as any,
      fields: STANDARD_SECTIONS as any,
      pages: pages as any,
      autoDetected: true,
    },
  });

  return schema;
}

/**
 * Generate complete pages with sections for a client
 */
export async function generateClientPages(clientId: string, templateId: string) {
  // Get template schema
  const templateSchema = await prisma.templateSchema.findUnique({
    where: { templateId },
  });

  if (!templateSchema) {
    throw new Error('Template schema not found');
  }

  const pages = templateSchema.pages as any[] || [];
  const sections = templateSchema.sections as any[] || [];

  // Create pages
  for (const page of pages) {
    // Get sections for this page
    const pageSections = sections
      .filter((s: any) => s.pageId === page.id)
      .sort((a: any, b: any) => a.order - b.order);

    // Build sections data with default content
    const sectionsData = pageSections.map((section: any) => ({
      id: section.id,
      type: section.type,
      name: section.name,
      content: getDefaultSectionContent(section.type),
    }));

    // Create or update page using raw SQL
    const pageId = `page_${clientId}_${page.id}`;
    await prisma.$executeRaw`
      INSERT INTO pages (id, "clientId", title, slug, sections, "sectionsData", "isActive", "sortOrder", "createdAt", "updatedAt")
      VALUES (${pageId}, ${clientId}, ${page.name}, ${page.slug}, ${JSON.stringify(sectionsData)}::jsonb, ${JSON.stringify(sectionsData)}::jsonb, true, ${page.slug === 'index' ? 0 : 100}, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        sections = EXCLUDED.sections,
        "sectionsData" = EXCLUDED."sectionsData",
        "updatedAt" = NOW()
    `;
  }

  // Create site configs for global settings
  const globalConfigs = [
    { key: 'businessName', value: 'Your Business Name', type: 'text', section: 'global' },
    { key: 'tagline', value: 'Your tagline here', type: 'text', section: 'global' },
    { key: 'description', value: 'Business description', type: 'textarea', section: 'global' },
    { key: 'phone', value: '+1 234 567 890', type: 'text', section: 'global' },
    { key: 'email', value: 'contact@example.com', type: 'text', section: 'global' },
    { key: 'address', value: '123 Street, City, Country', type: 'textarea', section: 'global' },
    { key: 'logo', value: '', type: 'image', section: 'global' },
    { key: 'primaryColor', value: '#D4AF37', type: 'text', section: 'global' },
    { key: 'secondaryColor', value: '#1a1a1a', type: 'text', section: 'global' },
  ];

  for (const config of globalConfigs) {
    const cfgId = `cfg_${clientId}_${config.key}`;
    const jsonVal = config.type === 'image' ? JSON.stringify(config.value) : null;
    await prisma.$executeRaw`
      INSERT INTO site_configs (id, "clientId", key, value, type, "jsonValue", "createdAt", "updatedAt")
      VALUES (${cfgId}, ${clientId}, ${config.key}, ${config.value}, ${config.type}, ${jsonVal}::jsonb, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `;
  }

  return {
    pagesCreated: pages.length,
    sectionsCreated: sections.length,
    configsCreated: globalConfigs.length,
  };
}

/**
 * Legacy function name - redirects to new function
 */
export async function generateClientSiteConfigLegacy(clientId: string, templateId: string) {
  return generateClientPages(clientId, templateId);
}

/**
 * Generate default site config for a new client based on template schema
 */
export async function generateClientSiteConfigMain(clientId: string, templateId: string) {
  // Get template schema
  const templateSchema = await prisma.templateSchema.findUnique({
    where: { templateId },
  });
  
  if (!templateSchema) {
    throw new Error('Template schema not found');
  }
  
  const sections = templateSchema.sections as any[] || [];
  const global = templateSchema.fields as any || {};
  
  const configs: Array<{
    clientId: string;
    key: string;
    value: string;
    type: string;
    jsonValue: any;
  }> = [];
  
  // Generate configs from sections
  for (const section of sections) {
    for (const field of section.fields || []) {
      configs.push({
        clientId,
        key: `${section.id}_${field.id}`,
        value: field.defaultValue?.toString() || '',
        type: field.type,
        jsonValue: field.type === 'image' || field.type === 'color' || field.type === 'repeater' || field.type === 'select'
          ? field.defaultValue || (field.type === 'repeater' ? [] : '')
          : null,
      });
    }
  }
  
  // Add global configs
  const globalColors = global.colors || [];
  for (const color of globalColors) {
    configs.push({
      clientId,
      key: `global_${color.id}`,
      value: color.defaultValue || '#000000',
      type: 'color',
      jsonValue: color.defaultValue || '#000000',
    });
  }
  
  const globalTypography = global.typography || [];
  for (const font of globalTypography) {
    configs.push({
      clientId,
      key: `global_${font.id}`,
      value: font.defaultValue || 'Inter',
      type: 'select',
      jsonValue: null,
    });
  }
  
  const globalSeo = global.seo || [];
  for (const seo of globalSeo) {
    configs.push({
      clientId,
      key: `global_${seo.id}`,
      value: seo.defaultValue?.toString() || '',
      type: seo.type,
      jsonValue: seo.type === 'image' ? seo.defaultValue || '' : null,
    });
  }
  
  // Bulk create configs
  if (configs.length > 0) {
    await prisma.$transaction(
      configs.map(cfg => 
        prisma.siteConfig.upsert({
          where: {
            clientId_key: {
              clientId: cfg.clientId,
              key: cfg.key,
            },
          },
          create: cfg,
          update: cfg,
        })
      )
    );
  }
  
  return configs.length;
}

/**
 * Regenerate schema for existing template
 */
export async function regenerateTemplateSchema(templateId: string) {
  // Delete existing
  await prisma.templateSchema.deleteMany({
    where: { templateId },
  });
  
  // Re-detect
  return autoDetectSchemaForTemplate(templateId);
}
