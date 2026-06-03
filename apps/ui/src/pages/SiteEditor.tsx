import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save, Loader2, Eye, EyeOff, Send, CheckCircle2, Upload, X, ImageIcon,
  AlertTriangle, Monitor, Tablet, Smartphone, ChevronRight, ChevronLeft, MousePointer2,
  Sparkles, Info, Briefcase, Phone, LayoutTemplate, Star, FileText,
  Newspaper, Zap, HelpCircle, Users, Tag, Box, Menu, Globe, RefreshCw, Layers,
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

interface CmsBlock {
  id: string;
  name: string;
  dataField?: string;
  fields: Field[];
}

interface CmsSection {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  fields: Field[];
  blocks?: CmsBlock[];
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

  // Clean up label - remove verbose prefixes
  const cleanLabel = field.label
    .replace(/^(Paragraph|H[1-6]|Image|Button|Link)\s*[-–—]\s*/i, '')
    .replace(/^Title\s*[-–—]\s*/i, '')
    .replace(/^Description\s*[-–—]\s*/i, '')
    .substring(0, 40);

  return (
    <div className={`space-y-2 ${isFullWidth ? '' : ''}`}>
      <label className="block text-[12px] font-medium" style={{ color: 'var(--text-2)' }}>
        {cleanLabel}
      </label>
      {field.type === 'image' ? (
        <ImageField value={field.value} onChange={onChange} />
      ) : field.type === 'textarea' || field.type === 'richtext' ? (
        <textarea
          className="w-full px-3 py-2.5 rounded-lg text-[13px] transition-all resize-none"
          style={{ 
            background: 'var(--surface2)', 
            border: '1px solid var(--border)',
            color: 'var(--text)',
            minHeight: '80px'
          }}
          rows={3}
          value={field.value}
          onChange={e => onChange(e.target.value)}
          placeholder={`Enter ${cleanLabel.toLowerCase()}…`}
        />
      ) : (
        <input
          className="w-full px-3 py-2.5 rounded-lg text-[13px] transition-all"
          style={{ 
            background: 'var(--surface2)', 
            border: '1px solid var(--border)',
            color: 'var(--text)'
          }}
          type={field.type === 'link' ? 'url' : 'text'}
          value={field.value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.type === 'link' ? 'https://…' : `Enter ${cleanLabel.toLowerCase()}…`}
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
  const [viewport, setViewport] = useState<'desktop' | 'laptop' | 'tablet' | 'mobile'>('laptop');
  const [iframeLoading, setIframeLoading] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [pagesOpen, setPagesOpen] = useState(false);

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
        const slug = activeSlugRef.current;
        const page = localPagesRef.current.find(p => p.slug === slug) ?? localPagesRef.current[0];
        if (page) {
          page.sections.forEach(sec => {
            sec.fields.forEach(f => {
              if (f.value) iframeRef.current?.contentWindow?.postMessage(
                { bhEditor: true, type: 'update', selector: f.selector, attribute: f.attribute, value: f.value }, '*'
              );
            });
            (sec.blocks ?? []).forEach(block => {
              block.fields.forEach(f => {
                if (f.value) iframeRef.current?.contentWindow?.postMessage(
                  { bhEditor: true, type: 'update', selector: f.selector, attribute: f.attribute, value: f.value }, '*'
                );
              });
            });
            if (!sec.visible) iframeRef.current?.contentWindow?.postMessage(
              { bhEditor: true, type: 'toggle', sectionId: sec.id, visible: false }, '*'
            );
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

  const syncMut = useMutation({
    mutationFn: () => (api.pages as any).syncFromTemplate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      setPreviewKey(k => k + 1);
      setIframeLoading(true);
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
    const pg = localPagesRef.current.find(p => p.slug === pageSlug);
    let field: Field | undefined = pg?.sections.find(s => s.id === sectionId)?.fields.find(f => f.id === fieldId);
    if (!field) {
      for (const sec of (pg?.sections ?? [])) {
        const blk = sec.blocks?.find(b => b.id === sectionId);
        if (blk) { field = blk.fields.find(f => f.id === fieldId); break; }
      }
    }

    setLocalPages(prev => prev.map(p => {
      if (p.slug !== pageSlug) return p;
      return {
        ...p,
        sections: p.sections.map(s => {
          if (s.id === sectionId) {
            return { ...s, fields: s.fields.map(f => f.id === fieldId ? { ...f, value } : f) };
          }
          if (s.blocks?.some(b => b.id === sectionId)) {
            return { ...s, blocks: s.blocks?.map(b => b.id === sectionId
              ? { ...b, fields: b.fields.map(f => f.id === fieldId ? { ...f, value } : f) }
              : b) };
          }
          return s;
        }),
      };
    }));

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
  const activeBlockParent = !activeSection ? activePage.sections.find(s => s.blocks?.some(b => b.id === activeSectionId)) ?? null : null;
  const activeBlock = activeBlockParent?.blocks?.find(b => b.id === activeSectionId) ?? null;
  const isBusy = saveMut.isPending || publishMut.isPending || syncMut.isPending;
  const previewSlug = activePage.slug === '' ? 'index' : activePage.slug;
  const previewUrl = (api.pages as any).previewUrl(previewSlug);

  // Filter out blog-post page
  const filteredPages = localPages.filter(p => p.slug !== 'blog-post');

  const viewportWidths: Record<string, string> = { desktop: '100%', laptop: '1024px', tablet: '768px', mobile: '390px' };
  const showSidebars = viewport !== 'desktop';

  return (
    <div className="flex h-full" style={{ background: 'var(--bg)' }}>

      {/* ── LEFT PANEL: sections list only ── */}
      <div className="flex flex-col flex-shrink-0 overflow-hidden transition-all duration-200"
        style={{ width: showSidebars ? (leftOpen ? 240 : 44) : 0, borderRight: '1px solid var(--border)', background: 'var(--surface)', opacity: showSidebars ? 1 : 0, pointerEvents: showSidebars ? 'auto' : 'none' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          {leftOpen && <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-4)' }}>Sections</span>}
          <button onClick={() => setLeftOpen(v => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-md ml-auto flex-shrink-0 hover:bg-surface2"
            style={{ color: 'var(--text-3)' }}>
            {leftOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Sections */}
        {leftOpen && <div className="px-3 pt-3 pb-4 flex-1 overflow-y-auto">
          {activePage.sections.length === 0 ? (
            <p className="text-[11px] px-1" style={{ color: 'var(--text-4)' }}>No sections on this page.</p>
          ) : activePage.sections.map(sec => {
            const Icon = SECTION_ICONS[sec.type] ?? Box;
            const isActive = sec.id === activeSectionId || sec.blocks?.some(b => b.id === activeSectionId);
            return (
              <React.Fragment key={sec.id}>
                <button onClick={() => selectSection(sec.id)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all mb-0.5 flex items-center gap-2"
                  style={isActive && !activeBlock
                    ? { background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)' }
                    : { color: sec.visible !== false ? 'var(--text-2)' : 'var(--text-4)', border: '1px solid transparent' }}>
                  <Icon className="w-3 h-3 flex-shrink-0" strokeWidth={1.75} />
                  <span className="flex-1 truncate font-medium">{sec.name}</span>
                  {sec.visible === false && <EyeOff className="w-2.5 h-2.5 opacity-50" />}
                  {isActive && !sec.blocks?.length && <ChevronRight className="w-2.5 h-2.5" />}
                </button>
                {sec.blocks && sec.blocks.length > 0 && isActive && (
                  <div className="ml-3 mt-1 mb-2 space-y-1 border-l-2 border-border pl-3">
                    {sec.blocks.map(block => {
                      const isBlockActive = block.id === activeSectionId;
                      return (
                        <button key={block.id} onClick={e => { e.stopPropagation(); selectSection(block.id); }}
                          className="w-full text-left px-3 py-2 rounded-lg text-[12px] transition-all flex items-center gap-2 hover:bg-surface2"
                          style={isBlockActive
                            ? { background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)' }
                            : { color: 'var(--text-3)', border: '1px solid transparent' }}>
                          <Layers className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="flex-1 truncate">{block.name}</span>
                          {isBlockActive && <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>}
      </div>

      {/* ── CENTER: toolbar + iframe preview ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 h-11 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>

          {/* Viewport switcher - Laptop default */}
          <div className="flex items-center gap-0.5 rounded-lg p-0.5"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            {(['desktop', 'laptop', 'tablet', 'mobile'] as const).map(v => {
              const Icon = v === 'desktop' ? Monitor : v === 'laptop' ? Briefcase : v === 'tablet' ? Tablet : Smartphone;
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

          {/* Pages Dropdown - Shopify Style */}
          <div className="relative">
            <button onClick={() => setPagesOpen(!pagesOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              <Globe className="w-4 h-4" />
              <span>{activePage.slug === '' || activePage.slug === 'index' ? 'Homepage' : activePage.title}</span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${pagesOpen ? 'rotate-90' : ''}`} />
            </button>
            
            {pagesOpen && (
              <div className="absolute top-full right-0 mt-1 w-56 rounded-xl overflow-hidden z-50 shadow-lg"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: 'var(--text-4)', borderBottom: '1px solid var(--border)' }}>Pages</div>
                {filteredPages.map(pg => (
                  <button key={pg.slug} onClick={() => { switchPage(pg.slug); setPagesOpen(false); }}
                    className="w-full text-left px-3 py-2.5 text-sm transition-all flex items-center gap-2.5 hover:bg-surface2"
                    style={activePage.slug === pg.slug
                      ? { background: 'var(--green-bg)', color: 'var(--green)' }
                      : { color: 'var(--text-2)' }}>
                    <Globe className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{pg.slug === '' || pg.slug === 'index' ? 'Homepage' : pg.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-6 mx-1" style={{ background: 'var(--border)' }} />

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

          {/* Sync from template */}
          <button onClick={() => syncMut.mutate()} disabled={syncMut.isPending}
            title="Re-sync field structure from template (preserves your saved values)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{ background: 'var(--surface2)', color: 'var(--text-3)', border: '1px solid var(--border)', opacity: syncMut.isPending ? 0.6 : 1 }}>
            {syncMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Sync
          </button>

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
      <div className="flex-shrink-0 flex flex-col overflow-hidden transition-all duration-200"
        style={{ width: showSidebars ? (rightOpen ? 320 : 44) : 0, borderLeft: '1px solid var(--border)', background: 'var(--surface)', opacity: showSidebars ? 1 : 0, pointerEvents: showSidebars ? 'auto' : 'none' }}>

        {/* Right panel toggle */}
        <div className="flex items-center px-3 pt-3 pb-2 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setRightOpen(v => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-md flex-shrink-0 hover:bg-surface2"
            style={{ color: 'var(--text-3)' }}>
            {rightOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          {rightOpen && (activeSection || activeBlock) && (
            <span className="ml-2 text-[11px] font-bold uppercase tracking-widest truncate" style={{ color: 'var(--text-4)' }}>Fields</span>
          )}
        </div>

        {rightOpen && (activeSection || activeBlock) ? (
          <>
            {/* Header */}
            <div className="px-3 py-2.5 flex items-center gap-2 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
              {activeBlock ? (
                <>
                  <Layers className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} style={{ color: 'var(--green)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-4)' }}>{activeBlockParent?.name}</div>
                    <div className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{activeBlock.name}</div>
                  </div>
                </>
              ) : (
                <>
                  {(() => {
                    const Icon = SECTION_ICONS[activeSection!.type] ?? Box;
                    return <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} style={{ color: 'var(--green)' }} />;
                  })()}
                  <span className="font-semibold text-sm flex-1 truncate" style={{ color: 'var(--text)' }}>
                    {activeSection!.name}
                  </span>
                  <button
                    onClick={() => handleToggleVisible(activePage.slug, activeSection!.id)}
                    title={activeSection!.visible !== false ? 'Hide section' : 'Show section'}
                    className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                    style={{ color: activeSection!.visible !== false ? 'var(--green)' : 'var(--text-3)' }}>
                    {activeSection!.visible !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </>
              )}
            </div>

            {/* Fields */}
            {(() => {
              const activeId = activeBlock ? activeBlock.id : activeSection!.id;
              const fields = activeBlock ? activeBlock.fields : activeSection!.fields;
              const visible = activeBlock ? (activeBlockParent?.visible ?? true) : (activeSection!.visible ?? true);
              
              // Group fields by type for better organization
              const textFields = fields.filter(f => f.type === 'text' || f.type === 'textarea');
              const linkFields = fields.filter(f => f.type === 'link');
              const imageFields = fields.filter(f => f.type === 'image');
              
              return (
                <div className="flex-1 overflow-y-auto p-4 space-y-4"
                  style={{ opacity: visible !== false ? 1 : 0.45, pointerEvents: visible !== false ? 'auto' : 'none' }}>
                  {fields.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                        style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                        <MousePointer2 className="w-5 h-5" style={{ color: 'var(--text-3)' }} strokeWidth={1.5} />
                      </div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>No editable fields</p>
                      <p className="text-[11px] mt-1" style={{ color: 'var(--text-4)' }}>
                        This section has no editable content.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Content Fields */}
                      {textFields.length > 0 && (
                        <div className="space-y-3">
                          {textFields.map(field => (
                            <FieldEditor
                              key={field.id}
                              field={field}
                              onChange={val => handleFieldChange(activePage.slug, activeId, field.id, val)}
                            />
                          ))}
                        </div>
                      )}
                      
                      {/* Image Fields */}
                      {imageFields.length > 0 && (
                        <div className="space-y-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                          <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-4)' }}>Images</div>
                          {imageFields.map(field => (
                            <FieldEditor
                              key={field.id}
                              field={field}
                              onChange={val => handleFieldChange(activePage.slug, activeId, field.id, val)}
                            />
                          ))}
                        </div>
                      )}
                      
                      {/* Link Fields */}
                      {linkFields.length > 0 && (
                        <div className="space-y-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                          <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-4)' }}>Links</div>
                          {linkFields.map(field => (
                            <FieldEditor
                              key={field.id}
                              field={field}
                              onChange={val => handleFieldChange(activePage.slug, activeId, field.id, val)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        ) : rightOpen ? (
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
        ) : null}
      </div>
    </div>
  );
}
