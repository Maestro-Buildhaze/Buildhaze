import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe, FileText, Image, Send, Loader2, CheckCircle2, Clock, ArrowRight,
  ExternalLink, TrendingUp, Sparkles, Newspaper, Zap, BarChart2,
  Users, Eye, RefreshCw, BookOpen, PenTool, MapPin, X, Activity,
  ChevronRight,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api, BlogPost } from '../lib/api';
import { useI18n } from '../lib/i18n';
import clsx from 'clsx';

// ── Mini bar chart ─────────────────────────────────────────────────────────
function BarChart({ data }: { data: { date: string; visitors: number }[] }) {
  const max = Math.max(...data.map(d => d.visitors), 1);
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="flex items-end gap-[3px] h-24 w-full">
      {data.map((d, i) => {
        const pct = Math.max((d.visitors / max) * 100, 2);
        const isHov = hovered === i;
        return (
          <div
            key={d.date}
            className="relative flex-1 flex flex-col items-center justify-end"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {isHov && (
              <div className="tooltip bottom-full mb-2 left-1/2 -translate-x-1/2">
                {d.visitors} · {d.date.slice(5)}
              </div>
            )}
            <div
              className="w-full rounded-sm transition-all duration-100"
              style={{
                height: `${pct}%`,
                background: d.visitors > 0
                  ? isHov ? 'var(--green-light)' : 'var(--green)'
                  : 'var(--border)',
                opacity: d.visitors > 0 ? (isHov ? 1 : 0.75) : 0.35,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Sk({ className }: { className?: string }) {
  return <div className={clsx('shimmer', className)} />;
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export function Dashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [days, setDays] = useState(30);
  const [newsVisible, setNewsVisible] = useState(false);

  const { data: client } = useQuery({ queryKey: ['me'], queryFn: api.auth.me });
  const { data: posts } = useQuery<BlogPost[]>({ queryKey: ['blog'], queryFn: () => api.blog.list() });

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
    staleTime: 30 * 60 * 1000,
    retry: false,
    enabled: false,
  });

  const { data: countriesData } = useQuery({
    queryKey: ['news-countries'],
    queryFn: () => api.news.getCountries(),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  const selectCountriesMut = useMutation({
    mutationFn: api.news.selectCountries,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setShowCountrySelector(false);
    },
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blog'] }),
  });

  const postToSiteMut = useMutation({
    mutationFn: api.news.postToSite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['site-config'] }),
  });

  const publishedPosts = posts?.filter(p => p.isPublished).length ?? 0;
  const draftPosts = (posts?.length ?? 0) - publishedPosts;
  const dailyStats: { date: string; visitors: number }[] = analytics?.dailyStats ?? [];
  const suggestions: any[] = suggestionsData?.suggestions ?? [];
  const news: any[] = newsData?.news ?? [];

  const priorityColor: Record<string, string> = { high: 'var(--red)', medium: 'var(--amber)', low: 'var(--blue)' };
  const priorityBg:    Record<string, string> = { high: 'var(--red-bg)', medium: 'var(--amber-bg)', low: 'var(--blue-bg)' };

  const siteUrl = client?.domain
    ? `https://${client.domain}`
    : `https://pub-61d0516b43b34d60b459185fed874027.r2.dev/${client?.slug}/index.html`;

  return (
    <div className="animate-fade-in space-y-4 stagger-children">

      {/* ══════════════════════════════════════════════════════════════
          HERO HEADER
      ══════════════════════════════════════════════════════════════ */}
      <div className="clay-card px-6 py-6 overflow-visible">
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <div className="blob blob-green blob-2 w-56 h-56 top-[-40%] right-[-4%]" />
          <div className="blob blob-lime blob-3 w-40 h-40 bottom-[-30%] left-[5%]" />
          <div className="blob blob-teal blob-4 w-28 h-28 top-[10%] left-[40%]" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold mb-3"
              style={{ background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-ring)' }}>
              <span className="status-dot live" />
              {client?.plan?.toUpperCase() ?? 'BASIC'} Plan
            </div>
            <h1 className="text-[1.6rem] font-extrabold tracking-tight leading-tight" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>
              {client?.businessName ? `Welcome back, ${client.businessName}` : 'Your Dashboard'}
            </h1>
            <p className="text-sm mt-1.5 font-medium" style={{ color: 'var(--text-3)' }}>
              {client?.domain
                ? <><span style={{ color: 'var(--text-2)' }}>Live at</span> {client.domain}</>
                : 'Manage your website content'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary !gap-1.5 !text-xs">
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

      {/* ══════════════════════════════════════════════════════════════
          BENTO GRID — TOP ROW
          [visitors | pageviews | posts | last published]
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            icon: Users, label: 'Total Visitors', color: 'var(--green)', bg: 'var(--green-bg)',
            value: analytics?.totalVisitors ?? '—',
            sub: `Last ${days} days`,
          },
          {
            icon: Eye, label: 'Page Views', color: 'var(--blue)', bg: 'var(--blue-bg)',
            value: analytics?.totalPageViews ?? '—',
            sub: analytics?.topCountry ? `Top: ${analytics.topCountry}` : `Last ${days} days`,
          },
          {
            icon: FileText, label: 'Blog Posts', color: 'var(--cyan)', bg: 'var(--cyan-bg)',
            value: publishedPosts,
            sub: `${draftPosts} draft${draftPosts !== 1 ? 's' : ''}`,
          },
          {
            icon: Clock, label: 'Last Published', color: 'var(--amber)', bg: 'var(--amber-bg)',
            value: client?.lastPublishedAt ? new Date(client.lastPublishedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : 'Never',
            sub: client?.lastPublishedAt ? new Date(client.lastPublishedAt).getFullYear().toString() : 'Not yet',
          },
        ].map(({ icon: Icon, label, color, bg, value, sub }) => (
          <div key={label} className="stat-tile clay-card group">
            <div className="stat-tile-icon" style={{ background: bg }}>
              <Icon className="w-5 h-5" style={{ color }} strokeWidth={1.75} />
            </div>
            <div>
              <div className="stat-tile-value tabular-nums">{value}</div>
              <div className="stat-tile-label">{label}</div>
              {sub && <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-4)' }}>{sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          BENTO GRID — MAIN ROW
          [analytics chart (wide) | quick actions (narrow)]
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Analytics chart — 2 cols */}
        <div className="clay-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--green-bg)' }}>
                <BarChart2 className="w-3.5 h-3.5" style={{ color: 'var(--green)' }} strokeWidth={2} />
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Visitor Analytics</span>
            </div>
            <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => setDays(d)}
                  className={clsx(
                    'px-2.5 py-1 rounded-md text-xs font-semibold transition-all',
                    days === d ? 'bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-xs)]' : 'text-[var(--text-4)]'
                  )}>
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {analyticsLoading ? (
            <Sk className="h-24 w-full" />
          ) : dailyStats.length > 0 ? (
            <BarChart data={dailyStats} />
          ) : (
            <div className="h-24 flex flex-col items-center justify-center gap-2 rounded-xl"
              style={{ background: 'var(--surface2)', border: '1px dashed var(--border)' }}>
              <Activity className="w-5 h-5" style={{ color: 'var(--text-4)' }} strokeWidth={1.5} />
              <span className="text-xs" style={{ color: 'var(--text-4)' }}>No data yet · connect a domain to track visitors</span>
            </div>
          )}

          <div className="flex items-center gap-5 mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <div>
              <span className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>Visitors </span>
              <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text)' }}>{(analytics?.totalVisitors ?? 0).toLocaleString()}</span>
            </div>
            <div className="divider-vertical h-4" />
            <div>
              <span className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>Page views </span>
              <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text)' }}>{(analytics?.totalPageViews ?? 0).toLocaleString()}</span>
            </div>
            {analytics?.topCountry && (
              <>
                <div className="divider-vertical h-4" />
                <div>
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>Top country </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{analytics.topCountry}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick Actions — 1 col */}
        <div className="clay-card p-5 flex flex-col gap-3">
          <div className="section-header !mb-1">
            <span className="section-title">Quick Actions</span>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            {[
              { to: '/site',     icon: Globe,    label: 'Edit Site',    desc: 'Update content',     color: 'var(--green)',  bg: 'var(--green-bg)' },
              { to: '/blog/new', icon: PenTool,  label: 'Write Post',   desc: 'New blog entry',     color: 'var(--blue)',   bg: 'var(--blue-bg)' },
              { to: '/blog',     icon: BookOpen, label: 'AI Auto-Blog', desc: 'Generate with AI',   color: 'var(--cyan)',  bg: 'var(--cyan-bg)' },
              { to: '/media',    icon: Image,    label: 'Media Library',desc: 'Upload files',        color: 'var(--amber)',  bg: 'var(--amber-bg)' },
              { to: '/news',     icon: Newspaper,label: 'Industry News', desc: 'Trending topics',   color: 'var(--green)',  bg: 'var(--green-bg)' },
            ].map(({ to, icon: Icon, label, desc, color, bg }) => (
              <Link key={to} to={to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl group transition-all duration-150"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                  <Icon className="w-3.5 h-3.5" style={{ color }} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{label}</div>
                  <div className="text-[10px]" style={{ color: 'var(--text-4)' }}>{desc}</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-3)' }} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          BENTO GRID — SECOND ROW
          [AI Credits + Suggestions | Recent Posts]
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Left: AI Credits + Smart Suggestions */}
        <div className="flex flex-col gap-3 lg:col-span-1">

          {/* Credits bar */}
          {creditsData && (
            <div className="clay-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--amber-bg)' }}>
                    <Zap className="w-3.5 h-3.5" style={{ color: 'var(--amber)' }} strokeWidth={2} />
                  </div>
                  <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>AI Credits</span>
                </div>
                <span className="text-[11px] tabular-nums font-medium" style={{ color: 'var(--text-3)' }}>
                  {(creditsData.monthlyRemaining ?? 0).toLocaleString()} left
                </span>
              </div>
              <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'var(--surface2)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, ((creditsData.monthlyUsed ?? 0) / (creditsData.monthlyLimit ?? 1)) * 100)}%`,
                    background: (creditsData.monthlyRemaining ?? 0) < 5000 ? 'var(--red)' : 'var(--green)',
                  }} />
              </div>
              <div className="text-[10px] mt-1.5 text-right" style={{ color: 'var(--text-4)' }}>
                {(creditsData.monthlyUsed ?? 0).toLocaleString()} / {(creditsData.monthlyLimit ?? 0).toLocaleString()} used this month
              </div>
            </div>
          )}

          {/* Smart Suggestions */}
          <div className="clay-card p-4 flex-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-bg)' }}>
                  <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} strokeWidth={1.75} />
                </div>
                <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>Smart Suggestions</span>
                <span className="badge badge-accent text-[9px]">AI</span>
              </div>
              <button onClick={() => refetchSuggestions()} disabled={suggestionsLoading}
                className="btn-ghost !py-1 !px-2 !text-xs">
                {suggestionsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              </button>
            </div>

            {suggestionsLoading ? (
              <div className="space-y-2">{[1,2].map(i => <Sk key={i} className="h-12 rounded-xl" />)}</div>
            ) : suggestions.length === 0 ? (
              <div className="py-5 text-center text-xs" style={{ color: 'var(--text-4)' }}>
                Click ↻ to get AI growth tips
              </div>
            ) : (
              <div className="space-y-1.5">
                {suggestions.slice(0, 3).map((s: any, i: number) => (
                  <div key={s.id ?? i} className="flex items-start gap-2.5 p-2.5 rounded-xl"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: priorityColor[s.priority] ?? 'var(--border-strong)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold line-clamp-1" style={{ color: 'var(--text)' }}>{s.title}</div>
                      <div className="text-[10px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-3)' }}>{s.description}</div>
                    </div>
                    {s.route && (
                      <button onClick={() => navigate(s.route)} className="flex-shrink-0 text-[10px] font-bold" style={{ color: 'var(--green)' }}>
                        Go →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Posts */}
        <div className="clay-card p-5 lg:col-span-2">
          <div className="section-header">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--cyan-bg)' }}>
                <FileText className="w-3.5 h-3.5" style={{ color: 'var(--cyan)' }} strokeWidth={1.75} />
              </div>
              <span className="section-title">Recent Posts</span>
            </div>
            <Link to="/blog" className="section-action flex items-center gap-0.5">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {!posts || posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-2xl"
              style={{ background: 'var(--surface2)', border: '1px dashed var(--border)' }}>
              <FileText className="w-8 h-8" style={{ color: 'var(--border-strong)' }} strokeWidth={1.25} />
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>No blog posts yet</p>
              <Link to="/blog/new" className="btn-primary !py-1.5 !px-4 !text-xs">Write First Post</Link>
            </div>
          ) : (
            <div className="space-y-1.5">
              {posts.slice(0, 6).map(post => (
                <Link key={post.id} to={`/blog/${post.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl group transition-all duration-150"
                  style={{ background: 'var(--surface2)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface3)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}
                >
                  {post.coverImage ? (
                    <img src={post.coverImage} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--surface3)' }}>
                      <FileText className="w-4 h-4" style={{ color: 'var(--text-4)' }} strokeWidth={1.5} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold line-clamp-1" style={{ color: 'var(--text)' }}>{post.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: post.isPublished ? 'var(--green)' : 'var(--text-4)' }} />
                      <span className="text-[11px]" style={{ color: 'var(--text-4)' }}>
                        {post.isPublished
                          ? `Published · ${new Date(post.publishedAt!).toLocaleDateString('en', { month: 'short', day: 'numeric' })}`
                          : 'Draft'}
                      </span>
                      {post.category && (
                        <span className="text-[10px] px-1.5 py-px rounded-full"
                          style={{ background: 'var(--surface)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                          {post.category.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
                    style={{ color: 'var(--text-3)' }} />
                </Link>
              ))}
            </div>
          )}

          {(posts?.length ?? 0) > 6 && (
            <Link to="/blog" className="flex items-center justify-center gap-1.5 mt-3 text-xs font-semibold py-2 rounded-xl transition-all"
              style={{ color: 'var(--text-3)', background: 'var(--surface2)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
            >
              View all {posts?.length} posts <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          INDUSTRY NEWS
      ══════════════════════════════════════════════════════════════ */}
      <div className="clay-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--blue-bg)' }}>
              <Newspaper className="w-3.5 h-3.5" style={{ color: 'var(--blue)' }} strokeWidth={1.75} />
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Industry News</span>
            {client?.template?.niche && (
              <span className="badge badge-blue">{client.template.niche}</span>
            )}
            {newsData?.countries && newsData.countries.length > 0 && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-4)' }}>
                <MapPin className="w-3 h-3" />{newsData.countries.join(', ')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowCountrySelector(true)}
              className="btn-secondary !py-1.5 !px-3 !text-xs !gap-1.5">
              <MapPin className="w-3 h-3" /> Countries
            </button>
            <button onClick={() => { setNewsVisible(true); refetchNews(); }} disabled={newsLoading}
              className="btn-secondary !py-1.5 !px-3 !text-xs !gap-1.5">
              {newsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
              {newsLoading ? 'Fetching…' : 'Latest News'}
            </button>
          </div>
        </div>

        {newsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <Sk key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : !newsVisible || news.length === 0 ? (
          <div className="py-8 text-center text-sm rounded-xl"
            style={{ background: 'var(--surface2)', border: '1px dashed var(--border)' }}>
            <Newspaper className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--text-4)' }} strokeWidth={1.5} />
            <span style={{ color: 'var(--text-4)' }}>Click "Latest News" to fetch trending stories for your niche</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {news.slice(0, 4).map((item: any, i: number) => (
              <div key={item.id ?? i} className="rounded-xl p-3 flex gap-3 transition-colors"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                {item.imageUrl && (
                  <img src={item.imageUrl} alt="" className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold" style={{ color: 'var(--blue)' }}>{item.source ?? 'News'}</span>
                    {item.sourceCountry && (
                      <span className="text-[9px] px-1.5 py-px rounded"
                        style={{ background: 'var(--surface3)', color: 'var(--text-3)' }}>
                        {item.sourceCountryName || item.sourceCountry}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold leading-snug mb-1 line-clamp-2" style={{ color: 'var(--text)' }}>
                    {item.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] font-semibold hover:underline" style={{ color: 'var(--blue)' }}>
                      Read →
                    </a>
                    <button onClick={() => autoBlogMut.mutate(item.id)} disabled={autoBlogMut.isPending}
                      className="text-[10px] font-semibold" style={{ color: 'var(--green)' }}>
                      {autoBlogMut.isPending ? 'Creating…' : '✨ Blog post'}
                    </button>
                    <button onClick={() => postToSiteMut.mutate(item.id)} disabled={postToSiteMut.isPending}
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--cyan-bg)', color: 'var(--cyan)' }}>
                      {postToSiteMut.isPending ? 'Posting…' : '🚀 Post to site'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          COUNTRY SELECTOR MODAL
      ══════════════════════════════════════════════════════════════ */}
      {showCountrySelector && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCountrySelector(false); }}>
          <div className="modal-panel max-w-md">
            <div className="modal-header">
              <span className="font-semibold" style={{ color: 'var(--text)' }}>Select Countries for News</span>
              <button onClick={() => setShowCountrySelector(false)} className="btn-icon sm">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                Choose a country to get industry news from:
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {countriesData?.countries.map((country) => (
                  <label key={country.code}
                    className="flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-colors"
                    style={{ border: `1px solid ${selectedCountries[0] === country.code ? 'var(--green)' : 'var(--border)'}`, background: selectedCountries[0] === country.code ? 'var(--green-bg)' : 'var(--surface2)' }}
                  >
                    <input type="radio" name="country" className="sr-only"
                      checked={selectedCountries[0] === country.code}
                      onChange={() => setSelectedCountries([country.code])} />
                    <span className="text-base">{country.flag}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{country.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowCountrySelector(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={() => selectCountriesMut.mutate(selectedCountries)}
                  disabled={selectedCountries.length === 0 || selectCountriesMut.isPending}
                  className="btn-primary flex-1">
                  {selectCountriesMut.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
