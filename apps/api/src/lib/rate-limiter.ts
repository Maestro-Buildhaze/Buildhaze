import { prisma } from './prisma';

export type QuotaFeature =
  | 'blog_generation'
  | 'news_blog'
  | 'chat_msg'
  | 'suggestions';

export async function checkDailyLimit(
  clientId: string,
  feature: QuotaFeature,
  limit: number,
): Promise<{ allowed: boolean; used: number; remaining: number; limit: number }> {
  const today = new Date().toISOString().split('T')[0];
  const key = `${feature}:${today}`;

  const record = await prisma.usageQuota.upsert({
    where: { clientId_key: { clientId, key } },
    create: { clientId, key, count: 0 },
    update: {},
  });

  const used = record.count;
  return { allowed: used < limit, used, remaining: Math.max(0, limit - used), limit };
}

export async function incrementUsage(
  clientId: string,
  feature: QuotaFeature,
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const key = `${feature}:${today}`;
  await prisma.usageQuota.upsert({
    where: { clientId_key: { clientId, key } },
    create: { clientId, key, count: 1 },
    update: { count: { increment: 1 } },
  });
}

export async function getQuotaSummary(clientId: string) {
  const today = new Date().toISOString().split('T')[0];
  const features: { feature: QuotaFeature; label: string; limit: number }[] = [
    { feature: 'blog_generation', label: 'AI Blog (topic)', limit: 2 },
    { feature: 'news_blog',       label: 'Blog din știre',  limit: 2 },
    { feature: 'suggestions',     label: 'Sugestii AI',     limit: 20 },
  ];

  const keys = features.map(f => `${f.feature}:${today}`);
  const records = await prisma.usageQuota.findMany({
    where: { clientId, key: { in: keys } },
  });

  return features.map(f => {
    const rec = records.find(r => r.key === `${f.feature}:${today}`);
    const used = rec?.count ?? 0;
    return { ...f, used, remaining: Math.max(0, f.limit - used) };
  });
}
