/**
 * Schema Generator Service
 * 
 * Automatically generates CMS schema from template HTML files.
 * Used when templates are uploaded or clients are created.
 */

import { prisma } from '../lib/prisma';
import { TemplateParser } from './templateParser';
import { getS3Client, getBucketName } from '../utils/s3';
import { GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

/**
 * Auto-detect schema for a template and save to database
 */
export async function autoDetectSchemaForTemplate(templateId: string) {
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
  
  // Parse template structure
  const structure = TemplateParser.parseTemplate(files);
  
  // Delete existing schema if any
  await prisma.templateSchema.deleteMany({
    where: { templateId },
  });
  
  // Save to database
  const schema = await prisma.templateSchema.create({
    data: {
      templateId,
      schema: structure as any,
      sections: structure.pages.flatMap(p => p.sections) as any,
      fields: structure.global as any,
      pages: structure.pages.map(p => ({ id: p.id, name: p.name, file: p.file })) as any,
      autoDetected: true,
    },
  });
  
  return schema;
}

/**
 * Generate default site config for a new client based on template schema
 */
export async function generateClientSiteConfig(clientId: string, templateId: string) {
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
