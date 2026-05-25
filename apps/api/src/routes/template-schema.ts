import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { TemplateParser } from '../services/templateParser';
import { getS3Client, getBucketName } from '../utils/s3';
import { GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const router = Router();
const prisma = new PrismaClient();

/**
 * Get or create template schema
 * GET /api/template-schema/:templateId
 */
router.get('/:templateId', authenticateToken, async (req, res) => {
  try {
    const { templateId } = req.params;
    
    // Check if schema exists
    let schema = await prisma.templateSchema.findUnique({
      where: { templateId },
    });
    
    // If not, auto-detect from template files
    if (!schema) {
      schema = await autoDetectSchema(templateId);
    }
    
    res.json({
      success: true,
      schema,
    });
  } catch (error) {
    console.error('Error fetching template schema:', error);
    res.status(500).json({ error: 'Failed to fetch template schema' });
  }
});

/**
 * Update template schema (manual editing)
 * PUT /api/template-schema/:templateId
 */
router.put('/:templateId', authenticateToken, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { schema: schemaData, sections, fields, pages } = req.body;
    
    const updated = await prisma.templateSchema.upsert({
      where: { templateId },
      create: {
        templateId,
        schema: schemaData || {},
        sections: sections || [],
        fields: fields || [],
        pages: pages || [],
        autoDetected: false,
      },
      update: {
        schema: schemaData,
        sections,
        fields,
        pages,
        autoDetected: false,
        version: { increment: 1 },
      },
    });
    
    res.json({
      success: true,
      schema: updated,
    });
  } catch (error) {
    console.error('Error updating template schema:', error);
    res.status(500).json({ error: 'Failed to update template schema' });
  }
});

/**
 * Auto-detect schema from template files
 */
async function autoDetectSchema(templateId: string) {
  // Get template info
  const template = await prisma.template.findUnique({
    where: { id: templateId },
  });
  
  if (!template) {
    throw new Error('Template not found');
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
  
  // Parse template structure
  const structure = TemplateParser.parseTemplate(files);
  
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
 * Regenerate schema (re-parse template files)
 * POST /api/template-schema/:templateId/regenerate
 */
router.post('/:templateId/regenerate', authenticateToken, async (req, res) => {
  try {
    const { templateId } = req.params;
    
    // Delete existing schema
    await prisma.templateSchema.deleteMany({
      where: { templateId },
    });
    
    // Re-detect
    const schema = await autoDetectSchema(templateId);
    
    res.json({
      success: true,
      schema,
      message: 'Schema regenerated successfully',
    });
  } catch (error) {
    console.error('Error regenerating schema:', error);
    res.status(500).json({ error: 'Failed to regenerate schema' });
  }
});

/**
 * Regenerate client site config from template schema
 * POST /api/template-schema/:templateId/clients/:clientId/regenerate-config
 */
router.post('/:templateId/clients/:clientId/regenerate-config', authenticateToken, async (req, res) => {
  try {
    const { templateId, clientId } = req.params;
    
    // Import schema generator
    const { generateClientSiteConfig } = await import('../services/schemaGenerator');
    
    // Generate new config
    const count = await generateClientSiteConfig(clientId, templateId);
    
    res.json({
      success: true,
      configsCreated: count,
      message: `Site config regenerated successfully. Created/updated ${count} config entries.`,
    });
  } catch (error) {
    console.error('Error regenerating client site config:', error);
    res.status(500).json({ error: 'Failed to regenerate client site config' });
  }
});

export default router;
