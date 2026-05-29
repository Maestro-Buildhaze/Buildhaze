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
    if (percent < 50) return '#34d399';
    if (percent < 80) return '#fbbf24';
    return '#f87171';
  };

  if (loading) return <div className="p-8" style={{ color: 'var(--txt-muted)' }}>Loading quotas...</div>;

  const overLimitCount = quotas.filter(q => q.overLimit).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="icon-box w-11 h-11 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f97316,#c2590a)' }}>
          <Gauge className="w-5 h-5 text-white relative z-10" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold" style={{ color: 'var(--txt-primary)' }}>Quotas &amp; Limits</h1>
          <p className="text-sm" style={{ color: 'var(--txt-muted)' }}>Monitorizează utilizarea resurselor per client</p>
        </div>
      </div>

      {/* Alert for over limit */}
      {overLimitCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.30)', color: '#f87171' }}>
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="font-semibold text-[14px]">{overLimitCount} clients are over their quota limits</span>
        </div>
      )}

      {/* Quotas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quotas.length === 0 && !loading && (
          <div className="col-span-full text-center py-16">
            <Gauge className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: 'var(--txt-muted)' }} />
            <p className="text-[15px]" style={{ color: 'var(--txt-muted)' }}>No quota data available.</p>
          </div>
        )}
        {quotas.map((quota) => (
          <div
            key={quota.id}
            className="neu-card p-5"
            style={quota.overLimit ? { border: '1px solid rgba(248,113,113,0.40)' } : {}}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-[15px]" style={{ color: 'var(--txt-primary)' }}>{quota.clientName}</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>{quota.plan}</span>
              </div>
              <button
                onClick={() => recalculate(quota.clientId)}
                disabled={recalculating === quota.clientId}
                className="p-1.5 rounded-lg transition-all hover:scale-110 disabled:opacity-50"
                style={{ color: 'var(--accent)', background: 'var(--accent-glow)' }}
              >
                <RefreshCw className={`w-4 h-4 ${recalculating === quota.clientId ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {[{
              label: 'Pages', icon: FileText, used: quota.pagesUsed, max: quota.maxPages, pct: quota.pagesPercent,
            }, {
              label: 'Storage', icon: HardDrive, used: quota.storageUsedMB, max: quota.maxStorageMB, pct: quota.storagePercent, suffix: ' MB',
            }, {
              label: 'Blog Posts', icon: Image, used: quota.blogPostsUsed, max: quota.maxBlogPosts, pct: (quota.blogPostsUsed / quota.maxBlogPosts) * 100,
            }].map(({ label, icon: Icon, used, max, pct, suffix = '' }) => (
              <div key={label} className="mb-3">
                <div className="flex justify-between text-[12px] mb-1.5">
                  <span className="flex items-center gap-1" style={{ color: 'var(--txt-muted)' }}><Icon className="w-3.5 h-3.5" /> {label}</span>
                  <span className="font-semibold" style={{ color: 'var(--txt-secondary)' }}>{used}{suffix} / {max}{suffix}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--neu-surface2)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: getProgressColor(pct) }} />
                </div>
              </div>
            ))}

            {quota.overLimit && (
              <div className="mt-3 p-2 rounded-lg text-[12px] font-semibold" style={{ background: 'rgba(248,113,113,0.10)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                Over limit! Consider upgrading plan.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
