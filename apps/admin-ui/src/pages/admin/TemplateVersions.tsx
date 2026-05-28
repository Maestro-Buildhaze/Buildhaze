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

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GitBranch className="w-6 h-6" />
          Template Versions
        </h1>
        <select
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Create Version */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create New Version
        </h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-sm text-gray-500">Version Name</label>
            <input
              type="text"
              value={newVersion.name}
              onChange={(e) => setNewVersion({ ...newVersion, name: e.target.value })}
              className="border rounded px-3 py-1 block w-48"
              placeholder="v2.0 - New Design"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500">Description</label>
            <input
              type="text"
              value={newVersion.description}
              onChange={(e) => setNewVersion({ ...newVersion, description: e.target.value })}
              className="border rounded px-3 py-1 block w-64"
              placeholder="What changed?"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !newVersion.name}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Version'}
          </button>
        </div>
      </div>

      {/* Current Version */}
      {current && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-800">Current Version: {current.name}</h3>
              <p className="text-sm text-green-700">v{current.version} • Created {new Date(current.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Versions List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Version</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Name</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Description</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Created</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Status</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.id} className={`border-b last:border-0 ${v.isCurrent ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                <td className="py-3 px-4 font-mono">v{v.version}</td>
                <td className="py-3 px-4 font-medium">{v.name}</td>
                <td className="py-3 px-4 text-sm text-gray-500">{v.description || '-'}</td>
                <td className="py-3 px-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {new Date(v.createdAt).toLocaleDateString()}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  {v.isCurrent ? (
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Current</span>
                  ) : (
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">Archived</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  {!v.isCurrent && (
                    <button
                      onClick={() => handleRollback(v.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Rollback to this version"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {versions.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No versions yet. Create your first version above.
          </div>
        )}
      </div>
    </div>
  );
}
