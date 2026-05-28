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
  const [filters, setFilters] = useState({
    actor: '',
    action: '',
    page: 1,
    limit: 50,
  });
  const [pagination, setPagination] = useState({ total: 0 });

  useEffect(() => {
    loadLogs();
  }, [filters]);

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

  if (loading) return <div className="p-8">Loading activity logs...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Activity Log / Audit Trail
        </h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-sm text-gray-500 flex items-center gap-1">
              <Search className="w-4 h-4" /> Actor Email
            </label>
            <input
              type="text"
              value={filters.actor}
              onChange={(e) => setFilters({ ...filters, actor: e.target.value, page: 1 })}
              className="border rounded px-3 py-1 w-48"
              placeholder="Filter by email..."
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 flex items-center gap-1">
              <Filter className="w-4 h-4" /> Action
            </label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
              className="border rounded px-3 py-1 w-40"
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
            className="px-4 py-1 text-sm text-gray-600 hover:text-gray-800"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Time</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actor</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Action</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Target</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-3 px-4 text-sm">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm">{log.actorEmail}</span>
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                    {log.actorType}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
                    {log.action}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm">
                  {log.targetType && (
                    <span className="text-gray-500">{log.targetType}:</span>
                  )}
                  <span className="ml-1">{log.targetName || log.targetId || '-'}</span>
                </td>
                <td className="py-3 px-4 text-center">
                  {log.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <XCircle className="w-5 h-5 text-red-500" />
                      {log.errorMessage && (
                        <span className="text-xs text-red-500 max-w-xs truncate" title={log.errorMessage}>
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
          <div className="p-8 text-center text-gray-500">No activity logs found</div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-500">
          Showing {logs.length} of {pagination.total} records
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            disabled={filters.page === 1}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1">Page {filters.page}</span>
          <button
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            disabled={logs.length < filters.limit}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
