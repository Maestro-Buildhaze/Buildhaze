import { useState, useCallback } from 'react';
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
  const files: { file: File; path: string }[] = [];
  
  const items = event.dataTransfer?.items;
  if (items) {
    for (const item of items) {
      const entry = item.webkitGetAsEntry?.() || item.getAsEntry?.();
      if (entry) {
        const entryFiles = await readEntryContent(entry);
        files.push(...entryFiles);
      }
    }
  }
  
  // Fallback to regular files if no items API
  if (files.length === 0 && event.dataTransfer?.files) {
    for (const file of event.dataTransfer.files) {
      files.push({ file, path: file.name });
    }
  }
  
  // Return files with custom path property attached
  return files.map(({ file, path }) => {
    (file as any).path = path;
    return file;
  });
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-warm-900 rounded-3xl shadow-2xl border border-warm-200 dark:border-warm-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-warm-200 dark:border-warm-700">
          <div>
            <h2 className="text-xl font-bold text-warm-800 dark:text-warm-100">{template.name}</h2>
            <p className="text-sm text-warm-500 mt-0.5">
              {isLoading ? 'Se încarcă schema...' : pages.length > 0
                ? `${pages.length} pagini · ${pages.reduce((s: number, p: any) => s + p.sections.length, 0)} secțiuni · ${totalFields} câmpuri detectate`
                : 'Schema nu a fost detectată încă'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl font-medium transition-all disabled:opacity-50"
            >
              <RefreshCw className={clsx('w-4 h-4', regenerating && 'animate-spin')} />
              {regenerating ? 'Detectare...' : 'Re-detectează'}
            </button>
            <button onClick={onClose} className="p-2 text-warm-400 hover:bg-warm-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : pages.length === 0 ? (
            <div className="text-center py-16">
              <Folder className="w-12 h-12 mx-auto mb-3 text-warm-300" />
              <p className="text-warm-500 font-medium">Schema nu a fost generată</p>
              <p className="text-sm text-warm-400 mt-1">Apasă "Re-detectează" pentru a extrage paginile și câmpurile din fișierele HTML.</p>
            </div>
          ) : (
            pages.map((page: any) => (
              <div key={page.id} className="border border-warm-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => togglePage(page.id)}
                  className="w-full flex items-center justify-between p-4 bg-warm-50 hover:bg-warm-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    {expandedPages.has(page.id) ? <ChevronDown className="w-4 h-4 text-warm-400" /> : <ChevronRight className="w-4 h-4 text-warm-400" />}
                    <FileText className="w-4 h-4 text-amber-500" />
                    <span className="font-semibold text-warm-800">{page.name}</span>
                    <span className="text-xs text-warm-400 bg-warm-200 px-2 py-0.5 rounded-full">{page.file}</span>
                  </div>
                  <span className="text-xs text-warm-500">{page.sections.length} secțiuni</span>
                </button>

                {expandedPages.has(page.id) && (
                  <div className="divide-y divide-warm-100">
                    {page.sections.map((section: any) => (
                      <div key={section.id} className="bg-white">
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="w-full flex items-center justify-between px-6 py-3 hover:bg-warm-50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            {expandedSections.has(section.id) ? <ChevronDown className="w-3.5 h-3.5 text-warm-300" /> : <ChevronRight className="w-3.5 h-3.5 text-warm-300" />}
                            <span className="text-sm font-medium text-warm-700">{section.name}</span>
                            <span className="text-xs text-warm-400 capitalize bg-warm-100 px-2 py-0.5 rounded-full">{section.type}</span>
                          </div>
                          <span className="text-xs text-warm-400">{section.fields.length} câmpuri</span>
                        </button>

                        {expandedSections.has(section.id) && (
                          <div className="px-6 pb-3 space-y-2">
                            {section.fields.map((field: any) => (
                              <div key={field.id} className="flex items-start gap-3 p-3 bg-warm-50 rounded-xl">
                                <FieldTypeIcon type={field.type} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-warm-700">{field.label}</p>
                                  <p className="text-xs text-warm-400 truncate mt-0.5">{field.value || '(gol)'}</p>
                                </div>
                                <span className="text-xs text-warm-300 bg-white px-2 py-0.5 rounded-lg border border-warm-100 shrink-0">{field.type}</span>
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
    const filesWithPath: FileWithPath[] = acceptedFiles.map(file => ({
      file,
      path: (file as any).path || file.name,
    }));
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
    onDrop,
    getFilesFromEvent,
    accept: {
      'text/html': ['.html'],
      'text/css': ['.css'],
      'application/javascript': ['.js'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'],
    },
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-amber-600">Template-uri</h1>
          <p className="text-warm-500 mt-1">Gestionează template-urile disponibile pentru clienți</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Caută template..."
              className="pl-9 pr-4 py-2 bg-white border border-warm-200 rounded-xl focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="flex bg-warm-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div className="mb-8">
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-amber-500 bg-amber-50 scale-[1.02]'
              : 'border-warm-300 bg-warm-50 hover:border-amber-400'
          }`}
        >
          <input {...getInputProps()} />
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-warm-800 mb-2">
            {isDragActive ? 'Drop fișierele aici!' : 'Drag & Drop sau Click'}
          </h3>
          <p className="text-warm-500 max-w-md mx-auto">
            Trage fișierele template direct aici sau click pentru a selecta.
          </p>
        </div>
      </div>

      {/* Upload Form */}
      {selectedFiles.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Configurează Template ({selectedFiles.length} fișiere)</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-600 mb-2">Nume Template</label>
                <input
                  type="text"
                  value={templateData.name}
                  onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="ex: Lawyer Premium"
                  className="w-full px-4 py-2 border border-warm-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-600 mb-2">Slug (URL)</label>
                <input
                  type="text"
                  value={templateData.slug}
                  onChange={(e) => setTemplateData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                  placeholder="ex: lawyer-premium"
                  className="w-full px-4 py-2 border border-warm-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-600 mb-2">Nisă</label>
                <div className="grid grid-cols-4 gap-2">
                  {NICHES.map((niche) => (
                    <button
                      key={niche.value}
                      onClick={() => setTemplateData(prev => ({ ...prev, niche: niche.value }))}
                      className={`p-2 rounded-xl border-2 text-center transition-all ${
                        templateData.niche === niche.value
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-warm-200 hover:border-amber-300'
                      }`}
                    >
                      <span className="text-xl mb-1 block">{niche.icon}</span>
                      <span className="text-xs">{niche.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-warm-600 mb-2">Fișiere selectate</label>
              <div className="bg-warm-50 rounded-xl p-4 max-h-48 overflow-y-auto">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-warm-200 last:border-0">
                    <div className="flex items-center gap-2 text-sm">
                      <File className="w-4 h-4 text-amber-500" />
                      <span className="truncate max-w-[200px]">{f.path}</span>
                    </div>
                    <button onClick={() => removeFile(i)} className="p-1 hover:bg-rose-100 rounded">
                      <X className="w-4 h-4 text-rose-500" />
                    </button>
                  </div>
                ))}
              </div>
              {uploadProgress && (
                <div className={`mt-4 p-3 rounded-xl text-sm ${
                  uploadProgress.includes('Succes') ? 'bg-green-100 text-green-700' :
                  uploadProgress.includes('Eroare') ? 'bg-rose-100 text-rose-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {uploading ? <Loader2 className="w-4 h-4 inline mr-2 animate-spin" /> : null}
                  {uploadProgress}
                </div>
              )}
              <button
                onClick={handleUpload}
                disabled={uploading || !templateData.name || !templateData.slug}
                className="mt-4 w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {uploading ? 'Se încarcă...' : 'Încarcă Template'}
              </button>
            </div>
          </div>

          {/* ── Live Schema Preview ───────────────────────────────────────── */}
          {(schemaLoading || liveSchema.length > 0) && (
            <div className="mt-6 border-t border-warm-200 pt-5">
              <div className="flex items-center gap-2 mb-3">
                {schemaLoading
                  ? <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  : <Eye className="w-4 h-4 text-amber-500" />}
                <span className="text-sm font-semibold text-warm-700">
                  {schemaLoading
                    ? 'Se analizează fișierele HTML...'
                    : `Schema detectată: ${liveSchema.length} pagini · ${liveSchema.reduce((s, p) => s + p.sections.length, 0)} secțiuni · ${liveSchema.reduce((s, p) => s + p.sections.reduce((s2: number, sec: any) => s2 + sec.fields.length, 0), 0)} câmpuri`}
                </span>
              </div>
              {!schemaLoading && liveSchema.map((page: any) => (
                <div key={page.id} className="mb-3 border border-warm-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-warm-200">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <span className="font-semibold text-sm text-warm-800">{page.name}</span>
                    <span className="text-xs text-warm-400 bg-white px-2 py-0.5 rounded-full border border-warm-200">{page.file}</span>
                    <span className="ml-auto text-xs text-warm-500">{page.sections.length} secțiuni</span>
                  </div>
                  {page.sections.map((sec: any) => (
                    <div key={sec.id} className="border-b border-warm-100 last:border-0">
                      <div className="flex items-center gap-2 px-6 py-2 bg-white">
                        <ChevronRight className="w-3.5 h-3.5 text-warm-300" />
                        <span className="text-xs font-medium text-warm-700">{sec.name}</span>
                        <span className="text-xs text-warm-400 bg-warm-100 px-2 py-0.5 rounded-full capitalize">{sec.type}</span>
                        <span className="ml-auto text-xs text-warm-400">{sec.fields.length} câmpuri</span>
                      </div>
                      <div className="px-6 pb-2 grid grid-cols-1 gap-1">
                        {sec.fields.map((f: any) => (
                          <div key={f.id} className="flex items-center gap-2 py-1 px-3 bg-warm-50 rounded-lg text-xs">
                            {f.type === 'image' ? <Image className="w-3 h-3 text-purple-500 shrink-0" /> :
                             f.type === 'link' ? <Link className="w-3 h-3 text-blue-500 shrink-0" /> :
                             f.type === 'textarea' ? <FileText className="w-3 h-3 text-green-500 shrink-0" /> :
                             <Type className="w-3 h-3 text-amber-500 shrink-0" />}
                            <span className="text-warm-600 font-medium shrink-0">{f.label}:</span>
                            <span className="text-warm-400 truncate">{f.value}</span>
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

      {/* Templates List */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Template-uri Existente ({filteredTemplates?.length || 0})</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates?.map((template: any) => (
              <div key={template.id} className="bg-white rounded-2xl shadow p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-2xl">
                    {getNicheIcon(template.niche)}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSchemaTemplate(template)}
                      className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg"
                      title="Vezi Schema"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => regenerateMut.mutate(template.id)}
                      disabled={regenerateMut.isPending}
                      className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg"
                      title="Regenerare Schema"
                    >
                      <RefreshCw className={clsx('w-5 h-5', regenerateMut.isPending && 'animate-spin')} />
                    </button>
                    <button
                      onClick={() => deleteMut.mutate(template.id)}
                      className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
                <p className="text-sm text-warm-500">{getNicheLabel(template.niche)}</p>
                <p className="text-xs text-warm-400 mt-2">{template.slug}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            {filteredTemplates?.map((template: any) => (
              <div key={template.id} className="flex items-center justify-between p-4 border-b border-warm-200 last:border-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-xl">
                    {getNicheIcon(template.niche)}
                  </div>
                  <div>
                    <h4 className="font-medium">{template.name}</h4>
                    <p className="text-sm text-warm-500">{getNicheLabel(template.niche)} • {template.slug}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSchemaTemplate(template)}
                    className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg"
                    title="Vezi Schema"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => regenerateMut.mutate(template.id)}
                    disabled={regenerateMut.isPending}
                    className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg"
                    title="Regenerare Schema"
                  >
                    <RefreshCw className={clsx('w-5 h-5', regenerateMut.isPending && 'animate-spin')} />
                  </button>
                  <button
                    onClick={() => deleteMut.mutate(template.id)}
                    className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {!isLoading && filteredTemplates?.length === 0 && (
          <div className="text-center py-12 text-warm-500">
            <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Niciun template încărcat încă.</p>
          </div>
        )}
      </div>

      {schemaTemplate && (
        <SchemaModal template={schemaTemplate} onClose={() => setSchemaTemplate(null)} />
      )}
    </div>
  );
}
