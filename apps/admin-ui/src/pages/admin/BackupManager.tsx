import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Archive, Download, RotateCcw, Trash2, Plus, Calendar, Clock } from 'lucide-react';

interface Backup {
  id: string;
  name: string;
  type: 'manual' | 'auto';
  status: 'running' | 'completed' | 'failed';
  sizeBytes: number | null;
  tables: string[];
  triggeredBy: string;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

export function BackupManager() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [autoSchedule, setAutoSchedule] = useState({
    enabled: false,
    frequency: 'daily',
    retentionDays: 30,
  });

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const res = await api.admin.getBackups();
      setBackups(res.backups || []);
    } catch (err) {
      console.error('Failed to load backups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      await api.admin.createBackup(`Manual Backup ${new Date().toLocaleString()}`, ['all']);
      await loadBackups();
    } catch (err) {
      console.error('Create backup failed:', err);
      alert('Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (id: string) => {
    if (!confirm('Are you sure you want to restore this backup? This will overwrite current data.')) return;
    try {
      await api.admin.restoreBackup(id);
      alert('Restore process started. This may take several minutes.');
    } catch (err) {
      console.error('Restore failed:', err);
      alert('Failed to start restore');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) return;
    try {
      await api.admin.deleteBackup(id);
      await loadBackups();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '-';
    const mb = bytes / 1024 / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Completed</span>;
      case 'running':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">Running...</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Failed</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-warm-100 dark:bg-warm-800 text-warm-700 dark:text-warm-300">{status}</span>;
    }
  };

  if (loading) return <div className="p-8 text-warm-600 dark:text-warm-400">Loading backups...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Archive className="w-6 h-6" />
          Backup & Restore
        </h1>
        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {creating ? 'Creating...' : 'Create Backup'}
        </button>
      </div>

      {/* Auto Backup Settings */}
      <div className="bg-white dark:bg-warm-900 rounded-xl shadow-soft border border-warm-200 dark:border-warm-800 p-4 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Auto-Backup Schedule
        </h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-sm text-warm-500 dark:text-warm-400">Enabled</label>
            <select
              value={autoSchedule.enabled ? 'true' : 'false'}
              onChange={(e) => setAutoSchedule({ ...autoSchedule, enabled: e.target.value === 'true' })}
              className="border rounded px-3 py-1 block"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-warm-500 dark:text-warm-400">Frequency</label>
            <select
              value={autoSchedule.frequency}
              onChange={(e) => setAutoSchedule({ ...autoSchedule, frequency: e.target.value })}
              className="border rounded px-3 py-1 block"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-warm-500 dark:text-warm-400">Retention (days)</label>
            <input
              type="number"
              value={autoSchedule.retentionDays}
              onChange={(e) => setAutoSchedule({ ...autoSchedule, retentionDays: parseInt(e.target.value) })}
              className="border rounded px-3 py-1 w-20 block"
            />
          </div>
          <button className="px-4 py-1 bg-warm-100 dark:bg-warm-800 rounded hover:bg-warm-200 dark:bg-warm-700">
            Save Schedule
          </button>
        </div>
      </div>

      {/* Backups List */}
      <div className="bg-white dark:bg-warm-900 rounded-xl shadow-soft border border-warm-200 dark:border-warm-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-warm-50 dark:bg-warm-800/50">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-warm-500 dark:text-warm-400">Name</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-warm-500 dark:text-warm-400">Status</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-warm-500 dark:text-warm-400">Size</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-warm-500 dark:text-warm-400">Created</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-warm-500 dark:text-warm-400">Type</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-warm-500 dark:text-warm-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {backups.map((backup) => (
              <tr key={backup.id} className="border-b last:border-0 hover:bg-warm-50 dark:bg-warm-800/50">
                <td className="py-3 px-4">{backup.name}</td>
                <td className="py-3 px-4">{getStatusBadge(backup.status)}</td>
                <td className="py-3 px-4">{formatSize(backup.sizeBytes)}</td>
                <td className="py-3 px-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {new Date(backup.startedAt).toLocaleString()}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 text-xs rounded ${backup.type === 'auto' ? 'bg-purple-100 text-purple-700' : 'bg-warm-100 dark:bg-warm-800 text-warm-700 dark:text-warm-300'}`}>
                    {backup.type}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    {backup.status === 'completed' && (
                      <>
                        <button
                          onClick={() => handleRestore(backup.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Restore"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-green-600 hover:bg-green-50 rounded"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(backup.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {backups.length === 0 && (
          <div className="p-8 text-center text-warm-500 dark:text-warm-400">
            No backups found. Create your first backup to protect your data.
          </div>
        )}
      </div>
    </div>
  );
}
