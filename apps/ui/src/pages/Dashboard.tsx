import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe, FileText, Image, Send, Loader2, CheckCircle2, Clock, ArrowRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';
import clsx from 'clsx';

type StatVariant = 'green' | 'yellow' | 'black' | 'outline';

function StatCard({
  icon: Icon, label, value, sub, variant = 'outline',
}: {
  icon: typeof Globe;
  label: string;
  value: string | number;
  sub?: string;
  variant?: StatVariant;
}) {
  const styles: Record<StatVariant, React.CSSProperties> = {
    green: {
      background: 'var(--green)',
      border: 'none',
      color: '#fff',
    },
    yellow: {
      background: 'var(--yellow-light)',
      border: 'none',
      color: '#1a1a1a',
    },
    black: {
      background: 'var(--text)',
      border: 'none',
      color: 'var(--bg)',
    },
    outline: {
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      color: 'var(--text)',
    },
  };

  const iconBg: Record<StatVariant, React.CSSProperties> = {
    green: { background: 'rgba(255,255,255,0.18)' },
    yellow: { background: 'rgba(0,0,0,0.10)' },
    black: { background: 'rgba(255,255,255,0.12)' },
    outline: { background: 'var(--green-bg)' },
  };

  const iconColor: Record<StatVariant, string> = {
    green: '#fff',
    yellow: '#1a1a1a',
    black: 'var(--bg)',
    outline: 'var(--green)',
  };

  const subColor: Record<StatVariant, string> = {
    green: 'rgba(255,255,255,0.65)',
    yellow: 'rgba(0,0,0,0.50)',
    black: 'rgba(255,255,255,0.55)',
    outline: 'var(--text-3)',
  };

  return (
    <div
      className="rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        ...styles[variant],
        boxShadow: variant === 'outline'
          ? '0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.03)'
          : '0 4px 20px rgba(0,0,0,0.10)',
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
        style={iconBg[variant]}
      >
        <Icon className="w-4 h-4" style={{ color: iconColor[variant] }} strokeWidth={1.75} />
      </div>
      <div className="text-2xl font-bold tracking-tight mb-0.5">{value}</div>
      <div className="text-xs font-medium">{label}</div>
      {sub && (
        <div className="text-[11px] mt-1" style={{ color: subColor[variant] }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function Dashboard() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: client } = useQuery({ queryKey: ['me'], queryFn: api.auth.me });
  const { data: posts } = useQuery({ queryKey: ['blog'], queryFn: api.blog.list });
  const { data: media } = useQuery({ queryKey: ['media'], queryFn: api.media.list });

  const publishMut = useMutation({
    mutationFn: api.publish.deploy,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });

  const publishedPosts = posts?.filter((p) => p.isPublished).length ?? 0;
  const draftPosts = (posts?.length ?? 0) - publishedPosts;

  return (
    <div className="animate-fade-in space-y-8">

      {/* ── Hero header with blobs ── */}
      <div
        className="relative overflow-hidden rounded-3xl px-6 py-8 sm:px-8 sm:py-10"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Blobs inside hero */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="blob blob-green blob-2 w-48 h-48 top-[-30%] right-[-5%]" />
          <div className="blob blob-yellow blob-3 w-36 h-36 bottom-[-20%] left-[10%]" />
          <div className="blob blob-lime w-32 h-32 top-[20%] right-[25%]" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3"
              style={{ background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid rgba(22,163,74,0.18)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
              {client?.domain ?? 'SiteCMS'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
              {typeof t.welcomeMsg === 'function'
                ? t.welcomeMsg(client?.businessName ?? '…')
                : t.welcomeMsg}
            </h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--text-3)' }}>
              {client?.domain
                ? (typeof t.liveAt === 'function' ? t.liveAt(client.domain) : t.liveAt)
                : t.manageContent}
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* View Live Website Button */}
            <a
              href={`https://${client?.domain || `${client?.slug}.cms-platform.com`}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 hover:-translate-y-0.5"
              style={{ 
                background: 'var(--surface)', 
                border: '1px solid var(--border)',
                color: 'var(--text)'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <ExternalLink className="w-4 h-4" />
              Vezi Site-ul
            </a>
            
            {/* Publish Button */}
            <button
              onClick={() => publishMut.mutate()}
              disabled={publishMut.isPending}
              className="publish-btn flex-shrink-0"
            >
              {publishMut.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" />{t.publishing}</>
                : publishMut.isSuccess
                ? <><CheckCircle2 className="w-4 h-4" />Published!</>
                : <><Send className="w-4 h-4" />{t.publishNow}</>}
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={FileText}
          label={t.publishedPosts}
          value={publishedPosts}
          sub={`${draftPosts} ${t.drafts}`}
          variant="green"
        />
        <StatCard
          icon={Image}
          label={t.mediaFiles}
          value={media?.length ?? 0}
          variant="yellow"
        />
        <StatCard
          icon={Globe}
          label={t.template}
          value={client?.template?.name ?? '—'}
          sub={client?.template?.niche ?? undefined}
          variant="black"
        />
        <StatCard
          icon={Clock}
          label={t.lastPublished}
          value={
            client?.lastPublishedAt
              ? new Date(client.lastPublishedAt).toLocaleDateString()
              : t.never
          }
          variant="outline"
        />
      </div>

      {/* ── Recent posts ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>{t.recentPosts}</h2>
          <Link
            to="/blog/new"
            className="btn-secondary !py-1.5 !px-3 text-xs"
          >
            {t.newPost}
          </Link>
        </div>

        {!posts || posts.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--green-bg)' }}
            >
              <FileText className="w-6 h-6" style={{ color: 'var(--green)' }} strokeWidth={1.5} />
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>{t.noPosts}</p>
            <Link to="/blog/new" className="btn-primary">{t.writeFirst}</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.slice(0, 5).map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.id}`}
                className="flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-150 group"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLElement).style.transform = '';
                }}
              >
                {/* Status dot */}
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: post.isPublished ? 'var(--green)' : 'var(--border-strong)' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                    {post.title}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                    {post.isPublished
                      ? `${t.published} · ${new Date(post.publishedAt!).toLocaleDateString()}`
                      : t.draft}
                  </div>
                </div>
                <ArrowRight
                  className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0 duration-150"
                  style={{ color: 'var(--text-3)' }}
                  strokeWidth={1.75}
                />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick actions ── */}
      <div>
        <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text)' }}>{t.quickActions}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              to: '/site',
              icon: Globe,
              label: t.editSite,
              desc: t.editSiteDesc,
              accent: 'green' as const,
            },
            {
              to: '/blog/new',
              icon: FileText,
              label: t.writeBlog,
              desc: t.writeBlogDesc,
              accent: 'yellow' as const,
            },
            {
              to: '/media',
              icon: Image,
              label: t.uploadMedia,
              desc: t.uploadMediaDesc,
              accent: 'black' as const,
            },
          ].map(({ to, icon: Icon, label, desc, accent }) => {
            const accentStyles: Record<string, React.CSSProperties> = {
              green: { background: 'var(--green-bg)', color: 'var(--green)' },
              yellow: { background: 'var(--yellow-bg)', color: 'var(--yellow)' },
              black: { background: 'var(--surface2)', color: 'var(--text-2)' },
            };
            return (
              <Link
                key={to}
                to={to}
                className="group flex flex-col gap-4 p-5 rounded-2xl transition-all duration-150"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.07)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={accentStyles[accent]}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{label}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{desc}</div>
                </div>
                <ArrowRight
                  className="w-4 h-4 mt-auto opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0"
                  style={{ color: 'var(--text-3)' }}
                  strokeWidth={1.75}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
