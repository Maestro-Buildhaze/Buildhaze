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

  if (loading) return <div className="p-8">Loading quotas...</div>;

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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="w-5 h-5" />
            <span>{overLimitCount} clients are over their quota limits</span>
          </div>
        </div>
      )}

      {/* Quotas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quotas.map((quota) => (
          <div 
            key={quota.id} 
            className={`bg-white rounded-lg shadow p-4 ${quota.overLimit ? 'border-2 border-red-300' : ''}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold">{quota.clientName}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{quota.plan}</span>
              </div>
              <button
                onClick={() => recalculate(quota.clientId)}
                disabled={recalculating === quota.clientId}
                className="p-1 text-gray-400 hover:text-blue-600"
              >
                <RefreshCw className={`w-4 h-4 ${recalculating === quota.clientId ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Pages Usage */}
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> Pages</span>
                <span>{quota.pagesUsed} / {quota.maxPages}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getProgressColor(quota.pagesPercent)}`}
                  style={{ width: `${Math.min(quota.pagesPercent, 100)}%` }}
                />
              </div>
            </div>

            {/* Storage Usage */}
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-1"><HardDrive className="w-4 h-4" /> Storage</span>
                <span>{quota.storageUsedMB} / {quota.maxStorageMB} MB</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getProgressColor(quota.storagePercent)}`}
                  style={{ width: `${Math.min(quota.storagePercent, 100)}%` }}
                />
              </div>
            </div>

            {/* Blog Posts */}
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-1"><Image className="w-4 h-4" /> Blog Posts</span>
                <span>{quota.blogPostsUsed} / {quota.maxBlogPosts}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getProgressColor((quota.blogPostsUsed / quota.maxBlogPosts) * 100)}`}
                  style={{ width: `${Math.min((quota.blogPostsUsed / quota.maxBlogPosts) * 100, 100)}%` }}
                />
              </div>
            </div>

            {quota.overLimit && (
              <div className="mt-3 p-2 bg-red-50 text-red-700 text-xs rounded">
                Over limit! Consider upgrading plan.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
