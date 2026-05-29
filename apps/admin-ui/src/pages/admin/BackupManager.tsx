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

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'completed': return { background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' };
      case 'running':   return { background: 'rgba(129,140,248,0.12)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.25)' };
      case 'failed':    return { background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' };
      default:          return { background: 'var(--neu-surface2)', color: 'var(--txt-muted)', border: '1px solid var(--neu-border)' };
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="icon-box w-11 h-11 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f97316,#c2590a)' }}>
            <Archive className="w-5 h-5 text-white relative z-10" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold" style={{ color: 'var(--txt-primary)' }}>Backup & Restore</h1>
            <p className="text-sm" style={{ color: 'var(--txt-muted)' }}>Gestionează backup-urile bazei de date</p>
          </div>
        </div>
        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="neu-btn-primary flex items-center gap-2.5 px-5 py-2.5 disabled:opacity-50 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 relative z-10" />
          <span className="relative z-10">{creating ? 'Se creează...' : '+ Create Backup'}</span>
        </button>
      </div>

      {/* ── Auto Backup Schedule ── */}
      <div className="neu-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-6 rounded-full" style={{ background: 'linear-gradient(180deg,#f97316,#c2590a)' }} />
          <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--txt-primary)' }}>
            <Calendar className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            Auto-Backup Schedule
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-end">
          <div>
            <label className="section-label mb-2 block">Enabled</label>
            <select
              value={autoSchedule.enabled ? 'true' : 'false'}
              onChange={(e) => setAutoSchedule({ ...autoSchedule, enabled: e.target.value === 'true' })}
              className="neu-select"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div>
            <label className="section-label mb-2 block">Frequency</label>
            <select
              value={autoSchedule.frequency}
              onChange={(e) => setAutoSchedule({ ...autoSchedule, frequency: e.target.value })}
              className="neu-select"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div>
            <label className="section-label mb-2 block">Retention (days)</label>
            <input
              type="number"
              value={autoSchedule.retentionDays}
              onChange={(e) => setAutoSchedule({ ...autoSchedule, retentionDays: parseInt(e.target.value) })}
              className="neu-input"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="neu-btn-ghost px-5 py-2.5 text-sm">Save Schedule</button>
        </div>
      </div>

      {/* ── Backups List ── */}
      <div className="neu-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--neu-border)' }}>
                {['Name', 'Status', 'Size', 'Created', 'Type', 'Actions'].map((h, i) => (
                  <th
                    key={h}
                    className={`py-4 px-5 section-label ${i === 5 ? 'text-right' : 'text-left'}`}
                  >{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr
                  key={backup.id}
                  className="table-row-hover transition-colors"
                  style={{ borderBottom: '1px solid var(--neu-border)' }}
                >
                  <td className="py-4 px-5 text-[14px] font-medium" style={{ color: 'var(--txt-primary)' }}>
                    {backup.name}
                  </td>
                  <td className="py-4 px-5">
                    <span
                      className="text-[12px] font-bold px-2.5 py-1 rounded-lg"
                      style={getStatusBadgeStyle(backup.status)}
                    >
                      {backup.status}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-[14px]" style={{ color: 'var(--txt-secondary)' }}>
                    {formatSize(backup.sizeBytes)}
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-1.5 text-[14px]" style={{ color: 'var(--txt-muted)' }}>
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(backup.startedAt).toLocaleString('ro-RO')}
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <span
                      className="text-[12px] font-semibold px-2.5 py-1 rounded-lg"
                      style={backup.type === 'auto'
                        ? { background: 'rgba(129,140,248,0.12)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.2)' }
                        : { background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(249,115,22,0.2)' }
                      }
                    >
                      {backup.type}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="flex justify-end gap-1.5">
                      {backup.status === 'completed' && (
                        <>
                          <button
                            onClick={() => handleRestore(backup.id)}
                            className="p-2 rounded-lg transition-all hover:scale-105"
                            style={{ color: '#818cf8', background: 'rgba(129,140,248,0.08)' }}
                            title="Restore"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 rounded-lg transition-all hover:scale-105"
                            style={{ color: '#34d399', background: 'rgba(52,211,153,0.08)' }}
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(backup.id)}
                        className="p-2 rounded-lg transition-all hover:scale-105"
                        style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)' }}
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
            <div className="py-16 text-center">
              <Archive className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: 'var(--txt-muted)' }} />
              <p className="text-[15px]" style={{ color: 'var(--txt-muted)' }}>
                No backups found. Create your first backup to protect your data.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
