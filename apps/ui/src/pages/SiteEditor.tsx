import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Loader2, Plus, Trash2, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { api, type SiteConfig, type Page, type Section } from '../lib/api';
import clsx from 'clsx';

// Dynamic config groups - built from actual API data
function buildConfigGroups(configs: Record<string, SiteConfig>) {
  const groups: Record<string, { label: string; keys: { key: string; label: string; type: string }[] }> = {};
  
  Object.entries(configs).forEach(([key, config]) => {
    // Determine group based on key prefix
    let groupKey = 'general';
    let groupLabel = 'General';
    
    if (key.includes('color') || key.includes('font')) {
      groupKey = 'style';
      groupLabel = 'Colors & Style';
    } else if (key.includes('meta') || key.includes('seo') || key.includes('google_analytics')) {
      groupKey = 'seo';
      groupLabel = 'SEO';
    } else if (key.includes('facebook') || key.includes('instagram') || key.includes('social') || key.includes('youtube') || key.includes('tiktok') || key.includes('whatsapp')) {
      groupKey = 'social';
      groupLabel = 'Social Media';
    } else if (key.includes('phone') || key.includes('email') || key.includes('address') || key.includes('city') || key.includes('schedule') || key.includes('maps')) {
      groupKey = 'contact';
      groupLabel = 'Contact';
    } else if (key.includes('business') || key.includes('tagline') || key.includes('description') || key.includes('logo')) {
      groupKey = 'business';
      groupLabel = 'Business Info';
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = { label: groupLabel, keys: [] };
    }
    
    // Determine field type
    let type = 'text';
    if (key.includes('color')) type = 'color';
    else if (key.includes('description') || key.includes('meta_description') || key.includes('schedule')) type = 'textarea';
    else if (key.includes('email')) type = 'email';
    
    groups[groupKey].keys.push({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type,
    });
  });
  
  return Object.values(groups);
}

type ConfigGroupType = {
  label: string;
  keys: { key: string; label: string; type: string }[];
};

function ConfigGroup({ group, config, onChange }: {
  group: ConfigGroupType;
  config: SiteConfig;
  onChange: (key: string, value: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-sm font-semibold text-white">{group.label}</span>
        {open ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
      </button>
      {open && (
        <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/[0.05]">
          {group.keys.map(({ key, label, type }) => (
            <div key={key} className={type === 'textarea' ? 'sm:col-span-2' : ''}>
              <label className="label">{label}</label>
              {type === 'textarea' ? (
                <textarea
                  className="textarea"
                  value={config[key] ?? ''}
                  onChange={(e) => onChange(key, e.target.value)}
                  rows={3}
                />
              ) : type === 'color' ? (
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config[key] ?? '#ffffff'}
                    onChange={(e) => onChange(key, e.target.value)}
                    className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config[key] ?? ''}
                    onChange={(e) => onChange(key, e.target.value)}
                    className="input flex-1"
                    placeholder="#ffffff"
                  />
                </div>
              ) : (
                <input
                  type={type}
                  className="input"
                  value={config[key] ?? ''}
                  onChange={(e) => onChange(key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SiteEditor() {
  const queryClient = useQueryClient();
  const { data: rawConfig, isLoading } = useQuery({ queryKey: ['config'], queryFn: api.config.get });
  const { data: pages } = useQuery({ queryKey: ['pages'], queryFn: api.pages.list });
  const [activePage, setActivePage] = useState<string>('');

  // Set first page as active when pages load
  useEffect(() => {
    if (pages && pages.length > 0 && !activePage) {
      setActivePage(pages[0].id);
    }
  }, [pages, activePage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Site & Pages</h1>
          <p className="text-sm text-white/40 mt-1">Edit your website content and structure</p>
        </div>
      </div>

      {/* Page Tabs - Each page is a tab */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] w-fit mb-4">
        {pages && pages.length > 0 ? (
          pages.map((page) => (
            <button
              key={page.id}
              onClick={() => setActivePage(page.id)}
              className={clsx(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize',
                activePage === page.id
                  ? 'bg-white/10 text-white shadow'
                  : 'text-white/40 hover:text-white/70',
              )}
            >
              {page.title}
            </button>
          ))
        ) : (
          <span className="px-4 py-1.5 text-white/40 text-sm">No pages found</span>
        )}
      </div>

      {/* Active Page Content */}
      <div className="space-y-4">
        {pages && pages.length > 0 && pages.map((page) => (
          <PageEditor 
            key={page.id} 
            page={page} 
            isActive={activePage === page.id}
          />
        ))}
      </div>
    </div>
  );
}

// PageEditor component - renders editable sections for a single page
function PageEditor({ page }: { page: Page }) {
  const queryClient = useQueryClient();
  
  const parseSectionsData = (): Section[] => {
    try {
      const raw = (page as any).sectionsData || page.sections;
      if (!raw) return [];
      const arr = Array.isArray(raw) ? raw : JSON.parse(raw);
      return arr.map((s: any) => ({
        ...s,
        data: s.data ?? s.content ?? {},
      }));
    } catch (e) {
      console.error('Failed to parse sectionsData:', e);
      return [];
    }
  };
  
  const [sections, setSections] = useState<Section[]>(parseSectionsData());
  const [saved, setSaved] = useState(false);

  const saveMut = useMutation({
    mutationFn: () => api.pages.update(page.slug, { sections }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  function updateSection(id: string, field: string, value: string) {
    setSections((prev) => prev.map((s) =>
      s.id === id ? { ...s, data: { ...s.data, [field]: value } } : s
    ));
  }

  function toggleSection(id: string) {
    setSections((prev) => prev.map((s) =>
      s.id === id ? { ...s, visible: !(s.visible ?? true) } : s
    ));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">{page.name}</h2>
        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saveMut.isPending ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {sections.length === 0 ? (
        <p className="text-gray-400">No sections found for this page.</p>
      ) : (
        sections.map((section) => (
          <div key={section.id} className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{section.name}</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">{section.visible !== false ? 'Visible' : 'Hidden'}</span>
                <button
                  onClick={() => toggleSection(section.id)}
                  className={`w-12 h-6 rounded-full transition-colors ${section.visible !== false ? 'bg-green-500' : 'bg-gray-600'}`}
                >
                  <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${section.visible !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
            
            <div className={`space-y-4 ${section.visible === false ? 'opacity-50' : ''}`}>
              {section.data && Object.keys(section.data).length > 0 ? (
                Object.entries(section.data).map(([field, value]) => (
                  <div key={field}>
                    <label className="block text-sm text-gray-400 mb-1">{field.replace(/_/g, ' ')}</label>
                    <input
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none"
                      value={String(value)}
                      onChange={(e) => updateSection(section.id, field, e.target.value)}
                    />
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No editable fields in this section.</p>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function PageCard({ page }: { page: Page }) {
  const queryClient = useQueryClient();
  
  // Safe parsing of sectionsData - this contains the editable content from data-cms
  const parseSectionsData = (): Section[] => {
    try {
      const raw = (page as any).sectionsData || page.sections;
      if (!raw) return [];
      const arr = Array.isArray(raw) ? raw : JSON.parse(raw);
      // Normalize: if item has "content" instead of "data", rename it
      return arr.map((s: any) => ({
        ...s,
        data: s.data ?? s.content ?? {},
      }));
    } catch (e) {
      console.error('Failed to parse sectionsData:', e);
      return [];
    }
  };
  
  const [sections, setSections] = useState<Section[]>(
    parseSectionsData().map(s => ({ ...s, data: s.data || {} }))
  );
  const [saved, setSaved] = useState(false);

  const saveMut = useMutation({
    mutationFn: () => api.pages.update(page.slug, { sections }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  function updateSection(id: string, field: string, value: string) {
    setSections((prev) => prev.map((s) =>
      s.id === id ? { ...s, data: { ...s.data, [field]: value } } : s
    ));
  }

  function toggleSection(id: string) {
    setSections((prev) => prev.map((s) =>
      s.id === id ? { ...s, visible: !(s.visible ?? true) } : s
    ));
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
        <div>
          <div className="text-sm font-semibold text-white">{page.title}</div>
          <div className="text-[11px] text-white/30">/{page.slug}</div>
        </div>
        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className={clsx('btn-secondary !py-1.5 text-xs', saved && '!text-emerald-300')}
        >
          {saved ? 'Saved!' : saveMut.isPending ? 'Saving...' : 'Save page'}
        </button>
      </div>
      <div className="p-6 space-y-4">
        {sections.length === 0 ? (
          <p className="text-sm text-white/40">No sections found for this page.</p>
        ) : sections.map((section) => (
          <div key={section.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.02]">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">{section.type}</span>
              <button onClick={() => toggleSection(section.id)} className="text-white/30 hover:text-white/60 transition-colors">
                {(section.visible ?? true) ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className={clsx('px-4 pb-4 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3', !(section.visible ?? true) && 'opacity-40')}>
              {section.data && Object.keys(section.data).length > 0 ? (
                Object.entries(section.data).map(([field, value]) => (
                  <div key={field}>
                    <label className="label">{field.replace(/_/g, ' ')}</label>
                    {String(value).length > 80 ? (
                      <textarea
                        className="textarea"
                        rows={3}
                        value={String(value)}
                        onChange={(e) => updateSection(section.id, field, e.target.value)}
                      />
                    ) : (
                      <input
                        className="input"
                        value={String(value)}
                        onChange={(e) => updateSection(section.id, field, e.target.value)}
                      />
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/40 col-span-2">
                  No editable fields detected in this section. 
                  Add data-cms attributes to HTML elements to make them editable.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
