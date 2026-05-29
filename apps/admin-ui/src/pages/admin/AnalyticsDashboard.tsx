import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { BarChart3, RefreshCw, Users, HardDrive, Globe, TrendingUp, Loader2 } from 'lucide-react';

interface ClientStats {
  clientId: string;
  domain: string;
  totalVisits: number;
  uniqueVisitors: number;
  pageViews: number;
  bounceRate?: number;
  avgSessionDuration?: number;
  topPages?: { path: string; views: number }[];
  countries?: { country: string; visits: number }[];
  referrers?: { referrer: string; visits: number }[];
}

interface AnalyticsData {
  realtime: { tc: number; ac: number; ps: number; totalMediaFiles?: number };
  today: {
    date: string; totalClients: number; activeClients: number; totalVisits: number;
    totalPageViews: number; storageUsedMB: number; totalPublished: number;
    newClientsToday: number; growthRate: number; planBreakdown: Record<string, number>;
  } | null;
  week: any[];
  month: any[];
  clients: ClientStats[];
}

const STAT_CONFIGS = [
  { key: 'tc',             label: 'Total Clienți',    icon: Users,      grad: 'linear-gradient(135deg,#f97316,#c2590a)', glow: 'rgba(249,115,22,0.28)' },
  { key: 'ac',             label: 'Clienți Activi',   icon: TrendingUp, grad: 'linear-gradient(135deg,#34d399,#059669)', glow: 'rgba(52,211,153,0.25)' },
  { key: 'ps',             label: 'Site-uri Live',    icon: Globe,      grad: 'linear-gradient(135deg,#818cf8,#4f46e5)', glow: 'rgba(129,140,248,0.22)' },
  { key: 'totalMediaFiles',label: 'Fișiere Media',    icon: HardDrive,  grad: 'linear-gradient(135deg,#f43f5e,#be123c)', glow: 'rgba(244,63,94,0.22)'  },
];

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadAnalytics(); }, []);

  const loadAnalytics = async () => {
    try {
      const res = await api.admin.getAnalyticsDashboard();
      setData(res);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await api.admin.refreshAnalytics(); await loadAnalytics(); }
    catch (err) { console.error('Refresh failed:', err); }
    finally { setRefreshing(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="icon-box w-11 h-11 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f97316,#c2590a)' }}>
              <BarChart3 className="w-5 h-5 text-white relative z-10" />
            </div>
            <h1 className="text-3xl font-extrabold" style={{ color: 'var(--txt-primary)' }}>
              Global Analytics
            </h1>
          </div>
          <p className="text-sm pl-14" style={{ color: 'var(--txt-muted)' }}>Date în timp real despre platformă</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="neu-btn-primary flex items-center gap-2.5 px-5 py-2.5 text-sm disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 relative z-10 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="relative z-10">{refreshing ? 'Se actualizează...' : 'Actualizează'}</span>
        </button>
      </div>

      {/* ── Realtime Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {STAT_CONFIGS.map((cfg) => {
          const Icon = cfg.icon;
          const val = (data?.realtime as any)?.[cfg.key] ?? 0;
          return (
            <div key={cfg.key} className="neu-card p-6 relative" style={{ overflow: 'visible' }}>
              <div className="stat-ring" style={{ borderColor: `${cfg.glow.replace('0.', '0.08')}` }} />
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="icon-box w-12 h-12 flex items-center justify-center" style={{ background: cfg.grad }}>
                  <Icon className="w-5 h-5 text-white relative z-10" />
                </div>
                <div
                  className="text-xs font-bold px-2 py-1 rounded-lg"
                  style={{ background: cfg.glow, color: 'var(--txt-primary)', border: `1px solid ${cfg.glow}` }}
                >
                  Live
                </div>
              </div>
              <p className="section-label mb-2 relative z-10">{cfg.label}</p>
              <p className="text-5xl font-black relative z-10" style={{ color: 'var(--txt-primary)' }}>
                {val.toLocaleString()}
              </p>
              {/* bottom accent line */}
              <div className="absolute bottom-0 left-6 right-6 h-[2px] rounded-full" style={{ background: cfg.grad, opacity: 0.4 }} />
            </div>
          );
        })}
      </div>

      {/* ── Today's Stats ── */}
      {data?.today && (
        <div className="neu-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-6 rounded-full" style={{ background: 'linear-gradient(180deg,#f97316,#c2590a)' }} />
            <h2 className="text-xl font-bold" style={{ color: 'var(--txt-primary)' }}>Statistici Astăzi</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Clienți Noi', value: data.today.newClientsToday, color: 'var(--accent)' },
              { label: 'Stocare Folosită', value: `${data.today.storageUsedMB} MB`, color: 'var(--txt-primary)' },
              { label: 'Rată Creștere', value: `${data.today.growthRate >= 0 ? '+' : ''}${data.today.growthRate.toFixed(2)}%`, color: data.today.growthRate >= 0 ? '#34d399' : '#f87171' },
              { label: 'Page Views', value: (data.today.totalPageViews || 0).toLocaleString(), color: 'var(--txt-primary)' },
            ].map(item => (
              <div key={item.label} className="neu-inset p-5 relative z-10">
                <p className="section-label mb-2">{item.label}</p>
                <p className="text-4xl font-black" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Plan Distribution ── */}
      {data?.today?.planBreakdown && Object.keys(data.today.planBreakdown).length > 0 && (
        <div className="neu-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-6 rounded-full" style={{ background: 'linear-gradient(180deg,#818cf8,#4f46e5)' }} />
            <h2 className="text-xl font-bold" style={{ color: 'var(--txt-primary)' }}>Distribuție Planuri</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(data.today.planBreakdown).map(([plan, count]) => (
              <div key={plan} className="neu-inset p-5 relative z-10">
                <p className="section-label mb-2 capitalize">{plan}</p>
                <p className="text-4xl font-black" style={{ color: 'var(--txt-primary)' }}>{count as number}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Weekly Table ── */}
      {data?.week && data.week.length > 0 && (
        <div className="neu-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-6 rounded-full" style={{ background: 'linear-gradient(180deg,#34d399,#059669)' }} />
            <h2 className="text-xl font-bold" style={{ color: 'var(--txt-primary)' }}>Ultimele 7 Zile</h2>
          </div>
          <div className="overflow-x-auto relative z-10">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--neu-border)' }}>
                  {['Dată', 'Clienți', 'Noi', 'Stocare (MB)'].map((h, i) => (
                    <th key={h} className={`py-4 section-label text-sm ${i > 0 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.week.map((day: any) => (
                  <tr key={day.id} className="table-row-hover transition-colors" style={{ borderBottom: '1px solid var(--neu-border)' }}>
                    <td className="py-4 text-[15px] font-medium" style={{ color: 'var(--txt-secondary)' }}>{new Date(day.date).toLocaleDateString('ro-RO')}</td>
                    <td className="py-4 text-[15px] text-right font-semibold" style={{ color: 'var(--txt-primary)' }}>{day.totalClients}</td>
                    <td className="py-4 text-[15px] text-right font-bold" style={{ color: 'var(--accent)' }}>+{day.newClientsToday}</td>
                    <td className="py-4 text-[15px] text-right" style={{ color: 'var(--txt-secondary)' }}>{day.storageUsedMB}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CF Client Analytics ── */}
      {data?.clients && data.clients.length > 0 && (
        <div className="neu-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="icon-box w-9 h-9 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#818cf8,#4f46e5)' }}>
              <Globe className="w-4 h-4 text-white relative z-10" />
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--txt-primary)' }}>Cloudflare Analytics</h2>
          </div>
          <div className="overflow-x-auto relative z-10">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--neu-border)' }}>
                  {['Domeniu', 'Vizite', 'Vizitatori Unici', 'Page Views', 'Bounce Rate'].map((h, i) => (
                    <th key={h} className={`py-3 section-label ${i === 0 ? 'text-left' : 'text-right'} px-3`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.clients.map((client) => (
                  <tr key={client.clientId} className="table-row-hover transition-colors" style={{ borderBottom: '1px solid var(--neu-border)' }}>
                    <td className="py-4 px-3 text-[15px] font-semibold" style={{ color: 'var(--txt-primary)' }}>{client.domain || 'N/A'}</td>
                    <td className="py-4 px-3 text-[15px] text-right" style={{ color: 'var(--txt-secondary)' }}>{client.totalVisits?.toLocaleString() || 0}</td>
                    <td className="py-4 px-3 text-[15px] text-right" style={{ color: 'var(--txt-secondary)' }}>{client.uniqueVisitors?.toLocaleString() || 0}</td>
                    <td className="py-4 px-3 text-[15px] text-right" style={{ color: 'var(--txt-secondary)' }}>{client.pageViews?.toLocaleString() || 0}</td>
                    <td className="py-4 px-3 text-[15px] text-right" style={{ color: client.bounceRate ? 'var(--accent)' : 'var(--txt-muted)' }}>
                      {client.bounceRate ? `${client.bounceRate.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
