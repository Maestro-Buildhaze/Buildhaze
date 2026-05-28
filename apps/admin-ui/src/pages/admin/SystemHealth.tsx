import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Heart, Database, Server, Cloud, Clock, AlertCircle, CheckCircle } from 'lucide-react';

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

  if (loading) return <div className="p-8">Loading health status...</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'degraded': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'unhealthy': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Heart className="w-6 h-6" />
          System Health Monitor
        </h1>
        <div className="text-sm text-gray-500">
          Last checked: {lastChecked.toLocaleTimeString()}
        </div>
      </div>

      {/* Overall Status */}
      <div className={`rounded-lg p-6 mb-8 ${getStatusColor(health?.status || 'unknown')}`}>
        <div className="flex items-center gap-4">
          {getStatusIcon(health?.status || 'unknown')}
          <div>
            <h2 className="text-xl font-bold capitalize">{health?.status || 'Unknown'}</h2>
            <p className="text-sm">System is {health?.status || 'unknown'}</p>
          </div>
        </div>
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Database */}
        <ServiceCard
          icon={<Database className="w-6 h-6" />}
          title="Database"
          status={health?.services.database.status || 'unknown'}
          latency={health?.services.database.latencyMs}
          error={health?.services.database.error}
        />

        {/* API */}
        <ServiceCard
          icon={<Server className="w-6 h-6" />}
          title="API Server"
          status={health?.services.api.status || 'unknown'}
          uptime={health?.services.api.uptime}
        />

        {/* R2 */}
        <ServiceCard
          icon={<Cloud className="w-6 h-6" />}
          title="Cloudflare R2"
          status={health?.services.r2?.status || 'unknown'}
          latency={health?.services.r2?.latencyMs}
          error={health?.services.r2?.error}
        />
      </div>

      {/* System Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          System Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Version</p>
            <p className="font-medium">{health?.version || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Environment</p>
            <p className="font-medium capitalize">{health?.environment || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">API Uptime</p>
            <p className="font-medium">{formatUptime(health?.services.api.uptime || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Last Check</p>
            <p className="font-medium">{new Date(health?.timestamp || '').toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ icon, title, status, latency, error, uptime }: {
  icon: React.ReactNode;
  title: string;
  status: string;
  latency?: number;
  error?: string;
  uptime?: number;
}) {
  const getColor = () => {
    switch (status) {
      case 'healthy': return 'border-green-500 bg-green-50';
      case 'degraded': return 'border-yellow-500 bg-yellow-50';
      case 'unhealthy': return 'border-red-500 bg-red-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${getColor()}`}>
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">Status</span>
          <span className="text-sm font-medium capitalize">{status}</span>
        </div>
        {latency !== undefined && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Latency</span>
            <span className="text-sm font-medium">{latency}ms</span>
          </div>
        )}
        {uptime !== undefined && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Uptime</span>
            <span className="text-sm font-medium">{formatUptime(uptime)}</span>
          </div>
        )}
        {error && (
          <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
