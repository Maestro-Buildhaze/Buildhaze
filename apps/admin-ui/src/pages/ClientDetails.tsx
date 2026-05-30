import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Globe, Mail, User, Calendar, CheckCircle2, AlertCircle,
  BarChart3, Users, Eye, FileText, Image as ImageIcon, Settings,
  ExternalLink, RefreshCw, Loader2, TrendingUp, MousePointer,
  Clock, Server, Database, HardDrive, Zap, Activity,
  Copy, Edit, Layers, Send, Palette, X, Check
} from 'lucide-react';
import { api } from '../lib/api';

type Tab = 'overview' | 'statistics' | 'content' | 'media' | 'blog' | 'history' | 'settings';

export function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Fetch client details
  const { data: client, isLoading } = useQuery({
    queryKey: ['admin-client', id],
    queryFn: () => api.admin.getClient(id!),
    enabled: !!id,
  });

  // Fetch all templates for selector
  const { data: templates } = useQuery({
    queryKey: ['admin-templates'],
    queryFn: () => api.admin.getTemplates(),
    enabled: showTemplateSelector,
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

  // Update template mutation
  const updateTemplateMut = useMutation({
    mutationFn: (templateId: string) => api.admin.updateClient(id!, { templateId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-client', id] });
      setShowTemplateSelector(false);
      alert('Template updated successfully! Publish the site to apply changes.');
    },
    onError: (err: any) => alert('Error: ' + err.message),
  });

  // Regenerate pages from template schema
  const regeneratePagesMut = useMutation({
    mutationFn: () => api.admin.regenerateClientPages(id!),
    onSuccess: (data) => {
      alert(`Done! Created ${data.pagesCreated} pages with ${data.sectionsCreated} sections`);
      queryClient.invalidateQueries({ queryKey: ['admin-client', id] });
    },
    onError: (err: any) => alert('Error: ' + err.message),
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
          className="flex items-center gap-2 text-sm mb-4 transition-colors hover:opacity-80"
          style={{ color: 'var(--txt-muted)' }}
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
                className="flex items-center gap-2 px-4 py-2 bg-white/90 text-amber-600 hover:bg-white rounded-xl text-sm font-medium transition-all shadow-lg"
              >
                <Settings className="w-4 h-4" />
                Editează CMS
              </button>
              <button
                onClick={() => {
                  if (confirm('This deletes and recreates all pages for this client from the template. Continue?')) {
                    regeneratePagesMut.mutate();
                  }
                }}
                disabled={regeneratePagesMut.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              >
                {regeneratePagesMut.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                Regenerate Pages
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
            <button
              onClick={() => setShowTemplateSelector(true)}
              className="text-left group"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 group-hover:bg-white/25 transition-all cursor-pointer border border-white/20">
                <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                  <Layers className="w-4 h-4 group-hover:text-amber-300 transition-colors" />
                  <span>Template (click to change)</span>
                </div>
                <div className="text-white font-semibold">{client.template?.name || '—'}</div>
              </div>
            </button>
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

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden" style={{ background: 'var(--neu-surface)', border: '1px solid var(--neu-border)' }}>
            <div className="p-6 flex justify-between items-center" style={{ borderBottom: '1px solid var(--neu-border)' }}>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Palette className="w-5 h-5 text-amber-500" />
                Selectează Template Nou
              </h2>
              <button
                onClick={() => setShowTemplateSelector(false)}
                className="p-2 rounded-lg transition-colors hover:opacity-70"
                style={{ color: 'var(--txt-muted)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates?.map((template: any) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      if (confirm(`Change template to "${template.name}"? This will affect the site's design.`)) {
                        updateTemplateMut.mutate(template.id);
                      }
                    }}
                    disabled={updateTemplateMut.isPending || client.templateId === template.id}
                    className="p-4 rounded-xl border-2 text-left transition-all disabled:opacity-50"
                    style={{
                      borderColor: client.templateId === template.id ? '#22c55e' : 'var(--neu-border)',
                      background: client.templateId === template.id ? 'rgba(34,197,94,0.10)' : 'var(--neu-surface2)',
                    }}
                  >
                    <div className="aspect-video rounded-lg mb-3 flex items-center justify-center overflow-hidden" style={{ background: 'var(--neu-bg)' }}>
                      {template.thumbnail ? (
                        <img src={template.thumbnail} alt={template.name} className="w-full h-full object-cover" />
                      ) : (
                        <Layers className="w-12 h-12" style={{ color: 'var(--txt-muted)' }} />
                      )}
                    </div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{template.name}</h3>
                        <p className="text-sm" style={{ color: 'var(--txt-muted)' }}>{template.niche}</p>
                      </div>
                      {client.templateId === template.id && (
                        <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="neu-card overflow-hidden">
        <div className="overflow-x-auto" style={{ borderBottom: '1px solid var(--neu-border)' }}>
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
      className="flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap"
      style={{
        borderColor: active ? '#f97316' : 'transparent',
        color: active ? '#f97316' : 'var(--txt-muted)',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3">
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
          <h3 className="text-base font-bold mb-3" style={{ color: 'var(--txt-primary)' }}>Informații Client</h3>
          <div className="neu-inset rounded-xl p-4 space-y-3">
            <InfoRow label="ID Client" value={client.id} mono />
            <InfoRow label="Email" value={client.email} />
            <InfoRow label="Nume Business" value={client.businessName} />
            <InfoRow label="Slug" value={client.slug} mono />
            <InfoRow label="Plan" value={client.plan} />
            <InfoRow label="Domeniu Custom" value={client.domain || '—'} />
          </div>
        </div>

        <div>
          <h3 className="text-base font-bold mb-3" style={{ color: 'var(--txt-primary)' }}>Template & R2</h3>
          <div className="neu-inset rounded-xl p-4 space-y-3">
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
      <div className="text-center py-12" style={{ color: 'var(--txt-muted)' }}>
        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Se încarcă statisticile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--txt-primary)' }}>Statistici Cloudflare</h3>
        <p className="text-sm" style={{ color: 'var(--txt-muted)' }}>Date în timp real din Cloudflare Analytics</p>
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
          <h4 className="text-sm font-bold mb-3" style={{ color: 'var(--txt-primary)' }}>Pagini Populare</h4>
          <div className="neu-card overflow-hidden">
            {stats.topPages.map((page: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 last:border-b-0" style={{ borderBottom: '1px solid var(--neu-border)' }}>
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
          <h4 className="text-sm font-bold mb-3" style={{ color: 'var(--txt-primary)' }}>Vizitatori după Țară</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.byCountry.slice(0, 8).map((c: any, i: number) => (
              <div key={i} className="neu-inset rounded-xl p-3">
                <div className="text-2xl mb-1">{c.flag || '🌍'}</div>
                <div className="text-sm font-medium" style={{ color: 'var(--txt-primary)' }}>{c.name || c.code}</div>
                <div className="text-xs" style={{ color: 'var(--txt-muted)' }}>{c.visits?.toLocaleString()} vizite</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl p-4" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.20)' }}>
        <div className="flex gap-3">
          <Zap className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#f97316' }} />
          <div>
            <h4 className="text-sm font-semibold" style={{ color: 'var(--txt-primary)' }}>Tip pentru Statistici</h4>
            <p className="text-sm mt-1" style={{ color: 'var(--txt-muted)' }}>
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
          <h3 className="text-lg font-bold" style={{ color: 'var(--txt-primary)' }}>Conținut Site</h3>
          <p className="text-sm" style={{ color: 'var(--txt-muted)' }}>{configEntries.length} câmpuri configurate</p>
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
          <div key={key} className="neu-inset rounded-xl p-3">
            <div className="text-xs font-mono mb-1" style={{ color: 'var(--txt-muted)' }}>{key}</div>
            <div className="text-sm font-medium truncate" style={{ color: 'var(--txt-primary)' }}>
              {typeof value === 'string' ? value : value?.value || JSON.stringify(value)}
            </div>
          </div>
        ))}
      </div>

      {configEntries.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--txt-muted)' }}>
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
          <h3 className="text-lg font-bold" style={{ color: 'var(--txt-primary)' }}>Bibliotecă Media</h3>
          <p className="text-sm" style={{ color: 'var(--txt-muted)' }}>{media.length} fișiere</p>
        </div>
      </div>

      {media.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--txt-muted)' }}>
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Niciun fișier media</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {media.map((file: any) => (
            <div key={file.id} className="group neu-card overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square relative" style={{ background: 'var(--neu-bg)' }}>
                {file.mimeType?.startsWith('image/') ? (
                  <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="w-8 h-8" style={{ color: 'var(--txt-muted)' }} />
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--txt-primary)' }}>{file.name}</p>
                <p className="text-xs" style={{ color: 'var(--txt-muted)' }}>
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
  const publishedCount = posts.filter(p => p.isPublished).length;
  const draftCount = posts.length - publishedCount;
  const featuredCount = posts.filter(p => p.isFeatured).length;
  
  // Group by category
  const categoryCount = posts.reduce((acc, post) => {
    const cat = post.category?.name || 'Fără categorie';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="neu-card p-3 text-center">
          <div className="text-2xl font-bold" style={{ color: 'var(--txt-primary)' }}>{posts.length}</div>
          <div className="text-xs" style={{ color: 'var(--txt-muted)' }}>Total Articole</div>
        </div>
        <div className="neu-card p-3 text-center">
          <div className="text-2xl font-bold text-emerald-500">{publishedCount}</div>
          <div className="text-xs" style={{ color: 'var(--txt-muted)' }}>Publicate</div>
        </div>
        <div className="neu-card p-3 text-center">
          <div className="text-2xl font-bold text-amber-500">{draftCount}</div>
          <div className="text-xs" style={{ color: 'var(--txt-muted)' }}>Drafturi</div>
        </div>
        <div className="neu-card p-3 text-center">
          <div className="text-2xl font-bold text-purple-500">{featuredCount}</div>
          <div className="text-xs" style={{ color: 'var(--txt-muted)' }}>Recomandate</div>
        </div>
      </div>

      {/* Categories */}
      {Object.keys(categoryCount).length > 0 && (
        <div className="neu-card p-4">
          <h4 className="font-semibold mb-3" style={{ color: 'var(--txt-primary)' }}>Distribuție pe Categorii</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(categoryCount).map(([cat, count]) => (
              <span 
                key={cat}
                className="px-3 py-1 rounded-full text-sm"
                style={{ 
                  background: 'rgba(201,169,98,0.15)', 
                  color: '#c9a962',
                  border: '1px solid rgba(201,169,98,0.3)'
                }}
              >
                {cat}: {count as number}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--txt-primary)' }}>Lista Articole</h3>
          <p className="text-sm" style={{ color: 'var(--txt-muted)' }}>{posts.length} articole în total</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              const token = localStorage.getItem('admin_token');
              window.open(`${import.meta.env.VITE_CLIENT_UI_URL || 'https://sitecms-admin.netlify.app'}/cms/${clientId}/blog?adminToken=${token}`, '_blank');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
            Editează în CMS
          </button>
        </div>
      </div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="text-center py-12 neu-card" style={{ color: 'var(--txt-muted)' }}>
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Niciun articol încă</p>
          <p className="text-sm mt-1 opacity-60">Clientul poate adăuga articole din tab-ul Blog</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post: any) => (
            <div key={post.id} className="neu-card p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold" style={{ color: 'var(--txt-primary)' }}>{post.title}</h4>
                    {post.isFeatured && (
                      <span 
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}
                      >
                        ★ Recomandat
                      </span>
                    )}
                  </div>
                  
                  {post.excerpt && (
                    <p className="text-sm line-clamp-2 mb-2" style={{ color: 'var(--txt-secondary)' }}>
                      {post.excerpt}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-3 flex-wrap text-xs" style={{ color: 'var(--txt-muted)' }}>
                    {/* Status */}
                    <span
                      className="px-2 py-0.5 rounded-full font-medium"
                      style={post.isPublished
                        ? { background: 'rgba(34,197,94,0.12)', color: '#22c55e' }
                        : { background: 'rgba(255,255,255,0.06)', color: 'var(--txt-muted)' }
                      }
                    >
                      {post.isPublished ? '● Publicat' : '○ Draft'}
                    </span>
                    
                    {/* Category */}
                    {post.category && (
                      <span 
                        className="px-2 py-0.5 rounded-full"
                        style={{ 
                          background: post.category.color ? `${post.category.color}20` : 'rgba(201,169,98,0.15)',
                          color: post.category.color || '#c9a962'
                        }}
                      >
                        {post.category.name}
                      </span>
                    )}
                    
                    {/* Author */}
                    {post.author && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {post.author.name}
                      </span>
                    )}
                    
                    {/* Date */}
                    {post.publishedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.publishedAt).toLocaleDateString('ro-RO')}
                      </span>
                    )}
                    
                    {/* Read time */}
                    {post.readTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readTime} min
                      </span>
                    )}
                    
                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <span className="flex items-center gap-1">
                        {post.tags.slice(0, 3).map((tag: string) => (
                          <span key={tag} className="text-xs opacity-70">#{tag}</span>
                        ))}
                        {post.tags.length > 3 && <span className="text-xs opacity-50">+{post.tags.length - 3}</span>}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Cover Image Thumbnail */}
                {post.coverImage && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--neu-bg)' }}>
                    <img src={post.coverImage} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
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
        <h3 className="text-lg font-bold" style={{ color: 'var(--txt-primary)' }}>Istoric Publicări</h3>
        <p className="text-sm" style={{ color: 'var(--txt-muted)' }}>Ultimele {history.length} publicări</p>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--txt-muted)' }}>
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nicio publicare încă</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((entry: any) => (
            <div key={entry.id} className="flex items-center gap-3 neu-card p-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: entry.status === 'success' ? 'rgba(34,197,94,0.12)' : entry.status === 'failed' ? 'rgba(239,68,68,0.12)' : 'rgba(249,115,22,0.12)',
                  color: entry.status === 'success' ? '#22c55e' : entry.status === 'failed' ? '#ef4444' : '#f97316',
                }}
              >
                {entry.status === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
                 entry.status === 'failed' ? <AlertCircle className="w-5 h-5" /> :
                 <Loader2 className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--txt-primary)' }}>
                    {entry.status === 'success' ? 'Publicat cu succes' : 
                     entry.status === 'failed' ? 'Publicare eșuată' : 'În progres'}
                  </span>
                  {entry.duration && (
                    <span className="text-xs" style={{ color: 'var(--txt-muted)' }}>{entry.duration}ms</span>
                  )}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--txt-muted)' }}>
                  {new Date(entry.createdAt).toLocaleString('ro-RO')}
                  {entry.adminId && <span className="ml-2" style={{ color: '#f97316' }}>(Admin)</span>}
                </div>
                {entry.error && (
                  <div className="text-xs mt-1 font-mono" style={{ color: '#ef4444' }}>{entry.error}</div>
                )}
              </div>
              {entry.filesCount && (
                <div className="text-xs text-right" style={{ color: 'var(--txt-muted)' }}>
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
        <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--txt-primary)' }}>Setări Avansate</h3>
        
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

      <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
        <h4 className="text-sm font-semibold mb-2" style={{ color: '#ef4444' }}>Zonă Periculoasă</h4>
        <p className="text-sm mb-3" style={{ color: 'var(--txt-muted)' }}>
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
      <span className="text-xs" style={{ color: 'var(--txt-muted)' }}>{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${mono ? 'font-mono text-xs' : ''}`} style={{ color: 'var(--txt-primary)' }}>
          {value}
        </span>
        {mono && (
          <button onClick={handleCopy} style={{ color: 'var(--txt-muted)' }} className="hover:opacity-70">
            <Copy className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function QuickStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const gradMap: Record<string, string> = {
    amber: 'linear-gradient(135deg,#f97316,#c2590a)',
    orange: 'linear-gradient(135deg,#fb923c,#ea580c)',
    rose: 'linear-gradient(135deg,#f43f5e,#be123c)',
  };
  return (
    <div className="neu-card p-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white mb-3 icon-box"
        style={{ background: gradMap[color] || gradMap.amber }}
      >
        {icon}
      </div>
      <div className="text-2xl font-bold" style={{ color: 'var(--txt-primary)' }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--txt-muted)' }}>{label}</div>
    </div>
  );
}

function StatBox({ icon, label, value, color, trend }: { icon: React.ReactNode; label: string; value: string; color: string; trend?: number }) {
  const iconColorMap: Record<string, { bg: string; color: string }> = {
    blue:    { bg: 'rgba(96,165,250,0.12)',  color: '#60a5fa' },
    emerald: { bg: 'rgba(52,211,153,0.12)',  color: '#34d399' },
    amber:   { bg: 'rgba(249,115,22,0.12)',  color: '#f97316' },
    rose:    { bg: 'rgba(244,63,94,0.12)',   color: '#f43f5e' },
  };
  const ic = iconColorMap[color] || iconColorMap.amber;
  return (
    <div className="neu-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: ic.bg, color: ic.color }}
        >
          {icon}
        </div>
        {trend !== undefined && (
          <span
            className="text-xs font-medium flex items-center gap-0.5"
            style={{ color: trend >= 0 ? '#34d399' : '#f87171' }}
          >
            <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold" style={{ color: 'var(--txt-primary)' }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--txt-muted)' }}>{label}</div>
    </div>
  );
}

function SettingItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="neu-inset rounded-xl p-3 flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 icon-box"
        style={{ background: 'linear-gradient(135deg,#f97316,#c2590a)', color: '#fff' }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs" style={{ color: 'var(--txt-muted)' }}>{label}</div>
        <div className="text-sm font-medium font-mono truncate" style={{ color: 'var(--txt-primary)' }}>{value}</div>
      </div>
      <button
        onClick={() => navigator.clipboard.writeText(value)}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--txt-muted)' }}
      >
        <Copy className="w-4 h-4" />
      </button>
    </div>
  );
}
