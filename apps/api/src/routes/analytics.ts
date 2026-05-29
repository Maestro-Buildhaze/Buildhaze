import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

export const analyticsRouter: Router = Router();
analyticsRouter.use(requireAuth);

const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? process.env.CF_API_TOKEN;

// GET /api/analytics?days=30
analyticsRouter.get('/', async (req, res) => {
  const { clientId } = req as unknown as AuthRequest;
  const days = parseInt(req.query.days as string) || 30;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { domain: true, slug: true, lastPublishedAt: true },
  });

  // Build daily labels for the requested range
  const dailyStats: { date: string; visitors: number; pageViews: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dailyStats.push({
      date: d.toISOString().split('T')[0],
      visitors: 0,
      pageViews: 0,
    });
  }

  // Try real Cloudflare data if domain + token present
  if (client?.domain && CF_API_TOKEN) {
    try {
      const zonesRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(client.domain)}`,
        { headers: { Authorization: `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' } }
      );
      const zones = await zonesRes.json() as any;
      if (zones.success && zones.result?.length) {
        const zoneId = zones.result[0].id;
        const since = new Date(now.getTime() - days * 86400000).toISOString();
        const until = now.toISOString();

        const gql = {
          query: `query($zoneId:ID!,$since:Time!,$until:Time!){viewer{zones(filter:{zoneTag:$zoneId}){
            daily:httpRequests1dGroups(limit:90,orderBy:[date_ASC],filter:{date_geq:$since,date_leq:$until}){
              dimensions{date}sum{visits pageViews}
            }
          }}}`,
          variables: { zoneId, since, until },
        };

        const gqlRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
          method: 'POST',
          headers: { Authorization: `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(gql),
        });
        const gqlData = await gqlRes.json() as any;
        const rawDaily = gqlData?.data?.viewer?.zones?.[0]?.daily ?? [];

        for (const row of rawDaily) {
          const dateStr = row.dimensions?.date;
          const entry = dailyStats.find(d => d.date === dateStr);
          if (entry) {
            entry.visitors = row.sum?.visits ?? 0;
            entry.pageViews = row.sum?.pageViews ?? 0;
          }
        }
      }
    } catch (e) {
      // fallback: zeros
    }
  }

  const totalVisitors = dailyStats.reduce((s, d) => s + d.visitors, 0);
  const totalPageViews = dailyStats.reduce((s, d) => s + d.pageViews, 0);

  res.json({
    totalVisitors,
    totalPageViews,
    topCountry: 'N/A',
    lastPublishedAt: client?.lastPublishedAt ?? null,
    dailyStats,
    days,
  });
});
