import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Download, FileSpreadsheet, FileJson, Plus, Clock, CheckCircle } from 'lucide-react';

interface ExportJob {
  id: string;
  type: string;
  format: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  recordCount: number | null;
  fileSizeBytes: number | null;
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
  downloadUrl: string | null;
}

export function ExportCenter() {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newExport, setNewExport] = useState({
    type: 'clients_csv',
    format: 'csv',
  });

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const res = await api.admin.getExports();
      setJobs(res.jobs || []);
    } catch (err) {
      console.error('Failed to load exports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.admin.createExport(newExport.type, newExport.format);
      await loadJobs();
    } catch (err) {
      console.error('Create failed:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const res = await api.admin.downloadExport(id);
      if (res.downloadUrl) {
        window.open(res.downloadUrl, '_blank');
      }
    } catch (err) {
      console.error('Download failed:', err);
      alert('Download not ready yet');
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Completed</span>;
      case 'running':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">Processing...</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Failed</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">Pending</span>;
    }
  };

  if (loading) return <div className="p-8">Loading exports...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Download className="w-6 h-6" />
          Export Center
        </h1>
      </div>

      {/* Create Export */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create New Export
        </h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-sm text-gray-500">Export Type</label>
            <select
              value={newExport.type}
              onChange={(e) => setNewExport({ ...newExport, type: e.target.value })}
              className="border rounded px-3 py-1 block w-40"
            >
              <option value="clients_csv">All Clients</option>
              <option value="analytics_json">Analytics Data</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-500">Format</label>
            <select
              value={newExport.format}
              onChange={(e) => setNewExport({ ...newExport, format: e.target.value })}
              className="border rounded px-3 py-1 block w-32"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Export'}
          </button>
        </div>
      </div>

      {/* Exports List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Type</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Format</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Records</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Size</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Created</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-3 px-4">{job.type}</td>
                <td className="py-3 px-4">
                  <span className="flex items-center gap-1">
                    {job.format === 'csv' ? <FileSpreadsheet className="w-4 h-4" /> : <FileJson className="w-4 h-4" />}
                    {job.format.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 px-4">{getStatusBadge(job.status)}</td>
                <td className="py-3 px-4 text-right">{job.recordCount ?? '-'}</td>
                <td className="py-3 px-4 text-right">{formatSize(job.fileSizeBytes)}</td>
                <td className="py-3 px-4">
                  <span className="flex items-center gap-1 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {new Date(job.createdAt).toLocaleString()}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  {job.status === 'completed' && (
                    <button
                      onClick={() => handleDownload(job.id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {jobs.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No exports yet. Create your first export above.
          </div>
        )}
      </div>
    </div>
  );
}
