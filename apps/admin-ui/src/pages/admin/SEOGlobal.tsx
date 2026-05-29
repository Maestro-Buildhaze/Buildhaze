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

  if (loading) return <div className="p-8" style={{ color: 'var(--txt-muted)' }}>Loading SEO settings...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="icon-box w-11 h-11 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f97316,#c2590a)' }}>
          <Search className="w-5 h-5 text-white relative z-10" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold" style={{ color: 'var(--txt-primary)' }}>SEO Global Settings</h1>
          <p className="text-sm" style={{ color: 'var(--txt-muted)' }}>Configurează SEO per client</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client List */}
        <div className="neu-card overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--neu-border)' }}>
            <h2 className="font-bold text-[16px]" style={{ color: 'var(--txt-primary)' }}>Clients</h2>
          </div>
          <div className="max-h-96 overflow-auto">
            {seoList.map((seo) => (
              <button
                key={seo.id}
                onClick={() => handleSelect(seo.clientId)}
                className="w-full p-4 text-left transition-colors"
                style={selected?.clientId === seo.clientId
                  ? { background: 'var(--accent-glow)', borderLeft: '3px solid var(--accent)' }
                  : { borderLeft: '3px solid transparent' }}
              >
                <h3 className="font-semibold text-[14px]" style={{ color: 'var(--txt-primary)' }}>{seo.clientName}</h3>
                <p className="text-[12px] truncate" style={{ color: 'var(--txt-muted)' }}>{seo.siteTitle || 'No title set'}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="neu-card overflow-hidden">
              <div className="px-5 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--neu-border)' }}>
                <h2 className="font-bold text-[16px] flex items-center gap-2" style={{ color: 'var(--txt-primary)' }}>
                  <Globe className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                  SEO for: {selected.clientName}
                </h2>
                <button onClick={handleSave} disabled={saving} className="neu-btn-primary flex items-center gap-1.5 px-4 py-2 text-sm disabled:opacity-50">
                  <Save className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">{saving ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="section-label mb-2 block">Site Title</label>
                  <input type="text" value={selected.siteTitle || ''} onChange={(e) => setSelected({ ...selected, siteTitle: e.target.value })} className="neu-input" placeholder="My Business Website" />
                </div>
                <div>
                  <label className="section-label mb-2 block">Site Description</label>
                  <textarea value={selected.siteDescription || ''} onChange={(e) => setSelected({ ...selected, siteDescription: e.target.value })} rows={2} className="neu-input" placeholder="Brief description for search engines..." />
                </div>
                <div>
                  <label className="section-label mb-2 block">Keywords (comma separated)</label>
                  <input type="text" value={selected.siteKeywords || ''} onChange={(e) => setSelected({ ...selected, siteKeywords: e.target.value })} className="neu-input" placeholder="keyword1, keyword2, keyword3" />
                </div>
                <div>
                  <label className="section-label mb-2 block">Favicon URL</label>
                  <input type="text" value={selected.faviconUrl || ''} onChange={(e) => setSelected({ ...selected, faviconUrl: e.target.value })} className="neu-input" placeholder="https://.../favicon.ico" />
                </div>
                <div>
                  <label className="section-label mb-2 block">Default OG Image URL</label>
                  <input type="text" value={selected.ogImageDefault || ''} onChange={(e) => setSelected({ ...selected, ogImageDefault: e.target.value })} className="neu-input" placeholder="https://.../og-image.jpg" />
                </div>
                <div>
                  <label className="section-label mb-2 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> robots.txt
                  </label>
                  <textarea value={selected.robotsTxt || ''} onChange={(e) => setSelected({ ...selected, robotsTxt: e.target.value })} rows={4} className="neu-input font-mono text-[13px]" placeholder="User-agent: *" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={selected.sitemap?.enabled || false} onChange={(e) => setSelected({ ...selected, sitemap: { ...selected.sitemap, enabled: e.target.checked } })} className="w-4 h-4" style={{ accentColor: 'var(--accent)' }} />
                  <label className="text-[14px]" style={{ color: 'var(--txt-primary)' }}>Enable Sitemap</label>
                </div>
              </div>
            </div>
          ) : (
            <div className="neu-card p-16 text-center">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: 'var(--txt-muted)' }} />
              <p className="text-[15px]" style={{ color: 'var(--txt-muted)' }}>Select a client to edit SEO settings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
