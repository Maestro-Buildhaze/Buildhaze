import { useQuery } from '@tanstack/react-query';
import { Users, FolderOpen, Globe, TrendingUp, Activity, Zap, ArrowUpRight } from 'lucide-react';
import { api } from '../lib/api';

/* ─── Stat Card ─── */
function StatCard({
  label, value, icon: Icon, gradient, accentColor, trend,
}: {
  label: string; value: string | number; icon: any;
  gradient: string; accentColor: string; trend: string;
}) {
  return (
    <div
      className="neu-card p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{ minHeight: 130 }}
    >
      {/* Decorative ring */}
      <div
        className="stat-ring"
        style={{ borderColor: `${accentColor}18`, background: `radial-gradient(circle, ${accentColor}06 0%, transparent 70%)` }}
      />
      {/* Top row */}
      <div className="flex items-center justify-between relative z-10">
        <div
          className="icon-box w-10 h-10 flex items-center justify-center"
          style={{ background: gradient }}
        >
          <Icon className="w-5 h-5 text-white relative z-10" />
        </div>
        {/* Trend badge */}
        <span
          className="glass-pill flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-semibold"
          style={{ color: '#4ade80', borderColor: 'rgba(74,222,128,0.2)' }}
        >
          <ArrowUpRight className="w-3 h-3" />
          {trend}
        </span>
      </div>
      {/* Value */}
      <div className="relative z-10">
        <p className="text-2xl font-extrabold leading-none tracking-tight" style={{ color: 'var(--txt-primary)' }}>
          {value}
        </p>
        <p className="text-xs mt-1 font-medium" style={{ color: 'var(--txt-muted)' }}>{label}</p>
      </div>
      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
      />
    </div>
  );
}

/* ─── Client row ─── */
function ClientRow({ client }: { client: any }) {
  return (
    <div
      className="flex items-center gap-3 py-3 table-row-hover transition-all rounded-xl px-2 -mx-2"
      style={{ borderBottom: '1px solid var(--neu-border)' }}
    >
      <div
        className="icon-box w-9 h-9 flex items-center justify-center text-sm font-bold shrink-0"
        style={{ background: 'linear-gradient(135deg, #f97316, #c2590a)', color: '#fff' }}
      >
        {client.businessName.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--txt-primary)' }}>{client.businessName}</p>
        <p className="text-xs truncate" style={{ color: 'var(--txt-muted)' }}>{client.email}</p>
      </div>
      <span
        className="glass-pill text-[10px] font-bold px-2.5 py-1 shrink-0"
        style={client.isActive
          ? { color: '#4ade80', borderColor: 'rgba(74,222,128,0.25)', background: 'rgba(74,222,128,0.08)' }
          : { color: '#f87171', borderColor: 'rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.08)' }
        }
      >
        {client.isActive ? 'Activ' : 'Inactiv'}
      </span>
    </div>
  );
}

export function Dashboard() {
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: api.admin.getClients,
  });

  const { data: templates } = useQuery({
    queryKey: ['admin-templates'],
    queryFn: api.admin.getTemplates,
  });

  const stats = {
    totalClients:   clients?.length || 0,
    activeClients:  clients?.filter((c: any) => c.isActive).length || 0,
    totalTemplates: templates?.length || 0,
    withDomain:     clients?.filter((c: any) => c.domain).length || 0,
    published:      clients?.filter((c: any) => c.lastPublishedAt).length || 0,
  };

  const statCards = [
    { label: 'Clienți Total',  value: stats.totalClients,   icon: Users,      gradient: 'linear-gradient(135deg,#f0b429,#c47600)', accentColor: '#f0b429', trend: '+12%' },
    { label: 'Clienți Activi', value: stats.activeClients,  icon: Activity,   gradient: 'linear-gradient(135deg,#34d399,#059669)', accentColor: '#34d399', trend: '+8%'  },
    { label: 'Template-uri',   value: stats.totalTemplates, icon: FolderOpen,  gradient: 'linear-gradient(135deg,#fb923c,#c2410c)', accentColor: '#fb923c', trend: '+3'   },
    { label: 'Cu Domeniu',     value: stats.withDomain,     icon: Globe,      gradient: 'linear-gradient(135deg,#60a5fa,#2563eb)', accentColor: '#60a5fa', trend: '+2'   },
    { label: 'Publicați',      value: stats.published,      icon: Zap,        gradient: 'linear-gradient(135deg,#fbbf24,#d97706)', accentColor: '#fbbf24', trend: '+5'   },
    { label: 'Conversie',      value: '94%',                icon: TrendingUp, gradient: 'linear-gradient(135deg,#f472b6,#db2777)', accentColor: '#f472b6', trend: '+2%'  },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-7">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="w-12 h-12 flex items-center justify-center shrink-0 rounded-xl overflow-hidden" style={{ background: 'var(--surface2)', border: '1px solid var(--neu-border)' }}>
          <img src="https://i.postimg.cc/ZKR32rgr/Untitled-Project-4.png" alt="Buildhaze Logo" className="w-10 h-10 object-contain" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--txt-primary)' }}>
            Dashboard
          </h1>
          <p className="text-sm" style={{ color: 'var(--txt-muted)' }}>
            Bine ai venit în panoul de administrare Buildhaze
          </p>
        </div>
      </div>

      {/* Decorative gold separator */}
      <div className="gold-divider" />

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* ── Bottom grid ── */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* Recent Clients */}
        <div className="neu-card p-5">
          {/* Card header */}
          <div className="flex items-center gap-2 mb-4">
            <div
              className="icon-box w-7 h-7 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#f97316,#c2590a)' }}
            >
              <Users className="w-3.5 h-3.5 text-white relative z-10" />
            </div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--txt-primary)' }}>Clienți Recenți</h3>
          </div>
          <div className="gold-divider mb-3" />

          {clientsLoading ? (
            <div className="flex flex-col gap-3 py-4">
              {[1,2,3].map(i => (
                <div key={i} className="neu-inset h-12 animate-pulse" style={{ opacity: 0.4 }} />
              ))}
            </div>
          ) : (
            <div>
              {clients?.slice(0, 5).map((client: any) => (
                <ClientRow key={client.id} client={client} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="neu-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div
              className="icon-box w-7 h-7 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#fb923c,#c2410c)' }}
            >
              <Zap className="w-3.5 h-3.5 text-white relative z-10" />
            </div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--txt-primary)' }}>Acțiuni Rapide</h3>
          </div>
          <div className="gold-divider mb-4" />

          <div className="space-y-3">
            {/* Clients action */}
            <a
              href="/clients"
              className="flex items-center gap-4 p-4 rounded-2xl relative overflow-hidden transition-all duration-200 hover:scale-[1.01]"
              style={{
                background: 'linear-gradient(135deg, rgba(249,115,22,0.10) 0%, rgba(194,89,10,0.06) 100%)',
                border: '1px solid rgba(249,115,22,0.15)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              {/* Shine overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)' }}
              />
              <div
                className="icon-box w-11 h-11 flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(145deg, #f97316, #c2590a)' }}
              >
                <Users className="w-5 h-5 text-white relative z-10" />
              </div>
              <div className="flex-1 relative z-10">
                <p className="text-sm font-bold" style={{ color: 'var(--txt-primary)' }}>Clienți</p>
                <p className="text-xs" style={{ color: 'var(--txt-muted)' }}>Gestionează toți clienții</p>
              </div>
              <ArrowUpRight className="w-4 h-4 relative z-10" style={{ color: '#f97316' }} />
            </a>

            {/* Templates action */}
            <a
              href="/templates"
              className="flex items-center gap-4 p-4 rounded-2xl relative overflow-hidden transition-all duration-200 hover:scale-[1.01]"
              style={{
                background: 'linear-gradient(135deg, rgba(251,146,60,0.10) 0%, rgba(194,65,12,0.06) 100%)',
                border: '1px solid rgba(251,146,60,0.15)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)' }}
              />
              <div
                className="icon-box w-11 h-11 flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(145deg, #fb923c, #c2410c)' }}
              >
                <FolderOpen className="w-5 h-5 text-white relative z-10" />
              </div>
              <div className="flex-1 relative z-10">
                <p className="text-sm font-bold" style={{ color: 'var(--txt-primary)' }}>Template-uri</p>
                <p className="text-xs" style={{ color: 'var(--txt-muted)' }}>Încarcă și gestionează template-uri</p>
              </div>
              <ArrowUpRight className="w-4 h-4 relative z-10" style={{ color: '#fb923c' }} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
