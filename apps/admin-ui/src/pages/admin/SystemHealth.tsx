import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Heart, Database, Server, Cloud, Clock, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: { status: string; latencyMs: number; error?: string };
    api: { status: string; uptime: number };
    r2?: { status: string; latencyMs: number; error?: string };
  };
  version: string;
  environment: string;
}

const STATUS = {
  healthy:   { color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.2)',  label: 'Healthy'   },
  degraded:  { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)', label: 'Degraded'  },
  unhealthy: { color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', label: 'Unhealthy' },
  unknown:   { color: '#9ca3af', bg: 'rgba(156,163,175,0.08)', border: 'rgba(156,163,175,0.2)', label: 'Unknown'   },
};

function getStatus(s: string) {
  return STATUS[s as keyof typeof STATUS] ?? STATUS.unknown;
}

/* ── ServiceCard ── */
function ServiceCard({ icon, title, status, latency, error, uptime, gradient }: {
  icon: React.ReactNode; title: string; status: string;
  latency?: number; error?: string; uptime?: number; gradient: string;
}) {
  const st = getStatus(status);
  return (
    <div
      className="neu-card p-5 relative overflow-hidden"
      style={{ borderColor: st.border }}
    >
      {/* Accent left bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[18px]"
        style={{ background: `linear-gradient(180deg, ${st.color} 0%, transparent 100%)` }}
      />
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pl-2">
        <div
          className="icon-box w-9 h-9 flex items-center justify-center"
          style={{ background: gradient }}
        >
          <span className="relative z-10 text-white">{icon}</span>
        </div>
        <h3 className="font-bold text-sm" style={{ color: 'var(--txt-primary)' }}>{title}</h3>
        {/* Status dot */}
        <span
          className="ml-auto w-2 h-2 rounded-full"
          style={{ background: st.color, boxShadow: `0 0 8px ${st.color}` }}
        />
      </div>

      <div className="gold-divider mb-4" />

      {/* Metrics */}
      <div className="space-y-2.5 pl-2">
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: 'var(--txt-muted)' }}>Status</span>
          <span
            className="glass-pill text-[11px] font-bold px-2.5 py-0.5 capitalize"
            style={{ color: st.color, borderColor: st.border, background: st.bg }}
          >
            {status}
          </span>
        </div>
        {latency !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: 'var(--txt-muted)' }}>Latency</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--txt-primary)' }}>{latency}ms</span>
          </div>
        )}
        {uptime !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: 'var(--txt-muted)' }}>Uptime</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--txt-primary)' }}>{formatUptime(uptime)}</span>
          </div>
        )}
        {error && (
          <div
            className="mt-2 p-2 rounded-xl text-xs"
            style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export function SystemHealth() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadHealth = async () => {
    try {
      const res = await api.admin.getSystemHealth();
      setHealth(res);
      setLastChecked(new Date());
    } catch (err) {
      console.error('Failed to load health:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center gap-3 p-8" style={{ color: 'var(--txt-muted)' }}>
      <RefreshCw className="w-4 h-4 animate-spin" />
      <span className="text-sm">Loading health status...</span>
    </div>
  );

  const overall = getStatus(health?.status || 'unknown');

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="icon-box w-10 h-10 flex items-center justify-center"
            style={{ background: 'linear-gradient(145deg, #f0b429, #a86000)' }}
          >
            <Heart className="w-5 h-5 text-white relative z-10" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold" style={{ color: 'var(--txt-primary)' }}>System Health Monitor</h1>
          </div>
        </div>
        <div
          className="glass-pill flex items-center gap-1.5 px-3 py-1.5 text-xs"
          style={{ color: 'var(--txt-muted)' }}
        >
          <Clock className="w-3 h-3" />
          Last checked: {lastChecked.toLocaleTimeString()}
        </div>
      </div>

      <div className="gold-divider" />

      {/* ── Overall status banner ── */}
      <div
        className="neu-card p-5 flex items-center gap-4 relative overflow-hidden"
        style={{ borderColor: overall.border }}
      >
        {/* Glow bg */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 20% 50%, ${overall.color}12 0%, transparent 60%)` }}
        />
        <div
          className="icon-box w-11 h-11 flex items-center justify-center relative z-10"
          style={{ background: overall.bg, border: `1px solid ${overall.border}` }}
        >
          {health?.status === 'healthy'
            ? <CheckCircle className="w-5 h-5" style={{ color: overall.color }} />
            : <AlertCircle className="w-5 h-5" style={{ color: overall.color }} />
          }
        </div>
        <div className="relative z-10">
          <p className="text-lg font-extrabold capitalize" style={{ color: overall.color }}>
            {health?.status || 'Unknown'}
          </p>
          <p className="text-xs" style={{ color: 'var(--txt-muted)' }}>
            System is {health?.status || 'unknown'}
          </p>
        </div>
        {/* Animated dot */}
        <div className="ml-auto relative z-10">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: overall.color, boxShadow: `0 0 12px ${overall.color}`, animation: 'pulse-glow 2s infinite' }}
          />
        </div>
      </div>

      {/* ── Service Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <ServiceCard
          icon={<Database className="w-4 h-4" />}
          title="Database"
          gradient="linear-gradient(135deg,#f0b429,#a86000)"
          status={health?.services.database.status || 'unknown'}
          latency={health?.services.database.latencyMs}
          error={health?.services.database.error}
        />
        <ServiceCard
          icon={<Server className="w-4 h-4" />}
          title="API Server"
          gradient="linear-gradient(135deg,#34d399,#059669)"
          status={health?.services.api.status || 'unknown'}
          uptime={health?.services.api.uptime}
        />
        <ServiceCard
          icon={<Cloud className="w-4 h-4" />}
          title="Cloudflare R2"
          gradient="linear-gradient(135deg,#60a5fa,#2563eb)"
          status={health?.services.r2?.status || 'unknown'}
          latency={health?.services.r2?.latencyMs}
          error={health?.services.r2?.error}
        />
      </div>

      {/* ── System Info ── */}
      <div className="neu-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div
            className="icon-box w-7 h-7 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#fb923c,#c2410c)' }}
          >
            <Clock className="w-3.5 h-3.5 text-white relative z-10" />
          </div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--txt-primary)' }}>System Information</h3>
        </div>
        <div className="gold-divider mb-4" />
        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
          {[
            { label: 'Version',     value: health?.version || 'N/A' },
            { label: 'Environment', value: health?.environment || 'N/A' },
            { label: 'API Uptime',  value: formatUptime(health?.services.api.uptime || 0) },
            { label: 'Last Check',  value: new Date(health?.timestamp || '').toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="neu-inset p-3">
              <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--txt-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</p>
              <p className="text-sm font-bold capitalize" style={{ color: 'var(--txt-primary)' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const days  = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins  = Math.floor((seconds % 3600) / 60);
  if (days  > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
