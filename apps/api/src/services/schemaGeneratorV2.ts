/**
 * Schema Generator Service V2 - Dynamic Page Generation
 * 
 * Generates CMS schema based on ACTUAL template structure detected from HTML.
 * Each template gets its own unique schema based on its pages and sections.
 */

import { prisma } from '../lib/prisma';
import { TemplateParser } from './templateParserV2';
import { getS3Client, getBucketName } from '../utils/s3';
import { GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

/**
 * Auto-detect schema from template files and save to database
 */
export async function autoDetectSchemaFromFiles(templateId: string) {
  // Get template info
  const template = await prisma.template.findUnique({
    where: { id: templateId },
  });
  
  if (!template) {
    throw new Error('Template not found');
  }
  
  if (!template.r2Key) {
    throw new Error('Template has no r2Key (files not uploaded)');
  }
  
  // Fetch all template files from R2
  const s3 = getS3Client();
  const bucket = getBucketName();
  
  const listCmd = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: template.r2Key,
  });
  const listed = await s3.send(listCmd);
  
  const files: Record<string, string> = {};
  
  // Get HTML files only
  for (const obj of listed.Contents || []) {
    if (!obj.Key || !obj.Key.endsWith('.html')) continue;
    
    const getCmd = new GetObjectCommand({
      Bucket: bucket,
      Key: obj.Key,
    });
    const response = await s3.send(getCmd);
    const content = await response.Body?.transformToString('utf-8') || '';
    
    const relativePath = obj.Key.replace(template.r2Key, '').replace(/^\//, '');
    files[relativePath] = content;
  }
  
  if (Object.keys(files).length === 0) {
    throw new Error('No HTML files found in template');
  }
  
  // Parse template structure using V2 parser
  const structure = TemplateParser.parseTemplate(files);
  
  // Transform structure to schema format
  const schema = {
    pages: structure.pages.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      file: p.file,
      sections: p.sections.map(s => s.id),
    })),
    sections: structure.pages.flatMap(p => 
      p.sections.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        pageId: p.id,
        fields: s.fields,
      }))
    ),
  };
  
  // Delete existing schema
  await prisma.templateSchema.deleteMany({
    where: { templateId },
  });
  
  // Save to database
  const savedSchema = await prisma.templateSchema.create({
    data: {
      templateId,
      schema: schema as any,
      pages: schema.pages as any,
      sections: schema.sections as any,
      fields: {},
      autoDetected: true,
    },
  });
  
  return {
    schema: savedSchema,
    pagesDetected: structure.pages.length,
    sectionsDetected: structure.pages.reduce((acc, p) => acc + p.sections.length, 0),
  };
}

/**
 * Generate client pages based on detected template structure
 */
export async function generateClientPagesFromSchema(clientId: string, templateId: string) {
  // Get template schema
  const templateSchema = await prisma.templateSchema.findUnique({
    where: { templateId },
  });
  
  if (!templateSchema) {
    throw new Error('Template schema not found. Run auto-detect first.');
  }
  
  const pages = templateSchema.pages as any[] || [];
  const sections = templateSchema.sections as any[] || [];
  
  const createdPages = [];
  
  // Create pages
  for (const page of pages) {
    // Get sections for this page
    const pageSections = sections
      .filter((s: any) => s.pageId === page.id || s.pageId === page.file?.replace('.html', ''))
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    
    // Build sections data with default content
    const sectionsData = pageSections.map((section: any) => {
      const content: Record<string, any> = {};
      
      // Set default values for each field
      if (section.fields) {
        section.fields.forEach((field: any) => {
          content[field.id] = field.defaultValue || '';
        });
      }
      
      return {
        id: section.id,
        type: section.type,
        name: section.name,
        content,
      };
    });
    
    const pageId = `page_${clientId}_${page.id}`;
    
    // Create or update page using raw SQL
    await prisma.$executeRaw`
      INSERT INTO pages (id, "clientId", title, slug, sections, "sectionsData", "isActive", "sortOrder", "createdAt", "updatedAt")
      VALUES (${pageId}, ${clientId}, ${page.name}, ${page.slug}, ${JSON.stringify(pageSections)}::jsonb, ${JSON.stringify(sectionsData)}::jsonb, true, ${page.slug === 'index' ? 0 : 100}, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        sections = EXCLUDED.sections,
        "sectionsData" = EXCLUDED."sectionsData",
        "updatedAt" = NOW()
    `;
    
    createdPages.push({ id: pageId, title: page.name, slug: page.slug });
  }
  
  // Create global site configs
  const globalConfigs = [
    { key: 'businessName', value: 'Your Business Name', type: 'text' },
    { key: 'tagline', value: 'Your tagline here', type: 'text' },
    { key: 'description', value: 'Business description', type: 'textarea' },
    { key: 'phone', value: '+1 234 567 890', type: 'text' },
    { key: 'email', value: 'contact@example.com', type: 'text' },
    { key: 'address', value: '123 Street, City', type: 'textarea' },
    { key: 'logo', value: '', type: 'image' },
    { key: 'primaryColor', value: '#D4AF37', type: 'text' },
    { key: 'secondaryColor', value: '#1a1a1a', type: 'text' },
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
    pagesCreated: createdPages.length,
    sectionsCreated: sections.length,
    configsCreated: globalConfigs.length,
    pages: createdPages.map(p => ({ id: p.id, title: p.title, slug: p.slug })),
  };
}

// Legacy export name for compatibility
export const generateClientSiteConfig = generateClientPagesFromSchema;
