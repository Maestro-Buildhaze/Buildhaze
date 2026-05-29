import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { GitBranch, Plus, RotateCcw, CheckCircle, Clock } from 'lucide-react';

interface Version {
  id: string;
  version: number;
  name: string;
  description: string | null;
  createdBy: string;
  isCurrent: boolean;
  createdAt: string;
}

export function TemplateVersions() {
  const { templateId } = useParams<{ templateId?: string }>();
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState(templateId || '');
  const [versions, setVersions] = useState<Version[]>([]);
  const [current, setCurrent] = useState<Version | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newVersion, setNewVersion] = useState({ name: '', description: '' });

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      loadVersions(selectedTemplate);
    }
  }, [selectedTemplate]);

  const loadTemplates = async () => {
    try {
      const res = await api.admin.getTemplates();
      setTemplates(res || []);
      if (res?.length > 0 && !selectedTemplate) {
        setSelectedTemplate(res[0].id);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async (tid: string) => {
    try {
      const res = await api.admin.getTemplateVersions(tid);
      setVersions(res.versions || []);
      setCurrent(res.current || null);
    } catch (err) {
      console.error('Failed to load versions:', err);
    }
  };

  const handleCreate = async () => {
    if (!selectedTemplate || !newVersion.name) return;
    setCreating(true);
    try {
      await api.admin.createTemplateVersion(selectedTemplate, newVersion.name, newVersion.description);
      await loadVersions(selectedTemplate);
      setNewVersion({ name: '', description: '' });
    } catch (err) {
      console.error('Create failed:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleRollback = async (versionId: string) => {
    if (!confirm('Are you sure you want to rollback to this version?')) return;
    try {
      await api.admin.rollbackTemplateVersion(selectedTemplate, versionId);
      await loadVersions(selectedTemplate);
    } catch (err) {
      console.error('Rollback failed:', err);
    }
  };

  if (loading) return <div className="p-8" style={{ color: 'var(--txt-muted)' }}>Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="icon-box w-11 h-11 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f97316,#c2590a)' }}>
            <GitBranch className="w-5 h-5 text-white relative z-10" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold" style={{ color: 'var(--txt-primary)' }}>Template Versions</h1>
            <p className="text-sm" style={{ color: 'var(--txt-muted)' }}>Gestionează versiunile și rollback</p>
          </div>
        </div>
        <select
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          className="neu-select w-56"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Create Version */}
      <div className="neu-card p-5">
        <h3 className="font-bold text-[16px] mb-4 flex items-center gap-2" style={{ color: 'var(--txt-primary)' }}>
          <Plus className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          Create New Version
        </h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="section-label mb-2 block">Version Name</label>
            <input
              type="text"
              value={newVersion.name}
              onChange={(e) => setNewVersion({ ...newVersion, name: e.target.value })}
              className="neu-input"
              placeholder="v2.0 - New Design"
            />
          </div>
          <div className="flex-1 min-w-[220px]">
            <label className="section-label mb-2 block">Description</label>
            <input
              type="text"
              value={newVersion.description}
              onChange={(e) => setNewVersion({ ...newVersion, description: e.target.value })}
              className="neu-input"
              placeholder="What changed?"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !newVersion.name}
            className="neu-btn-primary px-5 py-2.5 disabled:opacity-50"
          >
            <span className="relative z-10">{creating ? 'Creating...' : 'Create Version'}</span>
          </button>
        </div>
      </div>

      {/* Current Version */}
      {current && (
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.30)' }}>
          <CheckCircle className="w-6 h-6 shrink-0" style={{ color: '#34d399' }} />
          <div>
            <h3 className="font-semibold text-[15px]" style={{ color: '#34d399' }}>Current Version: {current.name}</h3>
            <p className="text-[13px]" style={{ color: '#34d39999' }}>v{current.version} • Created {new Date(current.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      )}

      {/* Versions List */}
      <div className="neu-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--neu-border)' }}>
                {['Version', 'Name', 'Description', 'Created', 'Status', 'Actions'].map((h, i) => (
                  <th key={h} className={`py-4 px-5 section-label ${i === 4 ? 'text-center' : i === 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className="table-row-hover transition-colors" style={{ borderBottom: '1px solid var(--neu-border)' }}>
                  <td className="py-4 px-5 font-mono text-[14px] font-bold" style={{ color: 'var(--accent)' }}>v{v.version}</td>
                  <td className="py-4 px-5 text-[14px] font-semibold" style={{ color: 'var(--txt-primary)' }}>{v.name}</td>
                  <td className="py-4 px-5 text-[13px]" style={{ color: 'var(--txt-muted)' }}>{v.description || '—'}</td>
                  <td className="py-4 px-5">
                    <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--txt-muted)' }}>
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(v.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-center">
                    {v.isCurrent ? (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>Current</span>
                    ) : (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg" style={{ background: 'var(--neu-surface2)', color: 'var(--txt-muted)', border: '1px solid var(--neu-border)' }}>Archived</span>
                    )}
                  </td>
                  <td className="py-4 px-5 text-right">
                    {!v.isCurrent && (
                      <button onClick={() => handleRollback(v.id)} className="p-2 rounded-lg transition-all hover:scale-105" style={{ color: '#818cf8', background: 'rgba(129,140,248,0.08)' }} title="Rollback to this version">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {versions.length === 0 && (
            <div className="py-16 text-center">
              <GitBranch className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: 'var(--txt-muted)' }} />
              <p className="text-[15px]" style={{ color: 'var(--txt-muted)' }}>No versions yet. Create your first version above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
