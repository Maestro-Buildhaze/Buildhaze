import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router: import('express').Router = Router();
const prisma = new PrismaClient();

/**
 * Get site data for a client (CMS data)
 * GET /api/site/:clientId/data
 */
router.get('/:clientId/data', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Get client with template and all site config
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        template: {
          include: {
            schema: true,
          },
        },
        siteConfig: true,
        mediaFiles: true,
      },
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Parse site configs into organized structure
    const siteData = {
      client: {
        id: client.id,
        businessName: client.businessName,
        email: client.email,
        plan: client.plan,
      },
      template: client.template ? {
        id: client.template.id,
        name: client.template.name,
        schema: client.template.schema?.schema || null,
        pages: client.template.schema?.pages || [],
        sections: client.template.schema?.sections || [],
      } : null,
      configs: client.siteConfig.reduce((acc: Record<string, any>, config: any) => {
        acc[config.key] = {
          value: config.value,
          type: config.type,
          jsonValue: config.jsonValue,
        };
        return acc;
      }, {}),
      media: client.mediaFiles.map((m: any) => ({
        id: m.id,
        name: m.name,
        url: m.url,
        folder: m.folder,
        tags: m.tags,
        width: m.width,
        height: m.height,
      })),
    };
    
    res.json({
      success: true,
      data: siteData,
    });
  } catch (error) {
    console.error('Error fetching site data:', error);
    res.status(500).json({ error: 'Failed to fetch site data' });
  }
});

/**
 * Update site config
 * POST /api/site/:clientId/config
 */
router.post('/:clientId/config', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { key, value, type = 'text', jsonValue } = req.body;
    
    // Upsert config
    const config = await prisma.siteConfig.upsert({
      where: {
        clientId_key: {
          clientId,
          key,
        },
      },
      create: {
        clientId,
        key,
        value: value != null ? String(value) : '',
        type,
        jsonValue,
      },
      update: {
        value: value != null ? String(value) : '',
        type,
        jsonValue,
      },
    });
    
    res.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('Error updating site config:', error);
    res.status(500).json({ error: 'Failed to update site config' });
  }
});

/**
 * Batch update multiple configs
 * POST /api/site/:clientId/config/batch
 */
router.post('/:clientId/config/batch', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { configs } = req.body;
    
    const results = await prisma.$transaction(
      configs.map((cfg: any) =>
        prisma.siteConfig.upsert({
          where: {
            clientId_key: {
              clientId,
              key: cfg.key,
            },
          },
          create: {
            clientId,
            key: cfg.key,
            value: cfg.value != null ? String(cfg.value) : '',
            type: cfg.type || 'text',
            jsonValue: cfg.jsonValue,
          },
          update: {
            value: cfg.value != null ? String(cfg.value) : '',
            type: cfg.type || 'text',
            jsonValue: cfg.jsonValue,
          },
        })
      )
    );
    
    res.json({
      success: true,
      updated: results.length,
    });
  } catch (error) {
    console.error('Error batch updating configs:', error);
    res.status(500).json({ error: 'Failed to batch update configs' });
  }
});

/**
 * Get site statistics
 * GET /api/site/:clientId/statistics
 */
router.get('/:clientId/statistics', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const stats = await prisma.siteStatistics.findUnique({
      where: { clientId },
    });
    
    if (!stats) {
      // Return empty stats structure
      return res.json({
        success: true,
        statistics: {
          totalVisits: 0,
          uniqueVisitors: 0,
          pageViews: 0,
          countries: [],
          referrers: [],
          pages: [],
          devices: [],
          dailyStats: [],
        },
      });
    }
    
    res.json({
      success: true,
      statistics: {
        totalVisits: stats.totalVisits,
        uniqueVisitors: stats.uniqueVisitors,
        pageViews: stats.pageViews,
        countries: stats.countries || [],
        referrers: stats.referrers || [],
        pages: stats.pages || [],
        devices: stats.devices || [],
        dailyStats: stats.dailyStats || [],
        lastUpdated: stats.lastUpdated,
      },
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * Get publish history
 * GET /api/site/:clientId/publish-history
 */
router.get('/:clientId/publish-history', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { limit = 10 } = req.query;
    
    const history = await prisma.sitePublishLog.findMany({
      where: { clientId },
      orderBy: { publishedAt: 'desc' },
      take: Number(limit),
    });
    
    res.json({
      success: true,
      history: history.map((h: any) => ({
        id: h.id,
        status: h.status,
        version: h.version,
        url: h.url,
        errorMessage: h.errorMessage,
        changesSummary: h.changesSummary,
        publishedAt: h.publishedAt,
        publishedBy: h.publishedBy,
      })),
    });
  } catch (error) {
    console.error('Error fetching publish history:', error);
    res.status(500).json({ error: 'Failed to fetch publish history' });
  }
});

/**
 * Delete config key
 * DELETE /api/site/:clientId/config/:key
 */
router.delete('/:clientId/config/:key', authenticateToken, async (req, res) => {
  try {
    const { clientId, key } = req.params;
    
    await prisma.siteConfig.deleteMany({
      where: {
        clientId,
        key,
      },
    });
    
    res.json({
      success: true,
      message: 'Config deleted',
    });
  } catch (error) {
    console.error('Error deleting config:', error);
    res.status(500).json({ error: 'Failed to delete config' });
  }
});

export default router;
