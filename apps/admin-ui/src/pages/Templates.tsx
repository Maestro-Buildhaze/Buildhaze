import React, { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { Upload, Folder, File, Trash2, Loader2, X, Grid, List, Search, RefreshCw, Eye, ChevronDown, ChevronRight, FileText, Image, Link, Type } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../lib/api';

interface FileWithPath {
  file: File;
  path: string;
}

// ── Client-side HTML parser (no server needed) ──────────────────────────────
function parseHtmlInBrowser(filename: string, html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const sections: any[] = [];

  // Try data-section / data-cms-section attributes first
  const sectionEls = doc.querySelectorAll('[data-section],[data-cms-section],[data-block],[section],[.section]');
  const processedSections = new Set<Element>();

  sectionEls.forEach((el, idx) => {
    processedSections.add(el);
    const secId = el.getAttribute('data-section') || el.getAttribute('data-cms-section') || el.getAttribute('id') || el.getAttribute('data-block') || `section-${idx}`;
    const secName = el.getAttribute('data-name') || el.getAttribute('aria-label') || secId.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
    const fields = extractFieldsFromEl(el, secId);
    if (fields.length > 0) {
      sections.push({ id: secId, name: secName, type: el.tagName.toLowerCase(), visible: true, fields });
    }
  });

  // Fallback: group by semantic tags if no data-section found
  if (sections.length === 0) {
    const semanticTags = doc.querySelectorAll('header,nav,section,main,footer,article,aside,.hero,.about,.contact,.services,.gallery,.menu,.team');
    semanticTags.forEach((el, idx) => {
      if ([...processedSections].some(p => p.contains(el) || el.contains(p))) return;
      const tag = el.tagName.toLowerCase();
      const cls = el.className?.toString().split(' ').find((c: string) => c.length > 0 && c.length < 20) || '';
      const secId = el.getAttribute('id') || cls || `${tag}-${idx}`;
      const secName = secId.replace(/-/g,' ').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
      const fields = extractFieldsFromEl(el, secId);
      if (fields.length > 0) {
        sections.push({ id: secId, name: secName, type: tag, visible: true, fields });
      }
    });
  }

  // Last fallback: whole body
  if (sections.length === 0) {
    const fields = extractFieldsFromEl(doc.body, 'body');
    if (fields.length > 0) sections.push({ id: 'body', name: 'Content', type: 'body', visible: true, fields });
  }

  const slug = filename.replace(/\.html$/, '').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const name = slug === 'index' ? 'Home' : slug.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  return { id: slug, name, slug, file: filename, sections };
}

function extractFieldsFromEl(el: Element, sectionId: string): any[] {
  const fields: any[] = [];
  const seen = new Set<string>();
  let fieldIdx = 0;

  const addField = (type: string, label: string, value: string, selector: string, attr: string) => {
    const key = `${type}:${value.slice(0,40)}`;
    if (seen.has(key) || !value.trim()) return;
    seen.add(key);
    fields.push({ id: `${sectionId}-f${fieldIdx++}`, type, label, value: value.trim(), selector, attribute: attr });
  };

  // Images
  el.querySelectorAll('img').forEach((img, i) => {
    const src = img.getAttribute('src') || '';
    const alt = img.getAttribute('alt') || '';
    if (src && !src.startsWith('data:')) addField('image', alt || `Image ${i+1}`, src, 'img', 'src');
  });

  // Headings
  el.querySelectorAll('h1,h2,h3,h4').forEach((h, i) => {
    const text = h.textContent?.trim() || '';
    if (text.length > 1 && text.length < 200) addField('text', `${h.tagName} ${i+1}`, text, h.tagName.toLowerCase(), 'textContent');
  });

  // Paragraphs / long text
  el.querySelectorAll('p').forEach((p, i) => {
    const text = p.textContent?.trim() || '';
    if (text.length > 5 && text.length < 1000) addField('textarea', `Paragraph ${i+1}`, text, 'p', 'textContent');
  });

  // Links
  el.querySelectorAll('a[href]').forEach((a, i) => {
    const href = a.getAttribute('href') || '';
    const text = a.textContent?.trim() || href;
    if (href && href !== '#' && !href.startsWith('javascript') && text.length < 100)
      addField('link', `Link ${i+1}: ${text.slice(0,30)}`, href, 'a', 'href');
  });

  // Buttons
  el.querySelectorAll('button,[class*=btn],[class*=button]').forEach((b, i) => {
    const text = b.textContent?.trim() || '';
    if (text.length > 0 && text.length < 80) addField('text', `Button ${i+1}`, text, '[class*=btn]', 'textContent');
  });

  return fields.slice(0, 30); // max 30 fields per section
}


const NICHES = [
  { value: 'lawyer', label: 'Avocatură', icon: '⚖️' },
  { value: 'medical', label: 'Medical', icon: '🏥' },
  { value: 'real-estate', label: 'Imobiliare', icon: '🏢' },
  { value: 'restaurant', label: 'Restaurante', icon: '🍽️' },
  { value: 'ecommerce', label: 'E-commerce', icon: '🛒' },
  { value: 'portfolio', label: 'Portofoliu', icon: '✨' },
  { value: 'fitness', label: 'Fitness', icon: '💪' },
  { value: 'beauty', label: 'Beauty & SPA', icon: '💅' },
];

// Helper to read all files recursively from a directory entry
async function readEntryContent(entry: any, path = ''): Promise<{ file: File; path: string }[]> {
  const results: { file: File; path: string }[] = [];
  
  if (entry.isFile) {
    const file = await new Promise<File>((resolve) => entry.file(resolve));
    results.push({ file, path: path + file.name });
  } else if (entry.isDirectory) {
    const dirReader = entry.createReader();
    const entries = await new Promise<any[]>((resolve) => dirReader.readEntries(resolve));
    for (const subEntry of entries) {
      results.push(...await readEntryContent(subEntry, path + entry.name + '/'));
    }
  }
  
  return results;
}

// Custom getFilesFromEvent to handle recursive directory traversal
async function getFilesFromEvent(event: any): Promise<File[]> {
  const items = event.dataTransfer?.items;
  
  if (!items || items.length === 0) {
    // Fallback: return files with webkitRelativePath
    const files: File[] = [];
    if (event.dataTransfer?.files) {
      for (const file of event.dataTransfer.files) {
        const path = (file as any).webkitRelativePath || file.name;
        (file as any).path = path;
        files.push(file);
      }
    }
    return files;
  }
  
  // Process entries recursively
  const allFiles: File[] = [];
  for (const item of items) {
    const entry = item.webkitGetAsEntry?.() || item.getAsEntry?.();
    if (entry) {
      const entryFiles = await readEntryContent(entry);
      entryFiles.forEach(({ file, path }) => {
        (file as any).path = path;
        allFiles.push(file);
      });
    }
  }
  
  return allFiles;
}

function FieldTypeIcon({ type }: { type: string }) {
  if (type === 'image') return <Image className="w-3.5 h-3.5 text-purple-500" />;
  if (type === 'link') return <Link className="w-3.5 h-3.5 text-blue-500" />;
  if (type === 'textarea' || type === 'richtext') return <FileText className="w-3.5 h-3.5 text-green-500" />;
  return <Type className="w-3.5 h-3.5 text-amber-500" />;
}

function SchemaModal({ template, onClose }: { template: any; onClose: () => void }) {
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [regenerating, setRegenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: schemaData, isLoading, refetch } = useQuery({
    queryKey: ['template-schema', template.id],
    queryFn: () => api.admin.getTemplateSchema(template.id),
  });

  const schema = schemaData?.schema; // TemplateSchema DB record
  // schema.schema is the JSONB column = { pages: [...] }
  // schema.pages is the summary JSONB column = [{ id, name, slug, file }] (no fields)
  const pages: any[] = schema?.schema?.pages || [];

  const togglePage = (pageId: string) => {
    setExpandedPages(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId); else next.add(pageId);
      return next;
    });
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId); else next.add(sectionId);
      return next;
    });
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await api.admin.regenerateTemplateSchema(template.id);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] });
    } finally {
      setRegenerating(false);
    }
  };

  const totalFields = pages.reduce((sum: number, p: any) =>
    sum + p.sections.reduce((s: number, sec: any) => s + sec.fields.length, 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }} onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden" style={{
        background: 'var(--neu-surface)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.07)',
      }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: 'var(--txt-primary)' }}>{template.name}</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--txt-muted)' }}>
              {isLoading ? 'Se încarcă schema...' : pages.length > 0
                ? `${pages.length} pagini · ${pages.reduce((s: number, p: any) => s + p.sections.length, 0)} secțiuni · ${totalFields} câmpuri`
                : 'Schema nu a fost detectată încă'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="neu-btn-primary flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-50"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5 relative z-10', regenerating && 'animate-spin')} />
              <span className="relative z-10">{regenerating ? 'Detectare...' : 'Re-detectează'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--txt-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--gold)' }} />
            </div>
          ) : pages.length === 0 ? (
            <div className="text-center py-16">
              <Folder className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--txt-muted)' }} />
              <p className="font-semibold" style={{ color: 'var(--txt-secondary)' }}>Schema nu a fost generată</p>
              <p className="text-sm mt-1" style={{ color: 'var(--txt-muted)' }}>Apasă "Re-detectează" pentru a extrage paginile și câmpurile din HTML.</p>
            </div>
          ) : (
            pages.map((page: any) => (
              <div key={page.id} className="overflow-hidden rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                <button
                  onClick={() => togglePage(page.id)}
                  className="w-full flex items-center justify-between p-4 text-left transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(240,180,41,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                >
                  <div className="flex items-center gap-3">
                    {expandedPages.has(page.id)
                      ? <ChevronDown className="w-4 h-4" style={{ color: 'var(--gold)' }} />
                      : <ChevronRight className="w-4 h-4" style={{ color: 'var(--txt-muted)' }} />}
                    <FileText className="w-4 h-4" style={{ color: 'var(--gold)' }} />
                    <span className="font-bold text-sm" style={{ color: 'var(--txt-primary)' }}>{page.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--txt-muted)', border: '1px solid rgba(255,255,255,0.07)' }}>{page.file}</span>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--txt-muted)' }}>{page.sections.length} secțiuni</span>
                </button>

                {expandedPages.has(page.id) && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {page.sections.map((section: any) => (
                      <div key={section.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="w-full flex items-center justify-between px-6 py-3 text-left transition-colors"
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div className="flex items-center gap-2">
                            {expandedSections.has(section.id)
                              ? <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--txt-muted)' }} />
                              : <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--txt-muted)' }} />}
                            <span className="text-sm font-medium" style={{ color: 'var(--txt-secondary)' }}>{section.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--txt-muted)' }}>{section.type}</span>
                          </div>
                          <span className="text-xs" style={{ color: 'var(--txt-muted)' }}>{section.fields.length} câmpuri</span>
                        </button>

                        {expandedSections.has(section.id) && (
                          <div className="px-6 pb-3 space-y-2">
                            {section.fields.map((field: any) => (
                              <div key={field.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <FieldTypeIcon type={field.type} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold" style={{ color: 'var(--txt-secondary)' }}>{field.label}</p>
                                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--txt-muted)' }}>{field.value || '(gol)'}</p>
                                </div>
                                <span className="text-xs px-2 py-0.5 rounded-lg shrink-0" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--txt-muted)', border: '1px solid rgba(255,255,255,0.07)' }}>{field.type}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function Templates() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileWithPath[]>([]);
  const [templateData, setTemplateData] = useState({
    name: '',
    slug: '',
    niche: 'lawyer',
    description: '',
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [schemaTemplate, setSchemaTemplate] = useState<any>(null);
  const [liveSchema, setLiveSchema] = useState<any[]>([]); // parsed client-side instantly
  const [schemaLoading, setSchemaLoading] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['admin-templates'],
    queryFn: api.admin.getTemplates,
  });

  const deleteMut = useMutation({
    mutationFn: api.admin.deleteTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-templates'] }),
  });

  const regenerateMut = useMutation({
    mutationFn: api.admin.regenerateTemplateSchema,
    onSuccess: (data) => {
      alert(`Schema regenerată! Pagini detectate: ${data.pagesDetected}, Secțiuni: ${data.sectionsDetected}`);
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[], _fileRejections: unknown, _event: unknown) => {
    const filesWithPath: FileWithPath[] = acceptedFiles.map(file => {
      const path = (file as any).path || (file as any).webkitRelativePath || file.name;
      return { file, path };
    });
    setSelectedFiles(prev => {
      const next = [...prev, ...filesWithPath];
      // Auto slug from folder name
      if (filesWithPath.length > 0 && !templateData.slug) {
        const folderName = filesWithPath[0].path.split('/')[0].replace(/\.[^/.]+$/, '');
        if (folderName) {
          setTemplateData(p => ({
            ...p,
            slug: folderName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          }));
        }
      }
      // Read HTML files and parse schema immediately in browser
      setSchemaLoading(true);
      const htmlFiles = next.filter(f => f.path.endsWith('.html'));
      if (htmlFiles.length === 0) { setSchemaLoading(false); return next; }
      let pending = htmlFiles.length;
      const allPages: any[] = [];
      htmlFiles.forEach(({ file, path }) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const html = e.target?.result as string;
          (file as any).__htmlContent = html;
          const cleanPath = path.replace(/^[^/]+\//, '') || path;
          const page = parseHtmlInBrowser(cleanPath, html);
          if (page.sections.length > 0) allPages.push(page);
          pending--;
          if (pending === 0) {
            allPages.sort((a, b) => {
              if (a.id === 'index') return -1;
              if (b.id === 'index') return 1;
              return a.name.localeCompare(b.name);
            });
            setLiveSchema(allPages);
            setSchemaLoading(false);
          }
        };
        reader.readAsText(file);
      });
      return next;
    });
  }, [templateData.slug]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files, fileRejections, event) => {
      // Filter only allowed extensions after drop
      const allowedExts = ['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
      const filtered = files.filter(f => {
        const ext = '.' + f.name.split('.').pop()?.toLowerCase();
        return allowedExts.includes(ext);
      });
      onDrop(filtered, fileRejections, event);
    },
    getFilesFromEvent,
    // No accept filter to allow folder drag & drop
    multiple: true,
  });

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!templateData.name || !templateData.slug || selectedFiles.length === 0) {
      alert('Completează toate câmpurile și selectează fișierele');
      return;
    }
    setUploading(true);
    setUploadProgress('Pregătire upload...');
    try {
      const formData = new FormData();
      selectedFiles.forEach(({ file, path }) => {
        formData.append('files', file);
        formData.append('paths', path);
      });
      formData.append('templateSlug', templateData.slug);
      const uploadResult = await api.admin.uploadTemplateFiles(formData, (progress) => {
        setUploadProgress(`Upload... ${progress}%`);
      });
      setUploadProgress('Înregistrare în CMS și salvare schemă...');
      const created = await api.admin.createTemplate({
        ...templateData,
        r2Key: `templates/${templateData.slug}`,
        parsedSchema: (uploadResult as any).parsedSchema,
      });
      setUploadProgress(`Succes! ${created.pagesDetected ?? 0} pagini, ${created.fieldsDetected ?? 0} câmpuri detectate.`);
      setSelectedFiles([]);
      setTemplateData({ name: '', slug: '', niche: 'lawyer', description: '' });
      await queryClient.invalidateQueries({ queryKey: ['admin-templates'] });
      // Auto-open schema modal for the newly created template
      if (created.id) setSchemaTemplate(created);
      setTimeout(() => setUploadProgress(''), 5000);
    } catch (err: any) {
      setUploadProgress(`Eroare: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const getNicheLabel = (value: string) => NICHES.find(n => n.value === value)?.label || value;
  const getNicheIcon = (value: string) => NICHES.find(n => n.value === value)?.icon || '📁';

  const filteredTemplates = templates?.filter((t: any) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.niche.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const iconBtn = (onClick: () => void, icon: React.ReactNode, title: string, colorStyle: React.CSSProperties, disabled = false) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-2.5 rounded-xl transition-all disabled:opacity-40 hover:scale-105"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', ...colorStyle }}
    >
      {icon}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-7">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold" style={{ color: 'var(--txt-primary)' }}>Template-uri</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--txt-muted)' }}>Gestionează template-urile disponibile pentru clienți</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--txt-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Caută template..."
              className="neu-input pl-9 pr-4 py-2.5 w-52 text-sm"
            />
          </div>
          {/* View toggle */}
          <div className="flex rounded-[13px] p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {(['grid','list'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="p-2 rounded-xl transition-all"
                style={viewMode === mode ? {
                  background: 'linear-gradient(135deg,#f0b429,#a86000)',
                  boxShadow: '0 2px 8px rgba(240,180,41,0.3)',
                  color: '#120900',
                } : { color: 'var(--txt-muted)' }}
              >
                {mode === 'grid' ? <Grid className="w-4 h-4" /> : <List className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Drop Zone ── */}
      {/* ── Hidden Folder Input ── */}
      <input
        ref={folderInputRef}
        type="file"
        {...{ webkitdirectory: '', directory: '', mozdirectory: '' } as any}
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) {
            // Filter only allowed extensions
            const allowedExts = ['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
            const filtered = files.filter(f => {
              const ext = '.' + f.name.split('.').pop()?.toLowerCase();
              return allowedExts.includes(ext);
            });
            if (filtered.length === 0) {
              alert('Nu s-au găsit fișiere valide în folder. Selectează un folder cu HTML, CSS, JS, imagini.');
              return;
            }
            onDrop(filtered, [], null);
          }
        }}
      />

      {/* ── Drop Zone ── */}
      <div
        {...getRootProps()}
        className="relative rounded-3xl p-10 text-center cursor-pointer transition-all"
        style={{
          border: `2px dashed ${isDragActive ? '#f0b429' : 'rgba(255,255,255,0.12)'}`,
          background: isDragActive ? 'rgba(240,180,41,0.07)' : 'rgba(255,255,255,0.02)',
          transform: isDragActive ? 'scale(1.01)' : 'scale(1)',
          boxShadow: isDragActive ? '0 0 40px rgba(240,180,41,0.15)' : 'none',
        }}
        onClick={(e) => {
          // If clicking the area (not the input), trigger folder selection
          if (e.target === e.currentTarget || (e.target as HTMLElement).tagName !== 'INPUT') {
            e.preventDefault();
            folderInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Native folder handling
          const items = e.dataTransfer?.items;
          if (items && items.length > 0) {
            const allFiles: File[] = [];
            for (const item of items) {
              const entry = item.webkitGetAsEntry?.() || item.getAsEntry?.();
              if (entry) {
                if (entry.isFile) {
                  const file = await new Promise<File>((resolve) => {
                    (entry as FileSystemFileEntry).file(resolve);
                  });
                  (file as any).path = entry.fullPath.startsWith('/') ? entry.fullPath.slice(1) : entry.fullPath;
                  allFiles.push(file);
                } else if (entry.isDirectory) {
                  // Read directory recursively
                  const dirReader = (entry as FileSystemDirectoryEntry).createReader();
                  const readEntries = async (): Promise<File[]> => {
                    return new Promise((resolve) => {
                      dirReader.readEntries(async (entries) => {
                        if (entries.length === 0) {
                          resolve([]);
                          return;
                        }
                        const files: File[] = [];
                        for (const subEntry of entries) {
                          if (subEntry.isFile) {
                            const file = await new Promise<File>((r) => {
                              (subEntry as FileSystemFileEntry).file(r);
                            });
                            const path = subEntry.fullPath.startsWith('/') ? subEntry.fullPath.slice(1) : subEntry.fullPath;
                            (file as any).path = path;
                            files.push(file);
                          } else if (subEntry.isDirectory) {
                            // Recursive read - simplified for now
                            const subFiles = await new Promise<File[]>((r) => {
                              const subReader = (subEntry as FileSystemDirectoryEntry).createReader();
                              const subFilesArr: File[] = [];
                              const readSub = () => {
                                subReader.readEntries((subEntries) => {
                                  if (subEntries.length === 0) {
                                    r(subFilesArr);
                                    return;
                                  }
                                  Promise.all(subEntries.map(se => new Promise<void>((res) => {
                                    if (se.isFile) {
                                      (se as FileSystemFileEntry).file((f) => {
                                        (f as any).path = se.fullPath.startsWith('/') ? se.fullPath.slice(1) : se.fullPath;
                                        subFilesArr.push(f);
                                        res();
                                      });
                                    } else {
                                      res();
                                    }
                                  }))).then(() => readSub());
                                });
                              };
                              readSub();
                            });
                            files.push(...subFiles);
                          }
                        }
                        resolve(files);
                      });
                    });
                  };
                  const dirFiles = await readEntries();
                  allFiles.push(...dirFiles);
                }
              }
            }
            if (allFiles.length > 0) {
              onDrop(allFiles, [], null);
            }
          }
        }}
      >
        <input {...getInputProps()} className="hidden" />
        <div className="icon-box w-16 h-16 mx-auto mb-5 flex items-center justify-center" style={{ background: 'linear-gradient(145deg,#f0b429,#a86000)' }}>
          <Upload className="w-7 h-7 text-white relative z-10" />
        </div>
        <h3 className="text-xl font-extrabold mb-2" style={{ color: 'var(--txt-primary)' }}>
          {isDragActive ? 'Drop fișierele aici!' : 'Drag & Drop sau Click'}
        </h3>
        <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--txt-muted)' }}>
          Trage folderul template direct sau click pentru a selecta folderul (HTML, CSS, JS, imagini).
        </p>
      </div>

      {/* ── Upload Form ── */}
      {selectedFiles.length > 0 && (
        <div className="neu-card p-7">
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="icon-box w-10 h-10 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f0b429,#a86000)' }}>
              <Upload className="w-4 h-4 text-white relative z-10" />
            </div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--txt-primary)' }}>Configurează Template</h3>
            <span className="ml-auto text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(240,180,41,0.12)', color: 'var(--gold)', border: '1px solid rgba(240,180,41,0.2)' }}>
              {selectedFiles.length} fișiere
            </span>
          </div>
          <div className="grid md:grid-cols-2 gap-7 relative z-10">
            <div className="space-y-5">
              <div>
                <label className="section-label block mb-2">Nume Template</label>
                <input
                  type="text"
                  value={templateData.name}
                  onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="ex: Lawyer Premium"
                  className="neu-input w-full"
                />
              </div>
              <div>
                <label className="section-label block mb-2">Slug (URL)</label>
                <input
                  type="text"
                  value={templateData.slug}
                  onChange={(e) => setTemplateData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                  placeholder="ex: lawyer-premium"
                  className="neu-input w-full"
                />
              </div>
              <div>
                <label className="section-label block mb-3">Nisă</label>
                <div className="grid grid-cols-4 gap-2">
                  {NICHES.map((niche) => (
                    <button
                      key={niche.value}
                      onClick={() => setTemplateData(prev => ({ ...prev, niche: niche.value }))}
                      className="p-2.5 rounded-[13px] text-center transition-all"
                      style={templateData.niche === niche.value ? {
                        background: 'linear-gradient(135deg,rgba(240,180,41,0.15),rgba(168,96,0,0.1))',
                        border: '1px solid rgba(240,180,41,0.35)',
                        boxShadow: '0 0 12px rgba(240,180,41,0.15)',
                      } : {
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                      }}
                    >
                      <span className="text-lg mb-1 block">{niche.icon}</span>
                      <span className="text-[10px] font-semibold" style={{ color: templateData.niche === niche.value ? 'var(--gold)' : 'var(--txt-muted)' }}>{niche.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="section-label block mb-2">Fișiere selectate</label>
              <div className="rounded-[14px] p-3 max-h-48 overflow-y-auto scrollbar-none space-y-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {selectedFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex items-center gap-2 text-sm">
                      <File className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--gold)' }} />
                      <span className="truncate max-w-[200px] text-xs" style={{ color: 'var(--txt-secondary)' }}>{f.path}</span>
                    </div>
                    <button onClick={() => removeFile(i)} className="p-1 rounded-lg transition-colors hover:bg-red-500/10">
                      <X className="w-3.5 h-3.5" style={{ color: '#f87171' }} />
                    </button>
                  </div>
                ))}
              </div>
              {uploadProgress && (
                <div className="mt-4 p-3 rounded-xl text-sm flex items-center gap-2" style={{
                  background: uploadProgress.includes('Succes') ? 'rgba(52,211,153,0.1)' :
                               uploadProgress.includes('Eroare') ? 'rgba(248,113,113,0.1)' :
                               'rgba(240,180,41,0.1)',
                  color: uploadProgress.includes('Succes') ? '#34d399' :
                         uploadProgress.includes('Eroare') ? '#f87171' :
                         'var(--gold)',
                  border: `1px solid ${uploadProgress.includes('Succes') ? 'rgba(52,211,153,0.2)' : uploadProgress.includes('Eroare') ? 'rgba(248,113,113,0.2)' : 'rgba(240,180,41,0.2)'}`,
                }}>
                  {uploading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                  {uploadProgress}
                </div>
              )}
              <button
                onClick={handleUpload}
                disabled={uploading || !templateData.name || !templateData.slug}
                className="mt-4 w-full py-3.5 neu-btn-primary text-sm font-bold disabled:opacity-50"
              >
                <span className="relative z-10">{uploading ? 'Se încarcă...' : 'Încarcă Template'}</span>
              </button>
            </div>
          </div>

          {/* ── Live Schema Preview ── */}
          {(schemaLoading || liveSchema.length > 0) && (
            <div className="mt-6 relative z-10" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem' }}>
              <div className="flex items-center gap-2 mb-4">
                {schemaLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--gold)' }} />
                  : <Eye className="w-4 h-4" style={{ color: 'var(--gold)' }} />}
                <span className="text-sm font-bold" style={{ color: 'var(--txt-secondary)' }}>
                  {schemaLoading
                    ? 'Se analizează fișierele HTML...'
                    : `${liveSchema.length} pagini · ${liveSchema.reduce((s, p) => s + p.sections.length, 0)} secțiuni · ${liveSchema.reduce((s, p) => s + p.sections.reduce((s2: number, sec: any) => s2 + sec.fields.length, 0), 0)} câmpuri`}
                </span>
              </div>
              {!schemaLoading && liveSchema.map((page: any) => (
                <div key={page.id} className="mb-3 overflow-hidden rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'rgba(240,180,41,0.07)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <FileText className="w-4 h-4" style={{ color: 'var(--gold)' }} />
                    <span className="font-bold text-sm" style={{ color: 'var(--txt-primary)' }}>{page.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--txt-muted)' }}>{page.file}</span>
                    <span className="ml-auto text-xs" style={{ color: 'var(--txt-muted)' }}>{page.sections.length} secțiuni</span>
                  </div>
                  {page.sections.map((sec: any) => (
                    <div key={sec.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="flex items-center gap-2 px-6 py-2">
                        <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--txt-muted)' }} />
                        <span className="text-xs font-semibold" style={{ color: 'var(--txt-secondary)' }}>{sec.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--txt-muted)' }}>{sec.type}</span>
                        <span className="ml-auto text-[10px]" style={{ color: 'var(--txt-muted)' }}>{sec.fields.length} câmpuri</span>
                      </div>
                      <div className="px-6 pb-2 grid grid-cols-1 gap-1">
                        {sec.fields.map((f: any) => (
                          <div key={f.id} className="flex items-center gap-2 py-1 px-3 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            {f.type === 'image' ? <Image className="w-3 h-3 text-purple-400 shrink-0" /> :
                             f.type === 'link' ? <Link className="w-3 h-3 text-blue-400 shrink-0" /> :
                             f.type === 'textarea' ? <FileText className="w-3 h-3 text-green-400 shrink-0" /> :
                             <Type className="w-3 h-3 shrink-0" style={{ color: 'var(--gold)' }} />}
                            <span className="font-semibold shrink-0" style={{ color: 'var(--txt-secondary)' }}>{f.label}:</span>
                            <span className="truncate" style={{ color: 'var(--txt-muted)' }}>{f.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Templates List ── */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-xl font-bold" style={{ color: 'var(--txt-primary)' }}>Template-uri Existente</h2>
          <span className="text-xs px-2.5 py-1 rounded-full font-bold" style={{ background: 'rgba(240,180,41,0.12)', color: 'var(--gold)', border: '1px solid rgba(240,180,41,0.2)' }}>
            {filteredTemplates?.length || 0}
          </span>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--gold)' }} />
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTemplates?.map((template: any) => (
              <div key={template.id} className="neu-card p-6 relative overflow-visible">
                <div className="absolute inset-0 rounded-[var(--radius)] overflow-hidden pointer-events-none">
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%)' }} />
                </div>
                <div className="flex items-start justify-between mb-5 relative z-10">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.18)' }}>
                    {getNicheIcon(template.niche)}
                  </div>
                  <div className="flex gap-1.5">
                    {iconBtn(() => setSchemaTemplate(template), <Eye className="w-4 h-4" />, 'Vezi Schema', { color: 'var(--gold)' })}
                    {iconBtn(() => regenerateMut.mutate(template.id), <RefreshCw className={clsx('w-4 h-4', regenerateMut.isPending && 'animate-spin')} />, 'Regenerare Schema', { color: '#60a5fa' }, regenerateMut.isPending)}
                    {iconBtn(() => deleteMut.mutate(template.id), <Trash2 className="w-4 h-4" />, 'Șterge', { color: '#f87171' })}
                  </div>
                </div>
                <h3 className="font-extrabold text-lg mb-1 relative z-10" style={{ color: 'var(--txt-primary)' }}>{template.name}</h3>
                <p className="text-sm relative z-10" style={{ color: 'var(--txt-secondary)' }}>{getNicheLabel(template.niche)}</p>
                <p className="text-xs mt-2 relative z-10" style={{ color: 'var(--txt-muted)' }}>{template.slug}</p>
                <div className="absolute bottom-0 left-6 right-6 h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg,#f0b429,#a86000)', opacity: 0.25 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="neu-card overflow-hidden">
            {filteredTemplates?.map((template: any, idx: number) => (
              <div
                key={template.id}
                className="flex items-center justify-between px-6 py-4 table-row-hover transition-colors relative z-10"
                style={{ borderBottom: idx < (filteredTemplates?.length ?? 0) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.15)' }}>
                    {getNicheIcon(template.niche)}
                  </div>
                  <div>
                    <h4 className="font-bold" style={{ color: 'var(--txt-primary)' }}>{template.name}</h4>
                    <p className="text-sm" style={{ color: 'var(--txt-muted)' }}>{getNicheLabel(template.niche)} · {template.slug}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {iconBtn(() => setSchemaTemplate(template), <Eye className="w-4 h-4" />, 'Vezi Schema', { color: 'var(--gold)' })}
                  {iconBtn(() => regenerateMut.mutate(template.id), <RefreshCw className={clsx('w-4 h-4', regenerateMut.isPending && 'animate-spin')} />, 'Regenerare Schema', { color: '#60a5fa' }, regenerateMut.isPending)}
                  {iconBtn(() => deleteMut.mutate(template.id), <Trash2 className="w-4 h-4" />, 'Șterge', { color: '#f87171' })}
                </div>
              </div>
            ))}
          </div>
        )}
        {!isLoading && filteredTemplates?.length === 0 && (
          <div className="text-center py-16 neu-card">
            <Folder className="w-14 h-14 mx-auto mb-4" style={{ color: 'var(--txt-muted)', opacity: 0.5 }} />
            <p className="font-semibold" style={{ color: 'var(--txt-secondary)' }}>Niciun template încărcat încă.</p>
          </div>
        )}
      </div>

      {schemaTemplate && (
        <SchemaModal template={schemaTemplate} onClose={() => setSchemaTemplate(null)} />
      )}
    </div>
  );
}
