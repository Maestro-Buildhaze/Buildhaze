import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Globe, Mail, User, Calendar, CheckCircle2, AlertCircle,
  BarChart3, Users, Eye, FileText, Image as ImageIcon, Settings,
  ExternalLink, RefreshCw, Loader2, TrendingUp, MousePointer,
  Clock, Server, Database, HardDrive, Zap, Activity,
  Copy, Edit, Layers, Send
} from 'lucide-react';
import { api } from '../lib/api';

type Tab = 'overview' | 'statistics' | 'content' | 'media' | 'blog' | 'history' | 'settings';

export function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Fetch client details
  const { data: client, isLoading } = useQuery({
    queryKey: ['admin-client', id],
    queryFn: () => api.admin.getClient(id!),
    enabled: !!id,
  });

  // Fetch client statistics
  const { data: stats } = useQuery({
    queryKey: ['admin-client-stats', id],
    queryFn: () => api.admin.getClientStats(id!),
    enabled: !!id && activeTab === 'statistics',
  });

  // Fetch publish history
  const { data: history } = useQuery({
    queryKey: ['admin-client-history', id],
    queryFn: () => api.admin.getClientPublishHistory(id!, 20),
    enabled: !!id && activeTab === 'history',
  });

  // Fetch blog posts
  const { data: blogPosts } = useQuery({
    queryKey: ['admin-client-blog', id],
    queryFn: () => api.admin.getClientBlogPosts(id!),
    enabled: !!id && activeTab === 'blog',
  });

  // Fetch media files
  const { data: media } = useQuery({
    queryKey: ['admin-client-media', id],
    queryFn: () => api.admin.getClientMedia(id!),
    enabled: !!id && activeTab === 'media',
  });

  // Publish mutation
  const publishMut = useMutation({
    mutationFn: () => api.admin.publishClient(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-client', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-client-history', id] });
    },
  });

  if (isLoading || !client) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const liveUrl = client.domain 
    ? `https://${client.domain}` 
    : `https://pub-61d0516b43b34d60b459185fed874027.r2.dev/${client.slug}/index.html`;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/clients')}
          className="flex items-center gap-2 text-sm text-warm-500 hover:text-warm-700 dark:hover:text-warm-300 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Înapoi la Clienți
        </button>

        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-1">{client.businessName}</h1>
                <div className="flex items-center gap-3 text-sm opacity-90">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    {client.email}
                  </span>
                  <span>•</span>
                  <span className="font-mono text-xs bg-white/20 px-2 py-0.5 rounded-md">
                    {client.slug}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-sm font-medium transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Vezi Site Live
              </a>
              <button
                onClick={() => {
                  const token = localStorage.getItem('admin_token');
                  const url = `${import.meta.env.VITE_CLIENT_UI_URL || 'https://sitecms-admin.netlify.app'}/cms/${client.id}?adminToken=${token}`;
                  window.open(url, '_blank');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white text-amber-600 hover:bg-amber-50 rounded-xl text-sm font-medium transition-all shadow-lg"
              >
                <Settings className="w-4 h-4" />
                Editează CMS
              </button>
              <button
                onClick={() => publishMut.mutate()}
                disabled={publishMut.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              >
                {publishMut.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : client.lastPublishedAt ? (
                  <RefreshCw className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {client.lastPublishedAt ? 'Re-publică' : 'Publică'}
              </button>
            </div>
          </div>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <InfoCard 
              icon={<Globe className="w-4 h-4" />}
              label="Plan"
              value={client.plan?.toUpperCase() || 'BASIC'}
            />
            <InfoCard 
              icon={<Layers className="w-4 h-4" />}
              label="Template"
              value={client.template?.name || '—'}
            />
            <InfoCard 
              icon={<Activity className="w-4 h-4" />}
              label="Status"
              value={client.isActive ? 'Activ' : 'Inactiv'}
            />
            <InfoCard 
              icon={<Calendar className="w-4 h-4" />}
              label="Ultima Publicare"
              value={client.lastPublishedAt 
                ? new Date(client.lastPublishedAt).toLocaleDateString('ro-RO')
                : 'Niciodată'}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-warm-900 rounded-xl shadow-soft border border-warm-200 dark:border-warm-800 overflow-hidden">
        <div className="border-b border-warm-200 dark:border-warm-800 overflow-x-auto">
          <div className="flex">
            <TabButton 
              active={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              icon={<Eye className="w-4 h-4" />}
              label="Overview"
            />
            <TabButton 
              active={activeTab === 'statistics'}
              onClick={() => setActiveTab('statistics')}
              icon={<BarChart3 className="w-4 h-4" />}
              label="Statistici"
            />
            <TabButton 
              active={activeTab === 'content'}
              onClick={() => setActiveTab('content')}
              icon={<FileText className="w-4 h-4" />}
              label="Content"
            />
            <TabButton 
              active={activeTab === 'media'}
              onClick={() => setActiveTab('media')}
              icon={<ImageIcon className="w-4 h-4" />}
              label="Media"
            />
            <TabButton 
              active={activeTab === 'blog'}
              onClick={() => setActiveTab('blog')}
              icon={<FileText className="w-4 h-4" />}
              label="Blog"
            />
            <TabButton 
              active={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
              icon={<Clock className="w-4 h-4" />}
              label="Istoric"
            />
            <TabButton 
              active={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
              icon={<Settings className="w-4 h-4" />}
              label="Setări"
            />
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab client={client} />}
          {activeTab === 'statistics' && <StatisticsTab stats={stats} />}
          {activeTab === 'content' && <ContentTab clientId={id!} />}
          {activeTab === 'media' && <MediaTab media={media || []} />}
          {activeTab === 'blog' && <BlogTab posts={blogPosts || []} clientId={id!} />}
          {activeTab === 'history' && <HistoryTab history={history?.history || []} />}
          {activeTab === 'settings' && <SettingsTab client={client} />}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active 
          ? 'border-amber-500 text-amber-600 dark:text-amber-400' 
          : 'border-transparent text-warm-600 dark:text-warm-400 hover:text-warm-900 dark:hover:text-warm-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-xs opacity-80 mb-1">
        {icon}
        {label}
      </div>
      <div className="font-semibold truncate">{value}</div>
    </div>
  );
}

function OverviewTab({ client }: { client: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-warm-900 dark:text-warm-100 mb-3">Informații Client</h3>
          <div className="bg-warm-50 dark:bg-warm-800/50 rounded-xl p-4 space-y-3">
            <InfoRow label="ID Client" value={client.id} mono />
            <InfoRow label="Email" value={client.email} />
            <InfoRow label="Nume Business" value={client.businessName} />
            <InfoRow label="Slug" value={client.slug} mono />
            <InfoRow label="Plan" value={client.plan} />
            <InfoRow label="Domeniu Custom" value={client.domain || '—'} />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-warm-900 dark:text-warm-100 mb-3">Template & R2</h3>
          <div className="bg-warm-50 dark:bg-warm-800/50 rounded-xl p-4 space-y-3">
            <InfoRow label="Template" value={client.template?.name || 'Niciun template'} />
            <InfoRow label="Niche" value={client.template?.niche || '—'} />
            <InfoRow label="R2 Key" value={client.r2BucketKey || `${client.slug}/`} mono />
            <InfoRow label="Creat" value={new Date(client.createdAt).toLocaleString('ro-RO')} />
            <InfoRow label="Actualizat" value={new Date(client.updatedAt).toLocaleString('ro-RO')} />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {client._count && (
        <div className="grid grid-cols-3 gap-4">
          <QuickStat icon={<FileText className="w-5 h-5" />} label="Articole Blog" value={client._count.blogPosts || 0} color="amber" />
          <QuickStat icon={<ImageIcon className="w-5 h-5" />} label="Fișiere Media" value={client._count.mediaFiles || 0} color="orange" />
          <QuickStat icon={<Layers className="w-5 h-5" />} label="Pagini" value={client._count.pages || 0} color="rose" />
        </div>
      )}
    </div>
  );
}

function StatisticsTab({ stats }: { stats: any }) {
  if (!stats) {
    return (
      <div className="text-center py-12 text-warm-500">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Se încarcă statisticile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-warm-900 dark:text-warm-100 mb-1">Statistici Cloudflare</h3>
        <p className="text-sm text-warm-500">Date în timp real din Cloudflare Analytics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox 
          icon={<Eye className="w-5 h-5" />}
          label="Vizite Totale"
          value={stats.totalVisits?.toLocaleString() || '0'}
          color="blue"
          trend={stats.visitsTrend}
        />
        <StatBox 
          icon={<Users className="w-5 h-5" />}
          label="Vizitatori Unici"
          value={stats.uniqueVisitors?.toLocaleString() || '0'}
          color="emerald"
          trend={stats.visitorsTrend}
        />
        <StatBox 
          icon={<MousePointer className="w-5 h-5" />}
          label="Pageviews"
          value={stats.pageViews?.toLocaleString() || '0'}
          color="amber"
          trend={stats.pageViewsTrend}
        />
        <StatBox 
          icon={<Clock className="w-5 h-5" />}
          label="Bounce Rate"
          value={`${stats.bounceRate || 0}%`}
          color="rose"
          trend={stats.bounceTrend}
        />
      </div>

      {/* Top Pages */}
      {stats.topPages && stats.topPages.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-warm-900 dark:text-warm-100 mb-3">Pagini Populare</h4>
          <div className="bg-white dark:bg-warm-800 rounded-xl border border-warm-200 dark:border-warm-700 overflow-hidden">
            {stats.topPages.map((page: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-warm-100 dark:border-warm-700 last:border-b-0">
                <span className="font-mono text-sm">{page.path}</span>
                <span className="text-sm font-semibold text-amber-600">{page.views?.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visitors by Country */}
      {stats.byCountry && stats.byCountry.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-warm-900 dark:text-warm-100 mb-3">Vizitatori după Țară</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.byCountry.slice(0, 8).map((c: any, i: number) => (
              <div key={i} className="bg-warm-50 dark:bg-warm-800/50 rounded-xl p-3">
                <div className="text-2xl mb-1">{c.flag || '🌍'}</div>
                <div className="text-sm font-medium">{c.name || c.code}</div>
                <div className="text-xs text-warm-500">{c.visits?.toLocaleString()} vizite</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div className="flex gap-3">
          <Zap className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">Tip pentru Statistici</h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Pentru a vedea statistici reale, asigură-te că Cloudflare Web Analytics este activat
              pentru domeniul {stats.domain || 'site-ului'}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentTab({ clientId }: { clientId: string }) {
  const { data: config } = useQuery({
    queryKey: ['admin-client-config', clientId],
    queryFn: () => api.admin.getClientConfig(clientId),
  });

  if (!config) return <Loader2 className="w-6 h-6 animate-spin mx-auto my-12" />;

  const configEntries = Object.entries(config.configs || {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-warm-900 dark:text-warm-100">Conținut Site</h3>
          <p className="text-sm text-warm-500">{configEntries.length} câmpuri configurate</p>
        </div>
        <button 
          onClick={() => {
            const token = localStorage.getItem('admin_token');
            window.open(`${import.meta.env.VITE_CLIENT_UI_URL || 'https://sitecms-admin.netlify.app'}/cms/${clientId}?adminToken=${token}`, '_blank');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg shadow transition-colors"
        >
          <Edit className="w-4 h-4" />
          Editează în CMS
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {configEntries.map(([key, value]: [string, any]) => (
          <div key={key} className="bg-warm-50 dark:bg-warm-800/50 rounded-xl p-3">
            <div className="text-xs text-warm-500 mb-1 font-mono">{key}</div>
            <div className="text-sm font-medium text-warm-900 dark:text-warm-100 truncate">
              {typeof value === 'string' ? value : value?.value || JSON.stringify(value)}
            </div>
          </div>
        ))}
      </div>

      {configEntries.length === 0 && (
        <div className="text-center py-12 text-warm-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nu există conținut configurat încă</p>
        </div>
      )}
    </div>
  );
}

function MediaTab({ media }: { media: any[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-warm-900 dark:text-warm-100">Bibliotecă Media</h3>
          <p className="text-sm text-warm-500">{media.length} fișiere</p>
        </div>
      </div>

      {media.length === 0 ? (
        <div className="text-center py-12 text-warm-500">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Niciun fișier media</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {media.map((file: any) => (
            <div key={file.id} className="group bg-white dark:bg-warm-800 rounded-xl border border-warm-200 dark:border-warm-700 overflow-hidden hover:shadow-soft-lg transition-shadow">
              <div className="aspect-square bg-warm-100 dark:bg-warm-900 relative">
                {file.mimeType?.startsWith('image/') ? (
                  <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="w-8 h-8 text-warm-400" />
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate">{file.name}</p>
                <p className="text-xs text-warm-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BlogTab({ posts, clientId }: { posts: any[]; clientId: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-warm-900 dark:text-warm-100">Articole Blog</h3>
          <p className="text-sm text-warm-500">{posts.length} articole</p>
        </div>
        <button 
          onClick={() => {
            const token = localStorage.getItem('admin_token');
            window.open(`${import.meta.env.VITE_CLIENT_UI_URL || 'https://sitecms-admin.netlify.app'}/cms/${clientId}/blog?adminToken=${token}`, '_blank');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Edit className="w-4 h-4" />
          Editează Articole
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12 text-warm-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Niciun articol publicat</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post: any) => (
            <div key={post.id} className="bg-white dark:bg-warm-800 rounded-xl border border-warm-200 dark:border-warm-700 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-warm-900 dark:text-warm-100 mb-1">{post.title}</h4>
                  <p className="text-sm text-warm-600 dark:text-warm-400 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-warm-500">
                    <span className={`px-2 py-0.5 rounded-full ${
                      post.isPublished 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-warm-100 text-warm-600'
                    }`}>
                      {post.isPublished ? 'Publicat' : 'Draft'}
                    </span>
                    {post.publishedAt && (
                      <span>{new Date(post.publishedAt).toLocaleDateString('ro-RO')}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryTab({ history }: { history: any[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-warm-900 dark:text-warm-100">Istoric Publicări</h3>
        <p className="text-sm text-warm-500">Ultimele {history.length} publicări</p>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12 text-warm-500">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nicio publicare încă</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((entry: any) => (
            <div key={entry.id} className="flex items-center gap-3 bg-white dark:bg-warm-800 rounded-xl border border-warm-200 dark:border-warm-700 p-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                entry.status === 'success' 
                  ? 'bg-emerald-100 text-emerald-600' 
                  : entry.status === 'failed'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-amber-100 text-amber-600'
              }`}>
                {entry.status === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
                 entry.status === 'failed' ? <AlertCircle className="w-5 h-5" /> :
                 <Loader2 className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {entry.status === 'success' ? 'Publicat cu succes' : 
                     entry.status === 'failed' ? 'Publicare eșuată' : 'În progres'}
                  </span>
                  {entry.duration && (
                    <span className="text-xs text-warm-500">{entry.duration}ms</span>
                  )}
                </div>
                <div className="text-xs text-warm-500 mt-0.5">
                  {new Date(entry.createdAt).toLocaleString('ro-RO')}
                  {entry.adminId && <span className="ml-2 text-amber-600">(Admin)</span>}
                </div>
                {entry.error && (
                  <div className="text-xs text-red-600 mt-1 font-mono">{entry.error}</div>
                )}
              </div>
              {entry.filesCount && (
                <div className="text-xs text-warm-500 text-right">
                  <div>{entry.filesCount} fișiere</div>
                  {entry.totalSize && <div>{(entry.totalSize / 1024).toFixed(1)} KB</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ client }: { client: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-warm-900 dark:text-warm-100 mb-3">Setări Avansate</h3>
        
        <div className="space-y-3">
          <SettingItem 
            icon={<Server />} 
            label="R2 Bucket" 
            value={client.r2BucketKey || `${client.slug}/`} 
          />
          <SettingItem 
            icon={<Database />} 
            label="Database ID" 
            value={client.id} 
          />
          <SettingItem 
            icon={<Globe />} 
            label="Public URL" 
            value={`https://pub-61d0516b43b34d60b459185fed874027.r2.dev/${client.slug}/`} 
          />
          <SettingItem 
            icon={<HardDrive />} 
            label="Storage Used" 
            value="—" 
          />
        </div>
      </div>

      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">Zonă Periculoasă</h4>
        <p className="text-sm text-red-700 dark:text-red-300 mb-3">
          Aceste acțiuni sunt ireversibile. Procedează cu atenție.
        </p>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors">
            Resetează Site
          </button>
          <button className="px-3 py-1.5 border border-red-600 text-red-600 hover:bg-red-50 text-sm rounded-lg transition-colors">
            Suspendă Cont
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const handleCopy = () => navigator.clipboard.writeText(value);
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-warm-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium text-warm-900 dark:text-warm-100 ${mono ? 'font-mono text-xs' : ''}`}>
          {value}
        </span>
        {mono && (
          <button onClick={handleCopy} className="text-warm-400 hover:text-warm-600">
            <Copy className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function QuickStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    amber: 'from-amber-500 to-orange-500',
    orange: 'from-orange-500 to-rose-500',
    rose: 'from-rose-500 to-pink-500',
  };
  return (
    <div className="bg-white dark:bg-warm-800 rounded-xl border border-warm-200 dark:border-warm-700 p-4">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center text-white mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-warm-900 dark:text-warm-100">{value}</div>
      <div className="text-xs text-warm-500">{label}</div>
    </div>
  );
}

function StatBox({ icon, label, value, color, trend }: { icon: React.ReactNode; label: string; value: string; color: string; trend?: number }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };
  return (
    <div className="bg-white dark:bg-warm-800 rounded-xl border border-warm-200 dark:border-warm-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-warm-900 dark:text-warm-100">{value}</div>
      <div className="text-xs text-warm-500">{label}</div>
    </div>
  );
}

function SettingItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-warm-50 dark:bg-warm-800/50 rounded-xl p-3">
      <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-warm-500">{label}</div>
        <div className="text-sm font-medium text-warm-900 dark:text-warm-100 font-mono truncate">{value}</div>
      </div>
      <button 
        onClick={() => navigator.clipboard.writeText(value)}
        className="text-warm-400 hover:text-warm-600 flex-shrink-0"
      >
        <Copy className="w-4 h-4" />
      </button>
    </div>
  );
}
