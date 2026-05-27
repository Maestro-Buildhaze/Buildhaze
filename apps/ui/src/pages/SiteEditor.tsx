import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Loader2, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
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
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch {
    return [];
  }
}

export function SiteEditor() {
  const queryClient = useQueryClient();

  const { data: pages = [], isLoading } = useQuery<CmsPage[]>({
    queryKey: ['pages'],
    queryFn: () => api.pages.list() as any,
  });

  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [localPages, setLocalPages] = useState<CmsPage[]>([]);

  useEffect(() => {
    if (pages.length > 0) {
      const parsed = pages.map(p => ({
        ...p,
        sections: parseSections(p.sections),
      }));
      setLocalPages(JSON.parse(JSON.stringify(parsed)));
      if (activeSlug === null) setActiveSlug(parsed[0]?.slug ?? '');
    }
  }, [pages]);

  const saveMutation = useMutation({
    mutationFn: (page: CmsPage) => {
      const slug = page.slug === '' ? 'index' : page.slug;
      return (api.pages as any).updateSections(slug, page.sections);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pages'] }),
  });

  function updateField(pageSlug: string, sectionId: string, fieldId: string, value: string) {
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
    setLocalPages(prev => prev.map(p => {
      if (p.slug !== pageSlug) return p;
      return {
        ...p,
        sections: p.sections.map(s =>
          s.id === sectionId ? { ...s, visible: !s.visible } : s
        ),
      };
    }));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
      </div>
    );
  }

  if (localPages.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-white/40 text-sm">No pages found. Contact your administrator to set up your website template.</p>
      </div>
    );
  }

  const activePage = localPages.find(p => p.slug === activeSlug) ?? localPages[0];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Site & Pages</h1>
          <p className="text-sm text-white/40 mt-1">Edit your website content and structure</p>
        </div>
        <button
          onClick={() => saveMutation.mutate(activePage)}
          disabled={saveMutation.isPending}
          className="btn-primary flex items-center gap-2"
        >
          {saveMutation.isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            : <><Save className="w-4 h-4" /> Save Changes</>
          }
        </button>
      </div>

      {/* Page tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] w-fit flex-wrap">
        {localPages.map(page => (
          <button
            key={page.slug}
            onClick={() => setActiveSlug(page.slug)}
            className={clsx(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              activePage.slug === page.slug
                ? 'bg-white/10 text-white shadow'
                : 'text-white/40 hover:text-white/70'
            )}
          >
            {page.title}
          </button>
        ))}
      </div>

      {/* Sections for active page */}
      <div className="space-y-4">
        {activePage.sections.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-white/40 text-sm">No editable sections on this page.</p>
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

function SectionCard({
  section,
  onFieldChange,
  onToggleVisible,
}: {
  section: CmsSection;
  onFieldChange: (fieldId: string, value: string) => void;
  onToggleVisible: () => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05] bg-white/[0.02]">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span className="text-xs font-bold uppercase tracking-wider">{section.name}</span>
          <span className="text-xs text-white/25">({section.fields.length} fields)</span>
        </button>
        <button
          onClick={onToggleVisible}
          title={section.visible ? 'Hide section' : 'Show section'}
          className="text-white/30 hover:text-white/60 transition-colors"
        >
          {section.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>

      {open && (
        <div className={clsx(
          'p-5 grid grid-cols-1 sm:grid-cols-2 gap-4',
          !section.visible && 'opacity-40 pointer-events-none'
        )}>
          {section.fields.length === 0 ? (
            <p className="text-sm text-white/30 col-span-2">No editable fields in this section.</p>
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

function FieldEditor({ field, onChange }: { field: Field; onChange: (v: string) => void }) {
  const isFullWidth = field.type === 'textarea' || field.type === 'richtext';

  return (
    <div className={isFullWidth ? 'sm:col-span-2' : ''}>
      <label className="label">{field.label}</label>

      {field.type === 'image' ? (
        <div className="flex items-center gap-3">
          {field.value && (
            <img
              src={field.value}
              alt=""
              className="w-16 h-16 object-cover rounded-lg border border-white/10"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <input
            className="input flex-1"
            value={field.value}
            onChange={e => onChange(e.target.value)}
            placeholder="Image URL"
          />
        </div>
      ) : field.type === 'textarea' ? (
        <textarea
          className="textarea"
          rows={3}
          value={field.value}
          onChange={e => onChange(e.target.value)}
        />
      ) : (
        <input
          className="input"
          type={field.type === 'link' ? 'url' : 'text'}
          value={field.value}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
