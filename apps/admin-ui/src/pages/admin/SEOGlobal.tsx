import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Search, Save, Globe, FileText } from 'lucide-react';

interface SEOSettings {
  id: string;
  clientId: string;
  clientName: string;
  siteTitle: string | null;
  siteDescription: string | null;
  siteKeywords: string | null;
  robotsTxt: string | null;
  faviconUrl: string | null;
  ogImageDefault: string | null;
  socialProfiles: any;
  sitemap: { enabled: boolean };
}

export function SEOGlobal() {
  const [seoList, setSeoList] = useState<SEOSettings[]>([]);
  const [selected, setSelected] = useState<SEOSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSEO();
  }, []);

  const loadSEO = async () => {
    try {
      const res = await api.admin.getSEOGlobal();
      setSeoList(res.seoSettings || []);
    } catch (err) {
      console.error('Failed to load SEO:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (clientId: string) => {
    try {
      const res = await api.admin.getClientSEO(clientId);
      setSelected(res.seo);
    } catch (err) {
      console.error('Failed to load client SEO:', err);
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.admin.updateClientSEO(selected.clientId, {
        siteTitle: selected.siteTitle,
        siteDescription: selected.siteDescription,
        siteKeywords: selected.siteKeywords,
        robotsTxt: selected.robotsTxt,
        faviconUrl: selected.faviconUrl,
        ogImageDefault: selected.ogImageDefault,
        sitemap: selected.sitemap,
      });
      alert('SEO settings saved!');
      await loadSEO();
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-warm-600 dark:text-warm-400">Loading SEO settings...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Search className="w-6 h-6" />
          SEO Global Settings
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client List */}
        <div className="bg-white dark:bg-warm-900 rounded-xl shadow-soft border border-warm-200 dark:border-warm-800">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Clients</h2>
          </div>
          <div className="divide-y max-h-96 overflow-auto">
            {seoList.map((seo) => (
              <button
                key={seo.id}
                onClick={() => handleSelect(seo.clientId)}
                className={`w-full p-4 text-left hover:bg-warm-50 dark:bg-warm-800/50 ${selected?.clientId === seo.clientId ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
              >
                <h3 className="font-medium">{seo.clientName}</h3>
                <p className="text-sm text-warm-500 dark:text-warm-400 truncate">{seo.siteTitle || 'No title set'}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-white dark:bg-warm-900 rounded-xl shadow-soft border border-warm-200 dark:border-warm-800">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="font-semibold flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  SEO for: {selected.clientName}
                </h2>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm text-warm-500 dark:text-warm-400">Site Title</label>
                  <input
                    type="text"
                    value={selected.siteTitle || ''}
                    onChange={(e) => setSelected({ ...selected, siteTitle: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="My Business Website"
                  />
                </div>
                <div>
                  <label className="text-sm text-warm-500 dark:text-warm-400">Site Description</label>
                  <textarea
                    value={selected.siteDescription || ''}
                    onChange={(e) => setSelected({ ...selected, siteDescription: e.target.value })}
                    rows={2}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Brief description for search engines..."
                  />
                </div>
                <div>
                  <label className="text-sm text-warm-500 dark:text-warm-400">Keywords (comma separated)</label>
                  <input
                    type="text"
                    value={selected.siteKeywords || ''}
                    onChange={(e) => setSelected({ ...selected, siteKeywords: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>
                <div>
                  <label className="text-sm text-warm-500 dark:text-warm-400">Favicon URL</label>
                  <input
                    type="text"
                    value={selected.faviconUrl || ''}
                    onChange={(e) => setSelected({ ...selected, faviconUrl: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="https://.../favicon.ico"
                  />
                </div>
                <div>
                  <label className="text-sm text-warm-500 dark:text-warm-400">Default OG Image URL</label>
                  <input
                    type="text"
                    value={selected.ogImageDefault || ''}
                    onChange={(e) => setSelected({ ...selected, ogImageDefault: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="https://.../og-image.jpg"
                  />
                </div>
                <div>
                  <label className="text-sm text-warm-500 dark:text-warm-400 flex items-center gap-1">
                    <FileText className="w-4 h-4" /> robots.txt
                  </label>
                  <textarea
                    value={selected.robotsTxt || ''}
                    onChange={(e) => setSelected({ ...selected, robotsTxt: e.target.value })}
                    rows={4}
                    className="w-full border rounded px-3 py-2 font-mono text-sm"
                    placeholder="User-agent: *&#10;Allow: /&#10;Sitemap: https://.../sitemap.xml"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.sitemap?.enabled || false}
                    onChange={(e) => setSelected({ ...selected, sitemap: { ...selected.sitemap, enabled: e.target.checked } })}
                    className="w-4 h-4"
                  />
                  <label>Enable Sitemap</label>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-warm-50 dark:bg-warm-800/50 rounded-lg p-8 text-center text-warm-500 dark:text-warm-400">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Select a client to edit SEO settings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
