import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const domainRouter: Router = Router();
domainRouter.use(requireAuth);

const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? process.env.CF_API_TOKEN;
const CF_ZONE_ID = process.env.CF_ZONE_ID;
const SITE_BASE_URL = process.env.SITE_BASE_URL ?? 'https://sites.buildhaze.com';

async function getOrCreateCredits(clientId: string) {
  const existing = await prisma.$queryRaw<any[]>`SELECT * FROM domain_configs WHERE "clientId" = ${clientId} LIMIT 1`;
  return existing?.[0] ?? null;
}

// GET /api/domain — get current domain config
domainRouter.get('/', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const rows = await prisma.$queryRaw<any[]>`SELECT * FROM domain_configs WHERE "clientId" = ${clientId} LIMIT 1`;
  const config = rows?.[0] ?? null;
  if (!config) return res.json({ connected: false });
  res.json({ connected: true, ...config });
});

// POST /api/domain/connect
domainRouter.post('/connect', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const { domain } = req.body as { domain: string };
  if (!domain) throw new AppError(400, 'domain is required');

  const dnsRecords = [
    { type: 'CNAME', name: domain, value: SITE_BASE_URL.replace(/^https?:\/\//, ''), ttl: 300 },
    { type: 'CNAME', name: `www.${domain}`, value: SITE_BASE_URL.replace(/^https?:\/\//, ''), ttl: 300 },
  ];

  const existing = await prisma.$queryRaw<any[]>`SELECT id FROM domain_configs WHERE "clientId" = ${clientId} LIMIT 1`;
  if (existing?.length) {
    await prisma.$executeRaw`
      UPDATE domain_configs SET domain=${domain}, status='unverified', "dnsRecords"=${JSON.stringify(dnsRecords)}::jsonb, "updatedAt"=now()
      WHERE "clientId"=${clientId}
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO domain_configs (id, "clientId", domain, status, "dnsRecords", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, ${clientId}, ${domain}, 'unverified', ${JSON.stringify(dnsRecords)}::jsonb, now(), now())
    `;
  }

  const rows = await prisma.$queryRaw<any[]>`SELECT * FROM domain_configs WHERE "clientId" = ${clientId} LIMIT 1`;
  res.json({ connected: true, ...rows[0], dnsRecords });
});

// GET /api/domain/verify
domainRouter.get('/verify', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const rows = await prisma.$queryRaw<any[]>`SELECT * FROM domain_configs WHERE "clientId" = ${clientId} LIMIT 1`;
  const config = rows?.[0];
  if (!config) throw new AppError(404, 'No domain configured');

  // Try DNS lookup to check propagation
  let verified = false;
  try {
    const lookupRes = await fetch(`https://dns.google/resolve?name=${config.domain}&type=CNAME`);
    const lookupData = await lookupRes.json() as any;
    const answers = lookupData?.Answer ?? [];
    const siteHost = SITE_BASE_URL.replace(/^https?:\/\//, '');
    verified = answers.some((a: any) => a.data?.includes(siteHost));
  } catch {
    verified = false;
  }

  if (verified) {
    await prisma.$executeRaw`
      UPDATE domain_configs SET status='verified', "verifiedAt"=now(), "updatedAt"=now() WHERE "clientId"=${clientId}
    `;
    // Also update client's domain field
    await prisma.client.update({ where: { id: clientId }, data: { domain: config.domain } });
  }

  const updated = await prisma.$queryRaw<any[]>`SELECT * FROM domain_configs WHERE "clientId" = ${clientId} LIMIT 1`;
  res.json({ verified, ...updated[0] });
});

// DELETE /api/domain — disconnect domain
domainRouter.delete('/', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  await prisma.$executeRaw`DELETE FROM domain_configs WHERE "clientId" = ${clientId}`;
  await prisma.client.update({ where: { id: clientId }, data: { domain: null } });
  res.json({ success: true });
});
