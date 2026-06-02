import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save, Loader2, Eye, EyeOff, Send, CheckCircle2, Upload, X, ImageIcon,
  AlertTriangle, Monitor, Tablet, Smartphone, ChevronRight, MousePointer2,
  Sparkles, Info, Briefcase, Phone, LayoutTemplate, Star, FileText,
  Newspaper, Zap, HelpCircle, Users, Tag, Box, Menu, Globe,
} from 'lucide-react';
import { api } from '../lib/api';

interface Field {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'image' | 'link' | 'richtext';
  selector: string;
  attribute: string;
  value: string;
}

interface CmsSection {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  fields: Field[];
}

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
  isActive: boolean;
  sections: CmsSection[];
}

function parseSections(raw: any): CmsSection[] {
  try {
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

// ── Image Upload Field ─────────────────────────────────────────────────────
function ImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { setUploadError('Please select an image file'); return; }
    setUploading(true); setUploadError('');
    try {
      const result = await api.media.upload(file);
      onChange(result.url);
    } catch (e: any) {
      setUploadError(e.message ?? 'Upload failed');
    } finally { setUploading(false); }
  }, [onChange]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  return (
    <div className="space-y-2">
      {/* Preview */}
      {value && (
        <div className="relative w-full h-40 rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}>
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-1.5 rounded-lg"
            style={{ background: 'rgba(0,0,0,0.60)', color: '#fff' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl flex flex-col items-center justify-center gap-2 py-6 cursor-pointer transition-all"
        style={{
          border: `2px dashed ${dragging ? 'var(--green)' : 'var(--border)'}`,
          background: dragging ? 'var(--green-bg)' : 'var(--surface2)',
        }}
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--green)' }} />
        ) : (
          <Upload className="w-5 h-5" style={{ color: 'var(--text-3)' }} strokeWidth={1.5} />
        )}
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>
          {uploading ? 'Uploading…' : 'Drag & drop or click to upload'}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
        />
      </div>

      {uploadError && (
        <p className="text-xs flex items-center gap-1" style={{ color: 'var(--red)' }}>
          <AlertTriangle className="w-3 h-3" /> {uploadError}
        </p>
      )}
    </div>
  );
}

// ── Field Editor ───────────────────────────────────────────────────────────
function FieldEditor({ field, onChange }: { field: Field; onChange: (v: string) => void }) {
  const isFullWidth = field.type === 'textarea' || field.type === 'richtext' || field.type === 'image';

  return (
    <div className={isFullWidth ? 'sm:col-span-2' : ''}>
      <label className="label">{field.label}</label>
      {field.type === 'image' ? (
        <ImageField value={field.value} onChange={onChange} />
      ) : field.type === 'textarea' || field.type === 'richtext' ? (
        <textarea
          className="textarea"
          rows={4}
          value={field.value}
          onChange={e => onChange(e.target.value)}
          placeholder={`Enter ${field.label.toLowerCase()}…`}
        />
      ) : (
        <input
          className="input"
          type={field.type === 'link' ? 'url' : 'text'}
          value={field.value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.type === 'link' ? 'https://…' : `Enter ${field.label.toLowerCase()}…`}
        />
      )}
    </div>
  );
}

// ── Section type → icon map ─────────────────────────────────────────────────
const SECTION_ICONS: Record<string, React.ElementType> = {
  hero: Sparkles, about: Info, services: Briefcase, contact: Phone,
  header: LayoutTemplate, footer: LayoutTemplate, navigation: Menu,
  gallery: ImageIcon, testimonials: Star, blog: FileText, news: Newspaper,
  cta: Zap, features: CheckCircle2, faq: HelpCircle, team: Users, pricing: Tag,
};

// ── Main SiteEditor ────────────────────────────────────────────────────────
export function SiteEditor() {
  const queryClient = useQueryClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [localPages, setLocalPages] = useState<CmsPage[]>([]);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [iframeLoading, setIframeLoading] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);

  // Refs for stable message handler
  const localPagesRef = useRef(localPages);
  const activeSlugRef = useRef(activeSlug);
  const activeSectionIdRef = useRef(activeSectionId);
  useEffect(() => { localPagesRef.current = localPages; }, [localPages]);
  useEffect(() => { activeSlugRef.current = activeSlug; }, [activeSlug]);
  useEffect(() => { activeSectionIdRef.current = activeSectionId; }, [activeSectionId]);

  const { data: pages = [], isLoading } = useQuery<CmsPage[]>({
    queryKey: ['pages'],
    queryFn: () => api.pages.list() as any,
  });

  useEffect(() => {
    if (pages.length > 0) {
      const parsed = pages.map(p => ({ ...p, sections: parseSections(p.sections) }));
      setLocalPages(JSON.parse(JSON.stringify(parsed)));
      if (activeSlug === null) setActiveSlug(parsed[0]?.slug ?? '');
      setHasUnsaved(false);
    }
  }, [pages]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsaved) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsaved]);

  // Listen for postMessages from iframe
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (!e.data?.bhEditor) return;
      if (e.data.type === 'ready') {
        setIframeLoading(false);
        // Replay all current field values so unsaved edits appear in preview
        const slug = activeSlugRef.current;
        const page = localPagesRef.current.find(p => p.slug === slug) ?? localPagesRef.current[0];
        if (page) {
          page.sections.forEach(sec => {
            sec.fields.forEach(f => {
              if (f.value) {
                iframeRef.current?.contentWindow?.postMessage(
                  { bhEditor: true, type: 'update', selector: f.selector, attribute: f.attribute, value: f.value }, '*'
                );
              }
            });
          });
        }
        // Re-apply visibility
        if (page) {
          page.sections.forEach(sec => {
            if (!sec.visible) {
              iframeRef.current?.contentWindow?.postMessage(
                { bhEditor: true, type: 'toggle', sectionId: sec.id, visible: false }, '*'
              );
            }
          });
        }
        // Re-highlight active section
        if (activeSectionIdRef.current) {
          iframeRef.current?.contentWindow?.postMessage(
            { bhEditor: true, type: 'highlight', sectionId: activeSectionIdRef.current }, '*'
          );
        }
      }
      if (e.data.type === 'section-click') {
        const id = e.data.sectionId as string;
        setActiveSectionId(id);
        iframeRef.current?.contentWindow?.postMessage(
          { bhEditor: true, type: 'highlight', sectionId: id }, '*'
        );
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const saveMut = useMutation({
    mutationFn: (page: CmsPage) => {
      const slug = page.slug === '' ? 'index' : page.slug;
      return (api.pages as any).updateSections(slug, page.sections);
    },
    onSuccess: () => {
      setHasUnsaved(false);
      setSavedAt(new Date());
      queryClient.invalidateQueries({ queryKey: ['pages'] });
    },
  });

  const publishMut = useMutation({
    mutationFn: async (page: CmsPage) => {
      const slug = page.slug === '' ? 'index' : page.slug;
      await (api.pages as any).updateSections(slug, page.sections);
      return api.publish.deploy();
    },
    onSuccess: () => {
      setHasUnsaved(false);
      setSavedAt(new Date());
      queryClient.invalidateQueries({ queryKey: ['pages', 'me'] });
    },
  });

  function switchPage(slug: string) {
    setActiveSlug(slug);
    setActiveSectionId(null);
    setIframeLoading(true);
    setPreviewKey(k => k + 1);
  }

  function selectSection(sectionId: string) {
    setActiveSectionId(sectionId);
    iframeRef.current?.contentWindow?.postMessage(
      { bhEditor: true, type: 'highlight', sectionId }, '*'
    );
  }

  function handleFieldChange(pageSlug: string, sectionId: string, fieldId: string, value: string) {
    setHasUnsaved(true);
    // Grab selector/attribute before state update (they never change)
    const field = localPagesRef.current
      .find(p => p.slug === pageSlug)?.sections
      .find(s => s.id === sectionId)?.fields
      .find(f => f.id === fieldId);

    setLocalPages(prev => prev.map(p => {
      if (p.slug !== pageSlug) return p;
      return {
        ...p,
        sections: p.sections.map(s => {
          if (s.id !== sectionId) return s;
          return { ...s, fields: s.fields.map(f => f.id === fieldId ? { ...f, value } : f) };
        }),
      };
    }));

    // Live-update iframe DOM
    if (field) {
      iframeRef.current?.contentWindow?.postMessage(
        { bhEditor: true, type: 'update', selector: field.selector, attribute: field.attribute, value }, '*'
      );
    }
  }

  function handleToggleVisible(pageSlug: string, sectionId: string) {
    setHasUnsaved(true);
    const sec = localPagesRef.current.find(p => p.slug === pageSlug)?.sections.find(s => s.id === sectionId);
    const newVisible = !(sec?.visible ?? true);
    setLocalPages(prev => prev.map(p => {
      if (p.slug !== pageSlug) return p;
      return { ...p, sections: p.sections.map(s => s.id === sectionId ? { ...s, visible: newVisible } : s) };
    }));
    iframeRef.current?.contentWindow?.postMessage(
      { bhEditor: true, type: 'toggle', sectionId, visible: newVisible }, '*'
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-3)' }} />
      </div>
    );
  }

  if (localPages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="clay-card p-12 text-center max-w-sm w-full">
          <ImageIcon className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--border-strong)' }} strokeWidth={1.25} />
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            No pages found. Contact your administrator to set up your website template.
          </p>
        </div>
      </div>
    );
  }

  const activePage = localPages.find(p => p.slug === activeSlug) ?? localPages[0];
  const activeSection = activePage.sections.find(s => s.id === activeSectionId) ?? null;
  const isBusy = saveMut.isPending || publishMut.isPending;
  const previewSlug = activePage.slug === '' ? 'index' : activePage.slug;
  const previewUrl = (api.pages as any).previewUrl(previewSlug);

  const viewportWidths: Record<string, string> = { desktop: '100%', tablet: '768px', mobile: '390px' };

  return (
    <div className="flex h-full" style={{ background: 'var(--bg)' }}>

      {/* ── LEFT PANEL: pages + sections list ── */}
      <div className="flex flex-col w-48 flex-shrink-0 overflow-hidden"
        style={{ borderRight: '1px solid var(--border)', background: 'var(--surface)' }}>

        {/* Pages */}
        <div className="px-2.5 pt-3 pb-2">
          <div className="text-[9px] font-bold uppercase tracking-widest px-1 mb-1.5"
            style={{ color: 'var(--text-4)' }}>Pages</div>
          {localPages.map(pg => (
            <button key={pg.slug} onClick={() => switchPage(pg.slug)}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all mb-0.5 flex items-center gap-2"
              style={activePage.slug === pg.slug
                ? { background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)' }
                : { color: 'var(--text-2)', border: '1px solid transparent' }}>
              <Globe className="w-3 h-3 flex-shrink-0" strokeWidth={1.75} />
              <span className="truncate">{pg.title}</span>
            </button>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--border)' }} />

        {/* Sections */}
        <div className="px-2.5 pt-2 pb-3 flex-1 overflow-y-auto">
          <div className="text-[9px] font-bold uppercase tracking-widest px-1 mb-1.5"
            style={{ color: 'var(--text-4)' }}>Sections</div>
          {activePage.sections.length === 0 ? (
            <p className="text-[11px] px-1" style={{ color: 'var(--text-4)' }}>No sections on this page.</p>
          ) : activePage.sections.map(sec => {
            const Icon = SECTION_ICONS[sec.type] ?? Box;
            const isActive = sec.id === activeSectionId;
            return (
              <button key={sec.id} onClick={() => selectSection(sec.id)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all mb-0.5 flex items-center gap-2"
                style={isActive
                  ? { background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)' }
                  : { color: sec.visible !== false ? 'var(--text-2)' : 'var(--text-4)', border: '1px solid transparent' }}>
                <Icon className="w-3 h-3 flex-shrink-0" strokeWidth={1.75} />
                <span className="flex-1 truncate font-medium">{sec.name}</span>
                {sec.visible === false && <EyeOff className="w-2.5 h-2.5 opacity-50" />}
                {isActive && <ChevronRight className="w-2.5 h-2.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CENTER: toolbar + iframe preview ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 h-11 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>

          {/* Viewport switcher */}
          <div className="flex items-center gap-0.5 rounded-lg p-0.5"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            {(['desktop', 'tablet', 'mobile'] as const).map(v => {
              const Icon = v === 'desktop' ? Monitor : v === 'tablet' ? Tablet : Smartphone;
              return (
                <button key={v} onClick={() => setViewport(v)} title={v.charAt(0).toUpperCase() + v.slice(1)}
                  className="w-7 h-7 flex items-center justify-center rounded-md transition-all"
                  style={viewport === v
                    ? { background: 'var(--surface)', color: 'var(--text)', boxShadow: 'var(--shadow-sm)' }
                    : { color: 'var(--text-3)' }}>
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
              );
            })}
          </div>

          <div className="flex-1" />

          {/* Status */}
          {hasUnsaved && (
            <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: 'var(--amber)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--amber)' }} />
              Unsaved
            </span>
          )}
          {savedAt && !hasUnsaved && (
            <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
              <CheckCircle2 className="w-3 h-3" style={{ color: 'var(--green)' }} /> Saved
            </span>
          )}

          {/* Save */}
          <button onClick={() => saveMut.mutate(activePage)} disabled={isBusy || !hasUnsaved}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={!hasUnsaved || isBusy
              ? { background: 'var(--surface2)', color: 'var(--text-4)', border: '1px solid var(--border)', cursor: 'not-allowed', opacity: 0.6 }
              : { background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            {saveMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>

          {/* Publish */}
          <button onClick={() => publishMut.mutate(activePage)} disabled={isBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all"
            style={{
              background: isBusy ? 'var(--green)' : 'linear-gradient(180deg,#10b981 0%,#059669 100%)',
              boxShadow: '0 1px 0 0 rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.15)',
              opacity: isBusy ? 0.7 : 1,
            }}>
            {publishMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {publishMut.isPending ? 'Publishing…' : 'Publish'}
          </button>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-hidden flex items-start justify-center"
          style={{ background: 'var(--surface2)', padding: viewport === 'desktop' ? 0 : '16px 0 0' }}>
          <div className="relative h-full transition-all duration-300 ease-out shadow-xl"
            style={{ width: viewportWidths[viewport], maxWidth: '100%', minHeight: 0 }}>

            {/* Loading overlay */}
            {iframeLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center"
                style={{ background: 'var(--surface)', borderRadius: viewport !== 'desktop' ? '12px 12px 0 0' : 0 }}>
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--green)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>Loading preview…</span>
                </div>
              </div>
            )}

            <iframe
              key={`${previewSlug}-${previewKey}`}
              ref={iframeRef}
              src={previewUrl}
              className="w-full h-full border-0"
              style={{ borderRadius: viewport !== 'desktop' ? '12px 12px 0 0' : 0 }}
              title="Site Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: field editor ── */}
      <div className="w-72 flex-shrink-0 flex flex-col overflow-hidden"
        style={{ borderLeft: '1px solid var(--border)', background: 'var(--surface)' }}>

        {activeSection ? (
          <>
            {/* Section header */}
            <div className="px-4 py-3 flex items-center gap-2 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
              {(() => {
                const Icon = SECTION_ICONS[activeSection.type] ?? Box;
                return <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75}
                  style={{ color: 'var(--green)' }} />;
              })()}
              <span className="font-semibold text-sm flex-1 truncate" style={{ color: 'var(--text)' }}>
                {activeSection.name}
              </span>
              <button
                onClick={() => handleToggleVisible(activePage.slug, activeSection.id)}
                title={activeSection.visible !== false ? 'Hide section' : 'Show section'}
                className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                style={{ color: activeSection.visible !== false ? 'var(--green)' : 'var(--text-3)' }}>
                {activeSection.visible !== false
                  ? <Eye className="w-4 h-4" />
                  : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Fields */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4"
              style={{ opacity: activeSection.visible !== false ? 1 : 0.45, pointerEvents: activeSection.visible !== false ? 'auto' : 'none' }}>
              {activeSection.fields.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>
                  No editable fields in this section.
                </p>
              ) : activeSection.fields.map(field => (
                <div key={field.id}>
                  <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wider"
                    style={{ color: 'var(--text-3)' }}>
                    {field.label}
                  </label>
                  <FieldEditor
                    field={field}
                    onChange={val => handleFieldChange(activePage.slug, activeSection.id, field.id, val)}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <MousePointer2 className="w-5 h-5" style={{ color: 'var(--text-3)' }} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Click to edit</p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-4)' }}>
                Click any section in the preview, or select one from the left panel.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
