import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save, Loader2, ChevronDown, ChevronUp, Eye, EyeOff,
  Send, CheckCircle2, Upload, X, ImageIcon, AlertTriangle,
} from 'lucide-react';
import clsx from 'clsx';
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
  visible: boolean;
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

// ── Section Card ───────────────────────────────────────────────────────────
function SectionCard({
  section, onFieldChange, onToggleVisible,
}: {
  section: CmsSection;
  onFieldChange: (fieldId: string, value: string) => void;
  onToggleVisible: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="clay-card overflow-hidden transition-all">
      <div className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: open ? '1px solid var(--border)' : 'none', background: 'var(--surface2)' }}>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          {open
            ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
            : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-3)' }} />}
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>
            {section.name}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
            {section.fields.length} field{section.fields.length !== 1 ? 's' : ''}
          </span>
        </button>
        <button
          onClick={onToggleVisible}
          title={section.visible ? 'Hide section' : 'Show section'}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: section.visible ? 'var(--green)' : 'var(--text-3)' }}
        >
          {section.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>

      {open && (
        <div className={clsx(
          'p-5 grid grid-cols-1 sm:grid-cols-2 gap-4',
          !section.visible && 'opacity-40 pointer-events-none select-none'
        )}>
          {section.fields.length === 0 ? (
            <p className="text-sm col-span-2" style={{ color: 'var(--text-3)' }}>
              No editable fields in this section.
            </p>
          ) : (
            section.fields.map(field => (
              <FieldEditor
                key={field.id}
                field={field}
                onChange={val => onFieldChange(field.id, val)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main SiteEditor ────────────────────────────────────────────────────────
export function SiteEditor() {
  const queryClient = useQueryClient();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [localPages, setLocalPages] = useState<CmsPage[]>([]);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

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

  function updateField(pageSlug: string, sectionId: string, fieldId: string, value: string) {
    setHasUnsaved(true);
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
  }

  function toggleVisible(pageSlug: string, sectionId: string) {
    setHasUnsaved(true);
    setLocalPages(prev => prev.map(p => {
      if (p.slug !== pageSlug) return p;
      return {
        ...p,
        sections: p.sections.map(s => s.id === sectionId ? { ...s, visible: !s.visible } : s),
      };
    }));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-3)' }} />
      </div>
    );
  }

  if (localPages.length === 0) {
    return (
      <div className="clay-card p-12 text-center">
        <ImageIcon className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--border-strong)' }} strokeWidth={1.25} />
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          No pages found. Contact your administrator to set up your website template.
        </p>
      </div>
    );
  }

  const activePage = localPages.find(p => p.slug === activeSlug) ?? localPages[0];
  const isBusy = saveMut.isPending || publishMut.isPending;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Site & Pages</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
            Edit your website content and structure
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Unsaved indicator */}
          {hasUnsaved && (
            <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--amber)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--amber)' }} />
              Unsaved changes
            </span>
          )}
          {savedAt && !hasUnsaved && (
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--green)' }} />
              Saved {savedAt.toLocaleTimeString()}
            </span>
          )}

          {/* Save */}
          <button
            onClick={() => saveMut.mutate(activePage)}
            disabled={isBusy || !hasUnsaved}
            className="btn-secondary !gap-1.5"
          >
            {saveMut.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : <><Save className="w-4 h-4" /> Save</>}
          </button>

          {/* Publish */}
          <button
            onClick={() => publishMut.mutate(activePage)}
            disabled={isBusy}
            className="publish-btn"
          >
            {publishMut.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</>
              : <><Send className="w-4 h-4" /> Save & Publish</>}
          </button>
        </div>
      </div>

      {/* ── Page tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl w-fit flex-wrap"
        style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
        {localPages.map(page => (
          <button
            key={page.slug}
            onClick={() => setActiveSlug(page.slug)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={activePage.slug === page.slug
              ? { background: 'var(--surface)', color: 'var(--text)', boxShadow: 'var(--shadow-sm)' }
              : { color: 'var(--text-3)' }}
          >
            {page.title}
          </button>
        ))}
      </div>

      {/* ── Sections ── */}
      <div className="space-y-3">
        {activePage.sections.length === 0 ? (
          <div className="clay-card p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>No editable sections on this page.</p>
          </div>
        ) : (
          activePage.sections.map(section => (
            <SectionCard
              key={section.id}
              section={section}
              onFieldChange={(fId, val) => updateField(activePage.slug, section.id, fId, val)}
              onToggleVisible={() => toggleVisible(activePage.slug, section.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
