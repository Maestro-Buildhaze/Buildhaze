import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe, FileText, Image, Send, Loader2, CheckCircle2, Clock, ArrowRight,
  ExternalLink, TrendingUp, Sparkles, Newspaper, Zap, BarChart2,
  Users, Eye, AlertCircle, RefreshCw, BookOpen, PenTool,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';
import clsx from 'clsx';

// ── Mini bar chart ─────────────────────────────────────────────────────────
function BarChart({ data }: { data: { date: string; visitors: number }[] }) {
  const max = Math.max(...data.map(d => d.visitors), 1);
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="flex items-end gap-0.5 h-20 w-full">
      {data.map((d, i) => {
        const pct = Math.max((d.visitors / max) * 100, 3);
        return (
          <div
            key={d.date}
            className="flex-1 flex flex-col items-center justify-end group relative"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {hovered === i && (
              <div
                className="absolute bottom-full mb-1 px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap z-10"
                style={{ background: 'var(--surface3)', color: 'var(--text)', border: '1px solid var(--border-strong)' }}
              >
                {d.visitors} · {d.date.slice(5)}
              </div>
            )}
            <div
              className="w-full rounded-t transition-all duration-150"
              style={{
                height: `${pct}%`,
                background: d.visitors > 0 ? 'var(--green)' : 'var(--border)',
                opacity: hovered === i ? 1 : d.visitors > 0 ? 0.8 : 0.4,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Stat card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof Globe;
  label: string;
  value: string | number;
  sub?: string;
  color: 'green' | 'blue' | 'purple' | 'amber';
}) {
  const colors = {
    green:  { bg: 'var(--green-bg)',  fg: 'var(--green)',  glow: 'rgba(22,163,74,0.12)' },
    blue:   { bg: 'var(--blue-bg)',   fg: 'var(--blue)',   glow: 'rgba(37,99,235,0.12)' },
    purple: { bg: 'var(--purple-bg)', fg: 'var(--purple)', glow: 'rgba(124,58,237,0.12)' },
    amber:  { bg: 'var(--amber-bg)',  fg: 'var(--amber)',  glow: 'rgba(217,119,6,0.12)' },
  };
  const c = colors[color];
  return (
    <div
      className="rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: c.bg }}>
          <Icon className="w-5 h-5" style={{ color: c.fg }} strokeWidth={1.75} />
        </div>
      </div>
      <div className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>{value}</div>
      <div className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-3)' }}>{label}</div>
      {sub && <div className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>{sub}</div>}
    </div>
  );
}

// ── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('shimmer rounded-lg', className)} />;
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export function Dashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [days, setDays] = useState(30);
  const [newsVisible, setNewsVisible] = useState(false);

  const { data: client } = useQuery({ queryKey: ['me'], queryFn: api.auth.me });
  const { data: posts } = useQuery({ queryKey: ['blog'], queryFn: api.blog.list });
  const { data: media } = useQuery({ queryKey: ['media'], queryFn: api.media.list });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', days],
    queryFn: () => api.analytics.get(days),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: suggestionsData, isLoading: suggestionsLoading, refetch: refetchSuggestions } = useQuery({
    queryKey: ['suggestions'],
    queryFn: () => api.ai.getSuggestions(),
    staleTime: 30 * 60 * 1000,
    retry: false,
    enabled: false,
  });

  const { data: newsData, isLoading: newsLoading, refetch: refetchNews } = useQuery({
    queryKey: ['news'],
    queryFn: () => api.news.get(),
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: false,
    enabled: false,
  });

  const { data: creditsData } = useQuery({
    queryKey: ['ai-credits'],
    queryFn: () => api.ai.getCredits(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const publishMut = useMutation({
    mutationFn: api.publish.deploy,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });

  const autoBlogMut = useMutation({
    mutationFn: api.news.createBlogFromNews,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog'] });
    },
  });

  const publishedPosts = posts?.filter(p => p.isPublished).length ?? 0;
  const draftPosts = (posts?.length ?? 0) - publishedPosts;
  const dailyStats: { date: string; visitors: number }[] = analytics?.dailyStats ?? [];
  const suggestions: any[] = suggestionsData?.suggestions ?? [];
  const news: any[] = newsData?.news ?? [];

  const priorityColor: Record<string, string> = { high: 'var(--red)', medium: 'var(--amber)', low: 'var(--blue)' };
  const priorityBg: Record<string, string> = { high: 'var(--red-bg)', medium: 'var(--amber-bg)', low: 'var(--blue-bg)' };

  const siteUrl = client?.domain
    ? `https://${client.domain}`
    : `https://pub-61d0516b43b34d60b459185fed874027.r2.dev/${client?.slug}/index.html`;

  return (
    <div className="animate-fade-in space-y-6">

      {/* ── HERO HEADER ── */}
      <div className="relative overflow-hidden rounded-2xl px-6 py-7"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="blob blob-green blob-2 w-48 h-48 top-[-30%] right-[-5%]" />
          <div className="blob blob-lime blob-3 w-32 h-32 bottom-[-20%] left-[10%]" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-2.5"
              style={{ background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid rgba(22,163,74,0.20)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--green)' }} />
              {client?.plan?.toUpperCase() ?? 'BASIC'} Plan
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
              {client?.businessName ? `Welcome back, ${client.businessName}` : 'Your Dashboard'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
              {client?.domain ? `Live at ${client.domain}` : 'Manage your website content'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a href={siteUrl} target="_blank" rel="noopener noreferrer"
              className="btn-secondary !gap-1.5 !text-xs">
              <ExternalLink className="w-3.5 h-3.5" /> View Site
            </a>
            <button onClick={() => publishMut.mutate()} disabled={publishMut.isPending} className="publish-btn">
              {publishMut.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</>
                : publishMut.isSuccess
                ? <><CheckCircle2 className="w-4 h-4" /> Published!</>
                : <><Send className="w-4 h-4" /> Publish Site</>}
            </button>
          </div>
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total Visitors" value={analytics?.totalVisitors ?? '—'} sub={`Last ${days} days`} color="green" />
        <StatCard icon={Eye} label="Page Views" value={analytics?.totalPageViews ?? '—'} sub={analytics?.topCountry ? `Top: ${analytics.topCountry}` : undefined} color="blue" />
        <StatCard icon={FileText} label="Blog Posts" value={publishedPosts} sub={`${draftPosts} drafts`} color="purple" />
        <StatCard icon={Clock} label="Last Published" value={client?.lastPublishedAt ? new Date(client.lastPublishedAt).toLocaleDateString() : 'Never'} color="amber" />
      </div>

      {/* ── ANALYTICS CHART ── */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4" style={{ color: 'var(--green)' }} strokeWidth={1.75} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Visitor Analytics</span>
          </div>
          <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: 'var(--surface2)' }}>
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                style={days === d
                  ? { background: 'var(--surface)', color: 'var(--text)', boxShadow: 'var(--shadow-sm)' }
                  : { color: 'var(--text-3)' }}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        {analyticsLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : dailyStats.length > 0 ? (
          <BarChart data={dailyStats} />
        ) : (
          <div className="h-20 flex items-center justify-center text-xs" style={{ color: 'var(--text-3)' }}>
            No analytics data yet. Connect a domain to track visitors.
          </div>
        )}
        <div className="flex gap-4 mt-3">
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>
            Total: <strong style={{ color: 'var(--text)' }}>{analytics?.totalVisitors ?? 0}</strong> visitors
          </span>
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>
            <strong style={{ color: 'var(--text)' }}>{analytics?.totalPageViews ?? 0}</strong> page views
          </span>
        </div>
      </div>

      {/* ── AI CREDITS BAR ── */}
      {creditsData && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: 'var(--amber)' }} strokeWidth={1.75} />
              <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>AI Credits</span>
            </div>
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>
              {creditsData.monthlyRemaining?.toLocaleString()} / {creditsData.monthlyLimit?.toLocaleString()} remaining this month
            </span>
          </div>
          <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'var(--surface2)' }}>
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, ((creditsData.monthlyUsed ?? 0) / (creditsData.monthlyLimit ?? 1)) * 100)}%`,
                background: creditsData.monthlyRemaining < 5000 ? 'var(--red)' : 'var(--green)',
              }} />
          </div>
        </div>
      )}

      {/* ── QUICK ACTIONS ── */}
      <div>
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/site', icon: Globe, label: 'Edit Site', desc: 'Update content', color: 'var(--green)', bg: 'var(--green-bg)' },
            { to: '/blog/new', icon: PenTool, label: 'Write Blog', desc: 'New post', color: 'var(--blue)', bg: 'var(--blue-bg)' },
            { to: '/blog', icon: BookOpen, label: 'AI Auto-Blog', desc: 'Generate with AI', color: 'var(--purple)', bg: 'var(--purple-bg)' },
            { to: '/media', icon: Image, label: 'Media', desc: 'Upload files', color: 'var(--amber)', bg: 'var(--amber-bg)' },
          ].map(({ to, icon: Icon, label, desc, color, bg }) => (
            <Link key={to} to={to}
              className="group flex flex-col gap-3 p-4 rounded-2xl transition-all duration-150 hover:-translate-y-0.5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.75} />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{label}</div>
                <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── AI SMART SUGGESTIONS ── */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--purple)' }} strokeWidth={1.75} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Smart Suggestions</span>
            <span className="badge" style={{ background: 'var(--purple-bg)', color: 'var(--purple)' }}>AI</span>
          </div>
          <button
            onClick={() => refetchSuggestions()}
            disabled={suggestionsLoading}
            className="btn-secondary !py-1.5 !px-3 !text-xs"
          >
            {suggestionsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {suggestionsLoading ? 'Generating…' : 'Get Tips'}
          </button>
        </div>

        {suggestionsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : suggestions.length === 0 ? (
          <div className="py-6 text-center text-sm" style={{ color: 'var(--text-3)' }}>
            Click "Get Tips" to receive AI-powered growth recommendations for your website.
          </div>
        ) : (
          <div className="space-y-2">
            {suggestions.map((s: any, i: number) => (
              <div key={s.id ?? i} className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                  style={{ background: priorityColor[s.priority] ?? 'var(--border-strong)' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{s.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{s.description}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: priorityBg[s.priority] ?? 'var(--surface3)', color: priorityColor[s.priority] ?? 'var(--text-3)' }}>
                    {s.priority?.toUpperCase()}
                  </span>
                  {s.route && (
                    <button onClick={() => navigate(s.route)}
                      className="text-xs font-medium" style={{ color: 'var(--green)' }}>
                      {s.action} →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── INDUSTRY NEWS ── */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4" style={{ color: 'var(--blue)' }} strokeWidth={1.75} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Industry News</span>
            {client?.template?.niche && (
              <span className="badge" style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>
                {client.template.niche}
              </span>
            )}
          </div>
          <button
            onClick={() => { setNewsVisible(true); refetchNews(); }}
            disabled={newsLoading}
            className="btn-secondary !py-1.5 !px-3 !text-xs"
          >
            {newsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
            {newsLoading ? 'Fetching…' : 'Latest News'}
          </button>
        </div>

        {newsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : !newsVisible || news.length === 0 ? (
          <div className="py-6 text-center text-sm" style={{ color: 'var(--text-3)' }}>
            Click "Latest News" to fetch trending news for your industry niche.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {news.slice(0, 4).map((item: any, i: number) => (
              <div key={item.id ?? i} className="rounded-xl p-3 flex gap-3"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                {item.imageUrl && (
                  <img src={item.imageUrl} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold mb-1" style={{ color: 'var(--blue)' }}>
                    {item.source ?? 'News'}
                  </div>
                  <div className="text-xs font-semibold leading-snug mb-1 line-clamp-2" style={{ color: 'var(--text)' }}>
                    {item.title}
                  </div>
                  <div className="text-[10px] line-clamp-2" style={{ color: 'var(--text-3)' }}>
                    {item.summary}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-semibold hover:underline"
                      style={{ color: 'var(--blue)' }}
                    >
                      Read full story →
                    </a>
                    <button
                      onClick={() => autoBlogMut.mutate(item.id)}
                      disabled={autoBlogMut.isPending}
                      className="text-[10px] font-semibold"
                      style={{ color: 'var(--green)' }}
                    >
                      {autoBlogMut.isPending ? 'Creating...' : '✨ Create blog'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RECENT BLOG POSTS ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Recent Posts</h2>
          <Link to="/blog" className="text-xs font-medium" style={{ color: 'var(--green)' }}>View all →</Link>
        </div>
        {!posts || posts.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <FileText className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--border-strong)' }} strokeWidth={1.25} />
            <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>No blog posts yet. Start writing!</p>
            <Link to="/blog/new" className="btn-primary">Write First Post</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.slice(0, 4).map(post => (
              <Link key={post.id} to={`/blog/${post.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 group"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: post.isPublished ? 'var(--green)' : 'var(--border-strong)' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{post.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                    {post.isPublished ? `Published · ${new Date(post.publishedAt!).toLocaleDateString()}` : 'Draft'}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--text-3)' }} strokeWidth={1.75} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
