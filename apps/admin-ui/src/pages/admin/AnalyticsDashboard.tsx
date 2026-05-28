import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { BarChart3, TrendingUp, Users, HardDrive, Globe, DollarSign } from 'lucide-react';

interface AnalyticsData {
  realtime: {
    tc: number;
    ac: number;
    ps: number;
    totalMediaFiles?: number;
  };
  today: {
    date: string;
    totalClients: number;
    activeClients: number;
    totalVisits: number;
    totalPageViews: number;
    storageUsedMB: number;
    totalPublished: number;
    newClientsToday: number;
    growthRate: number;
    planBreakdown: Record<string, number>;
  } | null;
  week: any[];
  month: any[];
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

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
    try {
      await api.admin.refreshAnalytics();
      await loadAnalytics();
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <div className="p-8 text-warm-600 dark:text-warm-400">Loading analytics...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Global Analytics Dashboard
        </h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 transition-colors"
        >
          <TrendingUp className="w-4 h-4" />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Realtime Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          title="Total Clients"
          value={data?.realtime?.tc || 0}
          color="bg-blue-500"
        />
        <StatCard
          icon={<Globe className="w-5 h-5" />}
          title="Active Clients"
          value={data?.realtime?.ac || 0}
          color="bg-green-500"
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          title="Published Sites"
          value={data?.realtime?.ps || 0}
          color="bg-purple-500"
        />
        <StatCard
          icon={<HardDrive className="w-5 h-5" />}
          title="Total Media Files"
          value={data?.realtime?.totalMediaFiles || 0}
          color="bg-orange-500"
        />
      </div>

      {/* Today's Stats */}
      {data?.today && (
        <div className="bg-white dark:bg-warm-900 rounded-xl shadow-soft border border-warm-200 dark:border-warm-800 p-6 mb-8">
          <h2 className="text-lg font-semibold text-warm-800 dark:text-warm-100 mb-4">Today's Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-warm-500 dark:text-warm-400">New Clients</p>
              <p className="text-2xl font-bold text-warm-800 dark:text-warm-100">{data.today.newClientsToday}</p>
            </div>
            <div>
              <p className="text-sm text-warm-500 dark:text-warm-400">Storage Used</p>
              <p className="text-2xl font-bold text-warm-800 dark:text-warm-100">{data.today.storageUsedMB} MB</p>
            </div>
            <div>
              <p className="text-sm text-warm-500 dark:text-warm-400">Growth Rate</p>
              <p className={`text-2xl font-bold ${data.today.growthRate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {data.today.growthRate >= 0 ? '+' : ''}{data.today.growthRate.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-warm-500 dark:text-warm-400">Page Views</p>
              <p className="text-2xl font-bold text-warm-800 dark:text-warm-100">{data.today.totalPageViews || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Plan Breakdown */}
      {data?.today?.planBreakdown && (
        <div className="bg-white dark:bg-warm-900 rounded-xl shadow-soft border border-warm-200 dark:border-warm-800 p-6 mb-8">
          <h2 className="text-lg font-semibold text-warm-800 dark:text-warm-100 mb-4">Plan Distribution</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(data.today.planBreakdown).map(([plan, count]) => (
              <div key={plan} className="border border-warm-200 dark:border-warm-700 rounded-xl p-4 bg-warm-50 dark:bg-warm-800/50">
                <p className="text-sm text-warm-500 dark:text-warm-400 capitalize">{plan}</p>
                <p className="text-xl font-bold text-warm-800 dark:text-warm-100">{count as number}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Chart */}
      {data?.week && data.week.length > 0 && (
        <div className="bg-white dark:bg-warm-900 rounded-xl shadow-soft border border-warm-200 dark:border-warm-800 p-6">
          <h2 className="text-lg font-semibold mb-4">Last 7 Days</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-right py-2">Clients</th>
                  <th className="text-right py-2">New</th>
                  <th className="text-right py-2">Storage (MB)</th>
                </tr>
              </thead>
              <tbody>
                {data.week.map((day: any) => (
                  <tr key={day.id} className="border-b last:border-0">
                    <td className="py-2">{new Date(day.date).toLocaleDateString()}</td>
                    <td className="text-right py-2">{day.totalClients}</td>
                    <td className="text-right py-2">{day.newClientsToday}</td>
                    <td className="text-right py-2">{day.storageUsedMB}</td>
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

function StatCard({ icon, title, value, color }: { icon: React.ReactNode; title: string; value: number; color: string }) {
  return (
    <div className="bg-white dark:bg-warm-900 rounded-xl shadow-soft border border-warm-200 dark:border-warm-800 p-4 flex items-center gap-4">
      <div className={`${color} text-white p-3 rounded-lg`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-warm-500 dark:text-warm-400">{title}</p>
        <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}
