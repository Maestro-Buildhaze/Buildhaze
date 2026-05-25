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
  
  // Get template path for reading HTML files
  const template = await prisma.template.findUnique({ where: { id: templateId } });
  const templatePath = template?.r2Key || `/tmp/templates/${templateId}`;
  
  // Create pages using raw SQL - PARSE EACH HTML FILE INDIVIDUALLY
  const { JSDOM } = await import('jsdom');
  const fs = await import('fs');
  const path = await import('path');
  
  for (const page of pages) {
    const pageFile = page.file || `${page.id}.html`;
    const pageId = `page_${clientId}_${page.id}`;
    
    // Try to read actual HTML content
    let htmlContent = '';
    let pageSections: any[] = [];
    let sectionsData: any[] = [];
    
    try {
      const filePath = path.join(templatePath, pageFile);
      if (fs.existsSync(filePath)) {
        htmlContent = fs.readFileSync(filePath, 'utf-8');
        console.log(`Reading ${pageFile} for page ${page.name}...`);
      }
    } catch (e) {
      console.log(`Could not read ${pageFile}, using empty defaults`);
    }
    
    if (htmlContent) {
      // Parse HTML to extract actual sections from THIS page
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;
      
      // Find all section-like elements
      const sectionSelectors = [
        'section',
        '[data-section]',
        '[id*="section"]',
        '[class*="section"]',
        '[class*="hero"]',
        '[class*="about"]',
        '[class*="contact"]',
        '[class*="menu"]',
        '[class*="features"]',
        '[class*="testimonials"]',
        '[class*="footer"]',
        '[class*="cta"]',
      ];
      
      const foundSections = new Set<Element>();
      for (const selector of sectionSelectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => foundSections.add(el));
      }
      
      // Convert to array and create sections
      let sectionIndex = 0;
      foundSections.forEach((element) => {
        const sectionId = `${page.id}-section-${sectionIndex}`;
        const sectionName = element.getAttribute('data-section') || 
                           element.id || 
                           element.className.split(' ')[0] || 
                           `Section ${sectionIndex + 1}`;
        
        // Extract editable fields from this section
        const fields: any[] = [];
        const data: Record<string, any> = {};
        const usedIds = new Set<string>();
        
        // 1. data-cms attributes
        const cmsElements = element.querySelectorAll('[data-cms]');
        cmsElements.forEach((el: any) => {
          const cmsId = el.getAttribute('data-cms');
          if (!cmsId || usedIds.has(cmsId)) return;
          
          const tagName = el.tagName.toLowerCase();
          let value = '';
          
          if (tagName === 'img') {
            value = el.getAttribute('src') || '';
          } else {
            value = el.textContent?.trim() || '';
          }
          
          data[cmsId] = value;
          fields.push({
            id: cmsId,
            type: tagName === 'img' ? 'image' : 'text',
            label: cmsId,
            selector: `[data-cms="${cmsId}"]`,
            attribute: tagName === 'img' ? 'src' : 'textContent',
            defaultValue: value,
          });
          usedIds.add(cmsId);
        });
        
        // 2. Auto-detect headings, paragraphs, images without data-cms
        // Headings
        element.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el: any, idx: number) => {
          if (el.hasAttribute('data-cms')) return;
          const text = el.textContent?.trim();
          if (!text || text.length < 2) return;
          
          const fieldId = `heading-${idx}`;
          if (usedIds.has(fieldId)) return;
          
          data[fieldId] = text;
          fields.push({
            id: fieldId,
            type: 'text',
            label: `${el.tagName}: ${text.substring(0, 30)}`,
            selector: el.tagName.toLowerCase(),
            attribute: 'textContent',
            defaultValue: text,
          });
          usedIds.add(fieldId);
        });
        
        // Paragraphs with text
        element.querySelectorAll('p').forEach((el: any, idx: number) => {
          if (el.hasAttribute('data-cms')) return;
          const text = el.textContent?.trim();
          if (!text || text.length < 10) return;
          
          const fieldId = `text-${idx}`;
          if (usedIds.has(fieldId)) return;
          
          data[fieldId] = text;
          fields.push({
            id: fieldId,
            type: text.length > 150 ? 'textarea' : 'text',
            label: `Paragraph ${idx + 1}`,
            selector: 'p',
            attribute: 'textContent',
            defaultValue: text,
          });
          usedIds.add(fieldId);
        });
        
        // Images
        element.querySelectorAll('img').forEach((el: any, idx: number) => {
          if (el.hasAttribute('data-cms')) return;
          const fieldId = `image-${idx}`;
          if (usedIds.has(fieldId)) return;
          
          const src = el.getAttribute('src') || '';
          data[fieldId] = src;
          fields.push({
            id: fieldId,
            type: 'image',
            label: `Image ${idx + 1}`,
            selector: 'img',
            attribute: 'src',
            defaultValue: src,
          });
          usedIds.add(fieldId);
        });
        
        // Add section if it has any fields
        if (fields.length > 0) {
          pageSections.push({
            id: sectionId,
            type: 'section',
            name: sectionName,
            pageId: page.id,
            fields,
          });
          
          sectionsData.push({
            id: sectionId,
            type: 'section',
            name: sectionName,
            data,
            visible: true,
          });
          
          sectionIndex++;
        }
      });
      
      console.log(`Page ${page.name}: Found ${pageSections.length} sections with ${pageSections.reduce((sum, s) => sum + s.fields.length, 0)} fields`);
    }
    
    // If no sections found, create a default empty one
    if (pageSections.length === 0) {
      pageSections.push({
        id: `${page.id}-default`,
        type: 'section',
        name: 'Main Content',
        pageId: page.id,
        fields: [],
      });
      sectionsData.push({
        id: `${page.id}-default`,
        type: 'section',  
        name: 'Main Content',
        data: {},
        visible: true,
      });
    }
    
    // Insert page with real sections from HTML
    await prisma.$executeRaw`
      INSERT INTO pages (id, "clientId", title, slug, sections, "sectionsData", "isActive", "sortOrder", "createdAt", "updatedAt")
      VALUES (${pageId}, ${clientId}, ${page.name}, ${page.slug}, ${JSON.stringify(pageSections)}::jsonb, ${JSON.stringify(sectionsData)}::jsonb, true, ${page.slug === 'index' ? 0 : 100}, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        sections = EXCLUDED.sections,
        "sectionsData" = EXCLUDED."sectionsData",
        "updatedAt" = NOW()
    `;
    
    createdPages.push({ id: pageId, title: page.name, slug: page.slug, sectionsCount: pageSections.length });
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
