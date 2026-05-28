import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Gauge, HardDrive, FileText, Image, RefreshCw, AlertTriangle } from 'lucide-react';

interface Quota {
  id: string;
  clientId: string;
  clientName: string;
  plan: string;
  pagesUsed: number;
  maxPages: number;
  storageUsedMB: number;
  maxStorageMB: number;
  blogPostsUsed: number;
  maxBlogPosts: number;
  mediaFilesUsed: number;
  pagesPercent: number;
  storagePercent: number;
  overLimit: boolean;
}

export function QuotaManager() {
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState<string | null>(null);

  useEffect(() => {
    loadQuotas();
  }, []);

  const loadQuotas = async () => {
    try {
      const res = await api.admin.getQuotas();
      setQuotas(res.quotas || []);
    } catch (err) {
      console.error('Failed to load quotas:', err);
    } finally {
      setLoading(false);
    }
  };

  const recalculate = async (clientId: string) => {
    setRecalculating(clientId);
    try {
      await api.admin.recalculateQuota(clientId);
      await loadQuotas();
    } catch (err) {
      console.error('Recalculation failed:', err);
    } finally {
      setRecalculating(null);
    }
  };

  const getProgressColor = (percent: number) => {
    if (percent < 50) return 'bg-green-500';
    if (percent < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) return <div className="p-8 text-warm-600 dark:text-warm-400">Loading quotas...</div>;

  const overLimitCount = quotas.filter(q => q.overLimit).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gauge className="w-6 h-6" />
          Quotas & Limits
        </h1>
      </div>

      {/* Alert for over limit */}
      {overLimitCount > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
            <AlertTriangle className="w-5 h-5" />
            <span>{overLimitCount} clients are over their quota limits</span>
          </div>
        </div>
      )}

      {/* Quotas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quotas.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 text-warm-500 dark:text-warm-400">
            <Gauge className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No quota data available. Recalculate quotas to populate.</p>
          </div>
        )}
        {quotas.map((quota) => (
          <div 
            key={quota.id} 
            className={`bg-white dark:bg-warm-900 rounded-xl shadow-soft p-4 border border-warm-200 dark:border-warm-800 ${quota.overLimit ? 'border-2 border-red-300 dark:border-red-700' : ''}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-warm-800 dark:text-warm-100">{quota.clientName}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{quota.plan}</span>
              </div>
              <button
                onClick={() => recalculate(quota.clientId)}
                disabled={recalculating === quota.clientId}
                className="p-1 text-warm-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${recalculating === quota.clientId ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Pages Usage */}
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-1 text-warm-600 dark:text-warm-400"><FileText className="w-4 h-4" /> Pages</span>
                <span className="text-warm-700 dark:text-warm-300">{quota.pagesUsed} / {quota.maxPages}</span>
              </div>
              <div className="h-2 bg-warm-200 dark:bg-warm-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getProgressColor(quota.pagesPercent)}`}
                  style={{ width: `${Math.min(quota.pagesPercent, 100)}%` }}
                />
              </div>
            </div>

            {/* Storage Usage */}
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-1 text-warm-600 dark:text-warm-400"><HardDrive className="w-4 h-4" /> Storage</span>
                <span className="text-warm-700 dark:text-warm-300">{quota.storageUsedMB} / {quota.maxStorageMB} MB</span>
              </div>
              <div className="h-2 bg-warm-200 dark:bg-warm-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getProgressColor(quota.storagePercent)}`}
                  style={{ width: `${Math.min(quota.storagePercent, 100)}%` }}
                />
              </div>
            </div>

            {/* Blog Posts */}
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-1 text-warm-600 dark:text-warm-400"><Image className="w-4 h-4" /> Blog Posts</span>
                <span className="text-warm-700 dark:text-warm-300">{quota.blogPostsUsed} / {quota.maxBlogPosts}</span>
              </div>
              <div className="h-2 bg-warm-200 dark:bg-warm-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getProgressColor((quota.blogPostsUsed / quota.maxBlogPosts) * 100)}`}
                  style={{ width: `${Math.min((quota.blogPostsUsed / quota.maxBlogPosts) * 100, 100)}%` }}
                />
              </div>
            </div>

            {quota.overLimit && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs rounded-lg">
                Over limit! Consider upgrading plan.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
