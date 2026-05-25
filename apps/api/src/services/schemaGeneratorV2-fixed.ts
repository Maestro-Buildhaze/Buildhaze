/**
 * Schema Generator Service V2 - FIXED with Raw SQL
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
  
  // Parse template structure
  const structure = TemplateParser.parseTemplate(files);
  
  // Transform to schema format
  const schema = {
    pages: structure.pages.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      file: p.file,
      sections: p.sections.map(s => s.id),
    })),
    sections: structure.pages.flatMap(p => 
      p.sections.map((s, idx) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        pageId: p.id,
        order: idx,
        fields: s.fields,
      }))
    ),
  };
  
  // Delete existing schema
  await prisma.$executeRaw`DELETE FROM "TemplateSchema" WHERE "templateId" = ${templateId}`;
  
  // Insert new schema using raw SQL
  const id = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "TemplateSchema" (id, "templateId", schema, pages, sections, fields, "autoDetected", "createdAt", "updatedAt")
    VALUES (${id}, ${templateId}, ${JSON.stringify(schema)}::jsonb, ${JSON.stringify(schema.pages)}::jsonb, ${JSON.stringify(schema.sections)}::jsonb, '{}'::jsonb, true, NOW(), NOW())
  `;
  
  return {
    schema,
    pagesDetected: structure.pages.length,
    sectionsDetected: structure.pages.reduce((acc, p) => acc + p.sections.length, 0),
  };
}

/**
 * Generate client pages based on detected template structure
 */
export async function generateClientPagesFromSchema(clientId: string, templateId: string) {
  // Get template schema
  let schemaResult: any = await prisma.$queryRaw`
    SELECT * FROM "TemplateSchema" WHERE "templateId" = ${templateId} LIMIT 1
  `;
  
  let templateSchema = Array.isArray(schemaResult) ? schemaResult[0] : null;
  
  // AUTO-DETECT if schema doesn't exist yet
  if (!templateSchema) {
    console.log(`No schema found for template ${templateId}, auto-detecting...`);
    try {
      await autoDetectSchemaFromFiles(templateId);
      // Re-fetch after detection
      schemaResult = await prisma.$queryRaw`
        SELECT * FROM "TemplateSchema" WHERE "templateId" = ${templateId} LIMIT 1
      `;
      templateSchema = Array.isArray(schemaResult) ? schemaResult[0] : null;
    } catch (err) {
      console.error('Auto-detect failed:', err);
      throw new Error(`Could not detect template schema: ${err}`);
    }
  }
  
  if (!templateSchema) {
    throw new Error('Template schema not found and auto-detect failed.');
  }
  
  const pages = templateSchema.pages || [];
  const sections = templateSchema.sections || [];
  
  const createdPages = [];
  
  // Create pages using raw SQL
  for (const page of pages) {
    const pageSections = sections
      .filter((s: any) => s.pageId === page.id)
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    
    // Build sections data
    const sectionsData = pageSections.map((section: any) => {
      const content: Record<string, any> = {};
      if (section.fields) {
        section.fields.forEach((field: any) => {
          content[field.id] = field.defaultValue || '';
        });
      }
      return {
        id: section.id,
        type: section.type,
        name: section.name,
        data: content,  // Changed from 'content' to 'data' to match frontend
        visible: true,
      };
    });
    
    const pageId = `page_${clientId}_${page.id}`;
    
    // Insert page with raw SQL
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
    const jsonValue = config.type === 'image' ? JSON.stringify(config.value) : null;
    
    await prisma.$executeRaw`
      INSERT INTO site_configs (id, "clientId", key, value, type, "jsonValue", "createdAt", "updatedAt")
      VALUES (${cfgId}, ${clientId}, ${config.key}, ${config.value}, ${config.type}, ${jsonValue}::jsonb, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `;
  }
  
  return {
    pagesCreated: createdPages.length,
    sectionsCreated: sections.length,
    configsCreated: globalConfigs.length,
    pages: createdPages,
  };
}

// Legacy export name for compatibility
export const generateClientSiteConfig = generateClientPagesFromSchema;
