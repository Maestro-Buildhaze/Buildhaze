/// <reference types="node" />
import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router: Router = Router();

// GET /api/template-schema/:templateId
router.get('/:templateId', authenticateToken, async (req: Request, res: Response) => {
  try {
    let schema = await prisma.templateSchema.findUnique({
      where: { templateId: req.params.templateId },
    });
    if (!schema) {
      const { detectAndSaveTemplateSchema } = await import('../services/cms-schema');
      await detectAndSaveTemplateSchema(req.params.templateId);
      schema = await prisma.templateSchema.findUnique({ where: { templateId: req.params.templateId } });
    }
    res.json({ success: true, schema });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/template-schema/:templateId
router.put('/:templateId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { schema: schemaData, sections, fields, pages } = req.body;
    const updated = await prisma.templateSchema.upsert({
      where: { templateId: req.params.templateId },
      create: {
        templateId: req.params.templateId,
        schema: schemaData || {},
        sections: sections || [],
        fields: fields || {},
        pages: pages || [],
        autoDetected: false,
      },
      update: {
        schema: schemaData,
        sections,
        fields,
        pages,
        autoDetected: false,
      },
    });
    res.json({ success: true, schema: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/template-schema/:templateId/regenerate
router.post('/:templateId/regenerate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { detectAndSaveTemplateSchema } = await import('../services/cms-schema');
    const result = await detectAndSaveTemplateSchema(req.params.templateId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/template-schema/:templateId/clients/:clientId/regenerate-config
router.post('/:templateId/clients/:clientId/regenerate-config', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { generateClientPages } = await import('../services/cms-schema');
    const result = await generateClientPages(req.params.clientId, req.params.templateId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
