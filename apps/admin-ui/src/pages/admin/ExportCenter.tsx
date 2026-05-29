import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Download, FileSpreadsheet, FileJson, Plus, Clock } from 'lucide-react';

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

  const getStatusStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case 'completed': return { background: 'rgba(52,211,153,0.12)',  color: '#34d399', border: '1px solid rgba(52,211,153,0.25)'  };
      case 'running':   return { background: 'rgba(129,140,248,0.12)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.25)' };
      case 'failed':    return { background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' };
      default:          return { background: 'rgba(251,191,36,0.12)',  color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)'  };
    }
  };

  if (loading) return <div className="p-8" style={{ color: 'var(--txt-muted)' }}>Loading exports...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="icon-box w-11 h-11 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f97316,#c2590a)' }}>
          <Download className="w-5 h-5 text-white relative z-10" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold" style={{ color: 'var(--txt-primary)' }}>Export Center</h1>
          <p className="text-sm" style={{ color: 'var(--txt-muted)' }}>Exportează date din platformă</p>
        </div>
      </div>

      {/* Create Export */}
      <div className="neu-card p-5">
        <h3 className="font-bold text-[16px] mb-4 flex items-center gap-2" style={{ color: 'var(--txt-primary)' }}>
          <Plus className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          Create New Export
        </h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[160px]">
            <label className="section-label mb-2 block">Export Type</label>
            <select value={newExport.type} onChange={(e) => setNewExport({ ...newExport, type: e.target.value })} className="neu-select">
              <option value="clients_csv">All Clients</option>
              <option value="analytics_json">Analytics Data</option>
            </select>
          </div>
          <div className="min-w-[120px]">
            <label className="section-label mb-2 block">Format</label>
            <select value={newExport.format} onChange={(e) => setNewExport({ ...newExport, format: e.target.value })} className="neu-select">
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <button onClick={handleCreate} disabled={creating} className="neu-btn-primary px-5 py-2.5 disabled:opacity-50">
            <span className="relative z-10">{creating ? 'Creating...' : 'Create Export'}</span>
          </button>
        </div>
      </div>

      {/* Exports List */}
      <div className="neu-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--neu-border)' }}>
                {['Type', 'Format', 'Status', 'Records', 'Size', 'Created', 'Actions'].map((h, i) => (
                  <th key={h} className={`py-4 px-5 section-label ${[3,4,6].includes(i) ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="table-row-hover transition-colors" style={{ borderBottom: '1px solid var(--neu-border)' }}>
                  <td className="py-4 px-5 text-[13px]" style={{ color: 'var(--txt-secondary)' }}>{job.type}</td>
                  <td className="py-4 px-5">
                    <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--txt-primary)' }}>
                      {job.format === 'csv' ? <FileSpreadsheet className="w-4 h-4" style={{ color: '#34d399' }} /> : <FileJson className="w-4 h-4" style={{ color: '#818cf8' }} />}
                      {job.format.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg" style={getStatusStyle(job.status)}>{job.status}</span>
                  </td>
                  <td className="py-4 px-5 text-[14px] text-right" style={{ color: 'var(--txt-secondary)' }}>{job.recordCount ?? '—'}</td>
                  <td className="py-4 px-5 text-[14px] text-right" style={{ color: 'var(--txt-secondary)' }}>{formatSize(job.fileSizeBytes)}</td>
                  <td className="py-4 px-5">
                    <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--txt-muted)' }}>
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(job.createdAt).toLocaleString()}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right">
                    {job.status === 'completed' && (
                      <button onClick={() => handleDownload(job.id)} className="p-2 rounded-lg transition-all hover:scale-105" style={{ color: '#34d399', background: 'rgba(52,211,153,0.08)' }}>
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {jobs.length === 0 && (
            <div className="py-16 text-center">
              <Download className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: 'var(--txt-muted)' }} />
              <p className="text-[15px]" style={{ color: 'var(--txt-muted)' }}>No exports yet. Create your first export above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
