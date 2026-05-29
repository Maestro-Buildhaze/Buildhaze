import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { FileText, Search, Filter, CheckCircle, XCircle } from 'lucide-react';

interface ActivityLog {
  id: string;
  actorEmail: string;
  actorType: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetName: string | null;
  details: any;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

export function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ actor: '', action: '', page: 1, limit: 50 });
  const [pagination, setPagination] = useState({ total: 0 });

  useEffect(() => { loadLogs(); }, [filters]);

  const loadLogs = async () => {
    try {
      const res = await api.admin.getActivityLogs({
        actor: filters.actor || undefined,
        action: filters.action || undefined,
        page: filters.page,
        limit: filters.limit,
      });
      setLogs(res.logs || []);
      setPagination(res.pagination || { total: 0 });
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="icon-box w-11 h-11 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f97316,#c2590a)' }}>
          <FileText className="w-5 h-5 text-white relative z-10" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold" style={{ color: 'var(--txt-primary)' }}>Activity Log</h1>
          <p className="text-sm" style={{ color: 'var(--txt-muted)' }}>Audit trail complet al acțiunilor din platformă</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="neu-card p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="section-label mb-2 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" /> Actor Email
            </label>
            <input
              type="text"
              value={filters.actor}
              onChange={(e) => setFilters({ ...filters, actor: e.target.value, page: 1 })}
              className="neu-input"
              placeholder="Filter by email..."
            />
          </div>
          <div className="min-w-[160px]">
            <label className="section-label mb-2 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Action
            </label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
              className="neu-select"
            >
              <option value="">All Actions</option>
              <option value="client_created">Client Created</option>
              <option value="client_updated">Client Updated</option>
              <option value="client_deleted">Client Deleted</option>
              <option value="template_created">Template Created</option>
              <option value="backup_created">Backup Created</option>
              <option value="domain_verified">Domain Verified</option>
            </select>
          </div>
          <button
            onClick={() => setFilters({ actor: '', action: '', page: 1, limit: 50 })}
            className="neu-btn-ghost px-4 py-2.5 text-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* ── Logs Table ── */}
      <div className="neu-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--neu-border)' }}>
                {['Time', 'Actor', 'Action', 'Target', 'Status'].map((h, i) => (
                  <th
                    key={h}
                    className={`py-4 px-5 section-label ${i === 4 ? 'text-center' : 'text-left'}`}
                  >{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="table-row-hover transition-colors"
                  style={{ borderBottom: '1px solid var(--neu-border)' }}
                >
                  <td className="py-4 px-5 text-[14px]" style={{ color: 'var(--txt-muted)' }}>
                    {new Date(log.createdAt).toLocaleString('ro-RO')}
                  </td>
                  <td className="py-4 px-5">
                    <p className="text-[14px] font-medium" style={{ color: 'var(--txt-primary)' }}>{log.actorEmail}</p>
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
                    >
                      {log.actorType}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <span
                      className="text-[12px] font-bold px-2.5 py-1 rounded-lg"
                      style={{
                        background: 'rgba(129,140,248,0.12)',
                        color: '#818cf8',
                        border: '1px solid rgba(129,140,248,0.2)',
                      }}
                    >
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-[14px]">
                    {log.targetType && (
                      <span style={{ color: 'var(--txt-muted)' }}>{log.targetType}: </span>
                    )}
                    <span style={{ color: 'var(--txt-secondary)' }}>{log.targetName || log.targetId || '—'}</span>
                  </td>
                  <td className="py-4 px-5 text-center">
                    {log.success ? (
                      <CheckCircle className="w-5 h-5 mx-auto" style={{ color: '#34d399' }} />
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <XCircle className="w-5 h-5" style={{ color: '#f87171' }} />
                        {log.errorMessage && (
                          <span className="text-[11px] max-w-[120px] truncate" style={{ color: '#f87171' }} title={log.errorMessage}>
                            {log.errorMessage}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {logs.length === 0 && (
            <div className="py-16 text-center">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: 'var(--txt-muted)' }} />
              <p className="text-[15px]" style={{ color: 'var(--txt-muted)' }}>No activity logs found</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Pagination ── */}
      <div className="flex justify-between items-center">
        <p className="text-[14px]" style={{ color: 'var(--txt-muted)' }}>
          Showing {logs.length} of {pagination.total} records
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            disabled={filters.page === 1}
            className="neu-btn-ghost px-4 py-2 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--neu-surface2)', color: 'var(--txt-primary)', border: '1px solid var(--neu-border)' }}
          >
            Page {filters.page}
          </span>
          <button
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            disabled={logs.length < filters.limit}
            className="neu-btn-ghost px-4 py-2 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
