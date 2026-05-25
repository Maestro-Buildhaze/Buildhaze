import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Loader2, Plus, Trash2, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { api, type SiteConfig, type Page, type Section } from '../lib/api';
import clsx from 'clsx';

const CONFIG_GROUPS = [
  {
    label: 'Business Info',
    keys: [
      { key: 'business_name', label: 'Business Name', type: 'text' },
      { key: 'tagline', label: 'Tagline / Slogan', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'logo_url', label: 'Logo URL', type: 'text' },
      { key: 'hero_image_url', label: 'Hero Image URL', type: 'text' },
    ],
  },
  {
    label: 'Contact',
    keys: [
      { key: 'phone', label: 'Phone Number', type: 'text' },
      { key: 'email', label: 'Email Address', type: 'email' },
      { key: 'address', label: 'Address', type: 'text' },
      { key: 'city', label: 'City', type: 'text' },
      { key: 'schedule', label: 'Working Hours', type: 'textarea' },
      { key: 'google_maps_url', label: 'Google Maps URL', type: 'text' },
    ],
  },
  {
    label: 'Social Media',
    keys: [
      { key: 'facebook_url', label: 'Facebook', type: 'text' },
      { key: 'instagram_url', label: 'Instagram', type: 'text' },
      { key: 'tiktok_url', label: 'TikTok', type: 'text' },
      { key: 'youtube_url', label: 'YouTube', type: 'text' },
      { key: 'whatsapp_number', label: 'WhatsApp Number', type: 'text' },
    ],
  },
  {
    label: 'SEO',
    keys: [
      { key: 'meta_title', label: 'Meta Title', type: 'text' },
      { key: 'meta_description', label: 'Meta Description', type: 'textarea' },
      { key: 'google_analytics_id', label: 'Google Analytics ID', type: 'text' },
    ],
  },
  {
    label: 'Colors & Style',
    keys: [
      { key: 'primary_color', label: 'Primary Color', type: 'color' },
      { key: 'secondary_color', label: 'Secondary Color', type: 'color' },
      { key: 'accent_color', label: 'Accent Color', type: 'color' },
      { key: 'font_family', label: 'Font Family', type: 'text' },
    ],
  },
];

function ConfigGroup({ group, config, onChange }: {
  group: typeof CONFIG_GROUPS[0];
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
  const [config, setConfig] = useState<SiteConfig>({});
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<'config' | 'pages'>('config');

  useEffect(() => {
    if (rawConfig) setConfig(rawConfig);
  }, [rawConfig]);

  const saveMut = useMutation({
    mutationFn: () => api.config.save(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  function handleChange(key: string, value: string) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

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
        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className={clsx('btn-primary', saved && '!bg-emerald-500/20 !text-emerald-300 !border-emerald-500/30')}
        >
          {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : saveMut.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] w-fit">
        {(['config', 'pages'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              tab === t
                ? 'bg-white/10 text-white shadow'
                : 'text-white/40 hover:text-white/70',
            )}
          >
            {t === 'config' ? 'Site Settings' : 'Pages & Sections'}
          </button>
        ))}
      </div>

      {tab === 'config' && (
        <div className="space-y-4">
          {CONFIG_GROUPS.map((group) => (
            <ConfigGroup key={group.label} group={group} config={config} onChange={handleChange} />
          ))}
        </div>
      )}

      {tab === 'pages' && (
        <div className="space-y-4">
          {!pages || pages.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <p className="text-sm text-white/40">No pages found. Pages are created from your template.</p>
            </div>
          ) : (
            pages.map((page) => <PageCard key={page.id} page={page} />)
          )}
        </div>
      )}
    </div>
  );
}

function PageCard({ page }: { page: Page }) {
  const queryClient = useQueryClient();
  
  // Safe parsing of sections data
  const parseSections = (): Section[] => {
    try {
      if (!page.sections) return [];
      if (Array.isArray(page.sections)) return page.sections as Section[];
      if (typeof page.sections === 'string') {
        const parsed = JSON.parse(page.sections);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch (e) {
      console.error('Failed to parse sections:', e);
      return [];
    }
  };
  
  const [sections, setSections] = useState<Section[]>(parseSections());
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
              {section.data && Object.entries(section.data).map(([field, value]) => (
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
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
