import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Eye, EyeOff, Loader2, Image as ImageIcon, X,
  Plus, Trash2, Tag, Clock, Star, User, Folder, GripVertical, Type, Hash, Link, Calendar, CheckSquare, FileText, List, Image as ImageIcon2, AlignLeft, Globe, Code, MoreHorizontal, Upload
} from 'lucide-react';
import { api } from '../lib/api';
import clsx from 'clsx';

export function BlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id;

  const { data: existing } = useQuery({
    queryKey: ['blog', id],
    queryFn: () => api.blog.get(id!),
    enabled: !!id,
  });
  
  const { data: categories } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: () => api.blog.categories.list(),
  });
  
  const { data: authors } = useQuery({
    queryKey: ['blog-authors'],
    queryFn: () => api.blog.authors.list(),
  });

  // Basic fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [coverImage, setCoverImage] = useState('');
  
  // Metadata
  const [categoryId, setCategoryId] = useState<string>('');
  const [authorId, setAuthorId] = useState<string>('');
  const [readTime, setReadTime] = useState<number>(5);
  const [isPublished, setIsPublished] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  
  // SEO
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDesc, setMetaDesc] = useState('');
  
  // Rich content
  const [bullets, setBullets] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newBullet, setNewBullet] = useState('');
  const [newTag, setNewTag] = useState('');
  
  // Content blocks (rich article builder)
  type BlockType = 'section' | 'paragraph' | 'heading' | 'bullets' | 'numbered' | 'blockquote' | 'infobox' | 'image' | 'card' | 'keypoints';
  interface ContentBlock { id: string; type: BlockType; visible: boolean; text?: string; title?: string; level?: 2|3; attribution?: string; src?: string; caption?: string; }
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [leadParagraph, setLeadParagraph] = useState('');

  // Dynamic custom fields
  type FieldType = 'text' | 'textarea' | 'number' | 'image' | 'url' | 'boolean' | 'select' | 'multiselect' | 'date' | 'html' | 'markdown' | 'json';
  interface CustomField {
    id?: string;
    name: string;
    label: string;
    type: FieldType;
    value: any;
    options?: string[]; // for select/multiselect
  }
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [customFieldsUI, setCustomFieldsUI] = useState<CustomField[]>([]);
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  
  // Inline create category/author
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newAuthorName, setNewAuthorName] = useState('');
  
  const createCategoryMut = useMutation({
    mutationFn: (name: string) => api.blog.categories.create({ name }),
    onSuccess: (cat) => {
      queryClient.invalidateQueries({ queryKey: ['blog-categories'] });
      setCategoryId(cat.id);
      setNewCategoryName('');
    },
  });
  
  const createAuthorMut = useMutation({
    mutationFn: (name: string) => api.blog.authors.create({ name }),
    onSuccess: (author) => {
      queryClient.invalidateQueries({ queryKey: ['blog-authors'] });
      setAuthorId(author.id);
      setNewAuthorName('');
    },
  });
  
  const [tab, setTab] = useState<'content' | 'sections' | 'metadata' | 'seo'>('content');
  const [saved, setSaved] = useState(false);
  
  // Generate slug from title
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  };

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setSlug(existing.slug);
      setContent(existing.content);
      setExcerpt(existing.excerpt ?? '');
      setCoverImage(existing.coverImage ?? '');
      setCategoryId(existing.categoryId ?? '');
      setAuthorId(existing.authorId ?? '');
      setReadTime(existing.readTime ?? 5);
      setIsPublished(existing.isPublished);
      setIsFeatured(existing.isFeatured ?? false);
      setMetaTitle(existing.metaTitle ?? '');
      setMetaDesc(existing.metaDesc ?? '');
      setBullets(existing.bullets ?? []);
      setTags(existing.tags ?? []);
      const cf = existing.customFields;
      if (cf && typeof cf === 'object' && !Array.isArray(cf)) {
        const cfObj = cf as Record<string, any>;
        setCustomFields(cfObj);
        if (Array.isArray(cfObj.blocks)) {
          setBlocks(cfObj.blocks as ContentBlock[]);
        } else if (Array.isArray(cfObj.sections)) {
          setBlocks((cfObj.sections as any[]).map((s: any): ContentBlock => ({
            id: s.id || generateSlug(s.title || ''),
            type: (s.type === 'blockquote' ? 'blockquote' : s.type === 'infobox' ? 'infobox' : 'section') as BlockType,
            visible: true,
            title: s.title || '',
            text: s.content || '',
          })));
        }
        if (typeof cfObj.leadParagraph === 'string') setLeadParagraph(cfObj.leadParagraph);
      } else if (Array.isArray(cf)) {
        setCustomFieldsUI(cf as any[]);
        setCustomFields({});
      } else {
        setCustomFields({});
      }
    }
  }, [existing]);

  const publishSiteMut = useMutation({
    mutationFn: () => api.publish.deploy(),
  });

  const saveMut = useMutation({
    mutationFn: () => {
      const cf: Record<string, any> = { ...customFields };
      if (blocks.length > 0) cf.blocks = blocks; else delete cf.blocks;
      if (leadParagraph) cf.leadParagraph = leadParagraph; else delete cf.leadParagraph;
      delete cf.sections;
      const data = {
        title,
        slug: slug || generateSlug(title),
        content,
        excerpt: excerpt || null,
        coverImage: coverImage || null,
        categoryId: categoryId || null,
        authorId: authorId || null,
        readTime,
        isPublished,
        isFeatured,
        metaTitle: metaTitle || null,
        metaDesc: metaDesc || null,
        bullets,
        tags,
        customFields: cf,
      };
      return isNew ? api.blog.create(data) : api.blog.update(id!, data);
    },
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      if (isNew) navigate(`/blog/${post.id}`, { replace: true });
    },
  });
  
  const BLOCK_DEFS = [
    { type: 'section' as BlockType, label: 'Secțiune', icon: FileText },
    { type: 'paragraph' as BlockType, label: 'Paragraf', icon: AlignLeft },
    { type: 'heading' as BlockType, label: 'Titlu', icon: Type },
    { type: 'keypoints' as BlockType, label: 'Key Points', icon: CheckSquare },
    { type: 'bullets' as BlockType, label: 'Bullet List', icon: List },
    { type: 'numbered' as BlockType, label: 'Numbered', icon: Hash },
    { type: 'blockquote' as BlockType, label: 'Citat', icon: Globe },
    { type: 'infobox' as BlockType, label: 'Info Box', icon: Star },
    { type: 'image' as BlockType, label: 'Imagine', icon: ImageIcon2 },
    { type: 'card' as BlockType, label: 'Card', icon: Folder },
  ];
  const BLOCK_LABELS: Record<string, string> = { section: 'Secțiune', paragraph: 'Paragraf', heading: 'Titlu', bullets: 'Bullet List', numbered: 'Numbered', blockquote: 'Citat', infobox: 'Info Box', image: 'Imagine', card: 'Card', keypoints: 'Key Points' };
  const addBlock = (type: BlockType) => setBlocks(prev => [...prev, { id: `b${Date.now()}`, type, visible: true, ...(type === 'heading' ? { level: 2 as const } : {}), ...(type === 'keypoints' ? { title: 'Puncte Cheie ale Articolului' } : {}) }]);
  const removeBlock = (i: number) => setBlocks(prev => prev.filter((_, idx) => idx !== i));
  const updateBlock = (i: number, u: Partial<ContentBlock>) => setBlocks(prev => { const n = [...prev]; n[i] = { ...n[i], ...u }; return n; });
  const moveBlock = (i: number, dir: 'up' | 'down') => setBlocks(prev => {
    const n = [...prev]; const j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= n.length) return prev; [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const toggleBlockVisible = (i: number) => setBlocks(prev => { const n = [...prev]; n[i] = { ...n[i], visible: !n[i].visible }; return n; });
  const applyPreset = () => {
    setLeadParagraph('Descrie pe scurt subiectul articolului și importanța sa pentru cititor. Introduce contextul legislativ sau problematic în 2-3 fraze clare și convingătoare.');
    setBlocks([
      { id: 'kp-1', type: 'keypoints', visible: true, title: 'Puncte Cheie ale Articolului', text: 'Modificările legislative recente impun noi obligații\nTermenele de conformare sunt stricte\nPenalitățile pentru nerespectare sunt semnificative\nConsultanța specializată poate preveni riscuri majore' },
      { id: 'sec-1', type: 'section', visible: true, title: 'Contextul Legislativ', text: 'Descrie cadrul legislativ existent și motivul pentru care s-au impus modificările. Menționează directivele europene sau actele normative relevante.' },
      { id: 'sec-2', type: 'section', visible: true, title: 'Principalele Modificări', text: 'Prezintă în detaliu noile prevederi legale și impactul acestora asupra persoanelor fizice și juridice.\n\nMenționează articolele specifice din lege care au fost modificate.' },
      { id: 'bq-1', type: 'blockquote', visible: true, text: '"Citatul relevant din lege sau opinia unui expert juridic..."', attribution: 'Sursa / Art. XX' },
      { id: 'sec-3', type: 'section', visible: true, title: 'Obligații și Drepturi', text: 'Explică drepturile și obligațiile care decurg din noile reglementări pentru clienți.\n\nDetaliază termenele și condițiile esențiale.' },
      { id: 'ib-1', type: 'infobox', visible: true, text: 'Atenție: aspectele practice importante pe care clienții trebuie să le cunoască și riscurile în caz de neconformare.' },
      { id: 'sec-4', type: 'section', visible: true, title: 'Cum Vă Puteți Proteja', text: 'Recomandări practice și pași concreți pe care clienții ar trebui să îi urmeze.\n\nMenționează serviciile specifice pe care cabinetul le oferă în acest context.' },
      { id: 'sec-5', type: 'section', visible: true, title: 'Concluzii și Recomandări', text: 'Rezumă ideile principale și îndeamnă cititorul la acțiune. Menționează că echipa de avocați este disponibilă pentru consultanță specializată.' },
    ]);
  };

  const addBullet = () => {
    if (newBullet.trim()) {
      setBullets([...bullets, newBullet.trim()]);
      setNewBullet('');
    }
  };
  
  const removeBullet = (index: number) => {
    setBullets(bullets.filter((_, i) => i !== index));
  };
  
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };
  
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };
  
  // Custom fields functions
  const addCustomField = () => {
    if (!newFieldName.trim() || !newFieldLabel.trim()) return;
    
    const field: CustomField = {
      name: newFieldName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      label: newFieldLabel,
      type: newFieldType,
      value: newFieldType === 'boolean' ? false : newFieldType === 'multiselect' ? [] : '',
    };
    
    if (['select', 'multiselect'].includes(newFieldType) && newFieldOptions.trim()) {
      field.options = newFieldOptions.split(',').map(o => o.trim()).filter(Boolean);
    }
    
    setCustomFieldsUI([...customFieldsUI, field]);
    setNewFieldName('');
    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldOptions('');
    setShowAddField(false);
  };
  
  const removeCustomField = (index: number) => {
    setCustomFieldsUI(customFieldsUI.filter((_, i) => i !== index));
  };
  
  const updateCustomField = (index: number, updates: Partial<CustomField>) => {
    const updated = [...customFieldsUI];
    updated[index] = { ...updated[index], ...updates };
    setCustomFieldsUI(updated);
  };
  
  const moveCustomField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const updated = [...customFieldsUI];
      [updated[index], updated[index - 1]] = [updated[index - 1], updated[index]];
      setCustomFieldsUI(updated);
    } else if (direction === 'down' && index < customFieldsUI.length - 1) {
      const updated = [...customFieldsUI];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      setCustomFieldsUI(updated);
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/blog')} className="btn-secondary !px-2.5">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{isNew ? 'New Post' : 'Edit Post'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPublished((v) => !v)}
            className={clsx(
              'btn-secondary !py-1.5 text-xs gap-1.5',
              isPublished && '!border-[var(--green-border)]',
            )}
          style={isPublished ? { background: 'var(--green-bg)', color: 'var(--green)' } : {}}
          >
            {isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {isPublished ? 'Published' : 'Draft'}
          </button>
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || !title || (!content && blocks.length === 0 && !leadParagraph)}
            className="btn-primary"
          style={saved ? { background: 'var(--green-bg)', color: 'var(--green)', borderColor: 'var(--green-border)' } : {}}
          >
            {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : saveMut.isPending ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => {
              setIsPublished(true);
              saveMut.mutateAsync().then(() => publishSiteMut.mutate());
            }}
            disabled={saveMut.isPending || publishSiteMut.isPending || !title}
            className="btn-primary"
            style={{ background: '#059669', borderColor: '#059669' }}
          >
            {(saveMut.isPending || publishSiteMut.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            {publishSiteMut.isPending ? 'Publishing...' : publishSiteMut.isSuccess ? 'Published!' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit flex-wrap" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
        {(['content', 'sections', 'metadata', 'seo'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize',
            )}
            style={tab === t
              ? { background: 'var(--surface)', color: 'var(--text)', boxShadow: 'var(--shadow-xs)' }
              : { color: 'var(--text-4)' }
            }
          >
            {t === 'content' ? 'Content' : t === 'sections' ? `Preview${blocks.length > 0 ? ' • ' + blocks.length : ''}` : t === 'metadata' ? 'Metadata' : 'SEO'}
          </button>
        ))}
      </div>

      {tab === 'content' && (
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="label">Post Title *</label>
            <input
              className="input text-lg font-semibold"
              placeholder="Enter a captivating title..."
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slug || isNew) setSlug(generateSlug(e.target.value));
              }}
            />
          </div>
          
          {/* Slug */}
          <div>
            <label className="label">URL Slug</label>
            <input
              className="input font-mono text-sm"
              placeholder="post-url-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-4)' }}>
              This will be the URL: yoursite.com/blog/{slug || 'post-slug'}
            </p>
          </div>

          {/* Cover Image with Upload */}
          <div>
            <label className="label flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Cover Image
            </label>
            
            {/* Upload + URL */}
            <div className="flex gap-2 mb-3">
              <label className="btn-secondary cursor-pointer flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const media = await api.media.upload(file);
                      setCoverImage(media.url);
                    } catch (err: any) {
                      alert('Upload failed: ' + err.message);
                    }
                  }}
                />
              </label>
              <span className="self-center text-sm" style={{ color: 'var(--text-4)' }}>or paste URL</span>
              <input
                className="input flex-1"
                placeholder="https://..."
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
              />
              {coverImage && (
                <button onClick={() => setCoverImage('')} className="btn-secondary !px-2.5 text-red-400">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {coverImage && (
              <div className="relative">
                <img src={coverImage} alt="Cover preview" className="w-full h-48 object-cover rounded-xl" style={{ border: '1px solid var(--border)' }} />
                <div className="absolute bottom-2 right-2 px-2 py-1 rounded text-xs" style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', backdropFilter: 'blur(4px)' }}>
                  Cover Preview
                </div>
              </div>
            )}
          </div>

          {/* Excerpt */}
          <div>
            <label className="label">Excerpt / Summary</label>
            <textarea
              className="textarea"
              placeholder="Short summary shown in blog listings..."
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-4)' }}>{excerpt.length}/300 characters recommended</p>
          </div>

          {/* Block Editor */}
          <div style={{ borderTop: '1px solid var(--border)' }} className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Conținut articol</label>
              {blocks.length === 0 && (
                <button onClick={applyPreset} className="btn-secondary !py-1 text-xs" style={{ borderColor: 'rgba(212,168,83,0.5)', color: 'var(--accent)' }}>
                  Preset Articol Juridic
                </button>
              )}
            </div>
            <div className="mb-3">
              <label className="label text-xs">Paragraf introductiv <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>— italic la începutul articolului</span></label>
              <textarea className="textarea text-sm" placeholder="Introduce subiectul și captează atenția cititorului (2-3 fraze)..." value={leadParagraph} onChange={(e) => setLeadParagraph(e.target.value)} rows={2} />
            </div>
            {blocks.length > 0 && (
              <div className="space-y-2 mb-3">
                {blocks.map((block, idx) => (
                  <div key={block.id} className="clay-card overflow-hidden" style={!block.visible ? { opacity: 0.45 } : {}}>
                    <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>{BLOCK_LABELS[block.type]}</span>
                      <select className="text-xs rounded px-2 py-0.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-3)' }} value={block.type} onChange={(e) => updateBlock(idx, { type: e.target.value as BlockType })}>
                        {BLOCK_DEFS.map(b => <option key={b.type} value={b.type}>{b.label}</option>)}
                      </select>
                      <div className="ml-auto flex items-center gap-1">
                        <button onClick={() => toggleBlockVisible(idx)} className="p-1 rounded" title={block.visible ? 'Ascunde' : 'Arată'} style={{ color: block.visible ? 'var(--accent)' : 'var(--text-4)' }}>{block.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}</button>
                        <button onClick={() => moveBlock(idx, 'up')} disabled={idx === 0} className="p-1 rounded disabled:opacity-30" style={{ color: 'var(--text-3)' }}>↑</button>
                        <button onClick={() => moveBlock(idx, 'down')} disabled={idx === blocks.length - 1} className="p-1 rounded disabled:opacity-30" style={{ color: 'var(--text-3)' }}>↓</button>
                        <button onClick={() => removeBlock(idx)} className="p-1 rounded" style={{ color: 'var(--red)' }}><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      {block.type === 'section' && (<><input className="input font-semibold text-sm" placeholder="Titlu secțiune..." value={block.title || ''} onChange={(e) => updateBlock(idx, { title: e.target.value })} /><textarea className="textarea text-sm" placeholder="Conținutul secțiunii. Lasă un rând gol între paragrafe..." value={block.text || ''} onChange={(e) => updateBlock(idx, { text: e.target.value })} rows={5} /></>)}
                      {block.type === 'paragraph' && (<textarea className="textarea text-sm" placeholder="Text paragraf..." value={block.text || ''} onChange={(e) => updateBlock(idx, { text: e.target.value })} rows={3} />)}
                      {block.type === 'heading' && (<div className="flex gap-2"><select className="input text-sm" style={{ maxWidth: '70px' }} value={block.level || 2} onChange={(e) => updateBlock(idx, { level: Number(e.target.value) as 2|3 })}><option value={2}>H2</option><option value={3}>H3</option></select><input className="input flex-1 font-bold text-sm" placeholder="Text titlu..." value={block.title || ''} onChange={(e) => updateBlock(idx, { title: e.target.value })} /></div>)}
                      {(block.type === 'bullets' || block.type === 'numbered') && (<><input className="input text-sm" placeholder="Titlu opțional..." value={block.title || ''} onChange={(e) => updateBlock(idx, { title: e.target.value })} /><textarea className="textarea text-sm font-mono" placeholder={'Un element per linie:\nPrimul punct\nAl doilea punct'} value={block.text || ''} onChange={(e) => updateBlock(idx, { text: e.target.value })} rows={4} /><p className="text-[10px]" style={{ color: 'var(--text-4)' }}>Un element per linie</p></>)}
                      {block.type === 'blockquote' && (<><textarea className="textarea text-sm" placeholder={'"Textul citatului juridic..."'} value={block.text || ''} onChange={(e) => updateBlock(idx, { text: e.target.value })} rows={2} /><input className="input text-sm" placeholder="Sursa / Art. XX (opțional)..." value={block.attribution || ''} onChange={(e) => updateBlock(idx, { attribution: e.target.value })} /></>)}
                      {block.type === 'infobox' && (<textarea className="textarea text-sm" placeholder="Notă importantă, atenționare practică sau termen limită..." value={block.text || ''} onChange={(e) => updateBlock(idx, { text: e.target.value })} rows={2} />)}
                      {block.type === 'image' && (<div className="space-y-2"><div className="flex gap-2"><label className="btn-secondary cursor-pointer text-xs flex items-center gap-1.5"><Upload className="w-3 h-3" /> Upload<input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const m = await api.media.upload(file); updateBlock(idx, { src: m.url }); } catch (err: any) { alert(err.message); } }} /></label><input className="input flex-1 text-sm" placeholder="sau URL imaginii..." value={block.src || ''} onChange={(e) => updateBlock(idx, { src: e.target.value })} /></div>{block.src && <img src={block.src} alt="" className="w-full h-40 object-cover rounded-lg" />}<input className="input text-sm" placeholder="Caption (opțional)..." value={block.caption || ''} onChange={(e) => updateBlock(idx, { caption: e.target.value })} /></div>)}
                      {block.type === 'card' && (<><input className="input font-semibold text-sm" placeholder="Titlu card..." value={block.title || ''} onChange={(e) => updateBlock(idx, { title: e.target.value })} /><textarea className="textarea text-sm" placeholder="Conținut card..." value={block.text || ''} onChange={(e) => updateBlock(idx, { text: e.target.value })} rows={3} /></>)}
                      {block.type === 'keypoints' && (<><input className="input text-sm" placeholder="Titlu (ex: Puncte Cheie ale Articolului)..." value={block.title || ''} onChange={(e) => updateBlock(idx, { title: e.target.value })} /><textarea className="textarea text-sm font-mono" placeholder={'Un punct per linie:\nPrimul punct cheie\nAl doilea punct cheie'} value={block.text || ''} onChange={(e) => updateBlock(idx, { text: e.target.value })} rows={4} /><p className="text-[10px]" style={{ color: 'var(--text-4)' }}>Un punct per linie</p></>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-xl p-3" style={{ border: '1px dashed var(--border)' }}>
              <p className="text-xs mb-2.5 text-center" style={{ color: 'var(--text-4)' }}>+ Adaugă block de conținut</p>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5">
                {BLOCK_DEFS.map(({ type, label, icon: Icon }) => (
                  <button key={type} onClick={() => addBlock(type)} className="flex flex-col items-center gap-1 p-2.5 rounded-lg text-xs transition-all" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-3)' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,168,83,0.4)'; (e.currentTarget as HTMLElement).style.background = 'var(--accent-bg)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}>
                    <Icon className="w-4 h-4" /><span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {false && (
          <div className="pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <MoreHorizontal className="w-5 h-5" /> Custom Fields
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>Add extra fields of any type</p>
              </div>
              <button
                onClick={() => setShowAddField(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4" /> Add Field
              </button>
            </div>
            
            {/* Add Field Form */}
            {showAddField && (
              <div className="clay-card p-4 space-y-4 mb-4" style={{ borderColor: 'rgba(212,168,83,0.35)' }}>
                <h4 className="font-medium flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Plus className="w-4 h-4" style={{ color: 'var(--accent)' }} /> New Field
                </h4>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Field Name (machine)</label>
                    <input
                      className="input font-mono text-sm"
                      placeholder="ex: subtitle, price, cta_button"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="label">Field Label (display)</label>
                    <input
                      className="input"
                      placeholder="ex: Subtitle, Price, CTA Button"
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="label">Field Type</label>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    {[
                      { type: 'text', icon: Type, label: 'Text' },
                      { type: 'textarea', icon: AlignLeft, label: 'Long Text' },
                      { type: 'number', icon: Hash, label: 'Number' },
                      { type: 'image', icon: ImageIcon2, label: 'Image' },
                      { type: 'url', icon: Link, label: 'Link' },
                      { type: 'boolean', icon: CheckSquare, label: 'Yes/No' },
                      { type: 'select', icon: List, label: 'Select' },
                      { type: 'multiselect', icon: List, label: 'Multi' },
                      { type: 'date', icon: Calendar, label: 'Date' },
                      { type: 'html', icon: Code, label: 'HTML' },
                      { type: 'markdown', icon: FileText, label: 'MD' },
                      { type: 'json', icon: Globe, label: 'JSON' },
                    ].map(({ type, icon: Icon, label }) => (
                      <button
                        key={type}
                        onClick={() => setNewFieldType(type as FieldType)}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-xs"
                        style={newFieldType === type
                          ? { background: 'var(--accent-bg)', borderColor: 'rgba(212,168,83,0.40)', color: 'var(--accent)' }
                          : { background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text-3)' }
                        }
                      >
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {['select', 'multiselect'].includes(newFieldType) && (
                  <div>
                    <label className="label">Options (comma separated)</label>
                    <input
                      className="input"
                      placeholder="Option 1, Option 2, Option 3"
                      value={newFieldOptions}
                      onChange={(e) => setNewFieldOptions(e.target.value)}
                    />
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button
                    onClick={addCustomField}
                    disabled={!newFieldName.trim() || !newFieldLabel.trim()}
                    className="btn-primary"
                  >
                    <Plus className="w-4 h-4" /> Create Field
                  </button>
                  <button
                    onClick={() => {
                      setShowAddField(false);
                      setNewFieldName('');
                      setNewFieldLabel('');
                      setNewFieldType('text');
                      setNewFieldOptions('');
                    }}
                    className="btn-secondary"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </button>
                </div>
              </div>
            )}
            
            {/* Existing Fields */}
            {customFieldsUI.length === 0 ? (
              <div className="text-center py-8 rounded-xl border-dashed" style={{ border: '1px dashed var(--border)', color: 'var(--text-4)' }}>
                <MoreHorizontal className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No custom fields yet</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>Click "Add Field" to add extra content fields</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customFieldsUI.map((field, index) => (
                  <div key={index} className="clay-card p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col gap-1 pt-1">
                        <button
                          onClick={() => moveCustomField(index, 'up')}
                          disabled={index === 0}
                          className="p-1 rounded disabled:opacity-30"
                          style={{ color: 'var(--text-4)' }}
                        >
                          <GripVertical className="w-3 h-3" />
                        </button>
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>{field.label}</label>
                            <p className="text-[10px]" style={{ color: 'var(--text-4)' }}>{field.name} • {field.type}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => moveCustomField(index, 'up')}
                              disabled={index === 0}
                              className="p-1 rounded disabled:opacity-30 transition-colors"
                              style={{ color: 'var(--text-3)' }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveCustomField(index, 'down')}
                              disabled={index === customFieldsUI.length - 1}
                              className="p-1 rounded disabled:opacity-30 transition-colors"
                              style={{ color: 'var(--text-3)' }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => removeCustomField(index)}
                              className="p-1 rounded transition-colors"
                              style={{ color: 'var(--red)' }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Field Input */}
                        {field.type === 'text' && (
                          <input
                            className="input text-sm"
                            value={field.value}
                            onChange={(e) => updateCustomField(index, { value: e.target.value })}
                            placeholder={`Enter ${field.label.toLowerCase()}...`}
                          />
                        )}
                        
                        {field.type === 'textarea' && (
                          <textarea
                            className="textarea text-sm"
                            value={field.value}
                            onChange={(e) => updateCustomField(index, { value: e.target.value })}
                            placeholder={`Enter ${field.label.toLowerCase()}...`}
                            rows={3}
                          />
                        )}
                        
                        {field.type === 'number' && (
                          <input
                            type="number"
                            className="input text-sm"
                            value={field.value ?? ''}
                            onChange={(e) => updateCustomField(index, { value: e.target.value === '' ? null : parseFloat(e.target.value) })}
                            placeholder="0"
                          />
                        )}
                        
                        {field.type === 'image' && (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <label className="btn-secondary cursor-pointer text-xs">
                                <Upload className="w-3 h-3" />
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    try {
                                      const media = await api.media.upload(file);
                                      updateCustomField(index, { value: media.url });
                                    } catch (err: any) {
                                      alert('Upload failed: ' + err.message);
                                    }
                                  }}
                                />
                              </label>
                              <input
                                className="input flex-1 text-sm"
                                value={field.value}
                                onChange={(e) => updateCustomField(index, { value: e.target.value })}
                                placeholder="or paste URL..."
                              />
                            </div>
                            {field.value && (
                              <img src={field.value} alt="" className="w-full h-20 object-cover rounded" />
                            )}
                          </div>
                        )}
                        
                        {field.type === 'url' && (
                          <input
                            type="url"
                            className="input text-sm"
                            value={field.value}
                            onChange={(e) => updateCustomField(index, { value: e.target.value })}
                            placeholder="https://..."
                          />
                        )}
                        
                        {field.type === 'boolean' && (
                          <button
                            onClick={() => updateCustomField(index, { value: !field.value })}
                            className="flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-all"
                            style={field.value
                              ? { background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)' }
                              : { background: 'var(--surface2)', color: 'var(--text-3)', border: '1px solid var(--border)' }
                            }
                          >
                            <CheckSquare className="w-4 h-4" style={field.value ? { fill: 'var(--green)', color: 'var(--green)' } : {}} />
                            {field.value ? 'Yes' : 'No'}
                          </button>
                        )}
                        
                        {field.type === 'select' && field.options && (
                          <select
                            className="input text-sm"
                            value={field.value}
                            onChange={(e) => updateCustomField(index, { value: e.target.value })}
                          >
                            <option value="">-- Select --</option>
                            {field.options.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                        
                        {field.type === 'multiselect' && field.options && (
                          <div className="flex flex-wrap gap-1">
                            {field.options.map(opt => (
                              <button
                                key={opt}
                                onClick={() => {
                                  const current = field.value || [];
                                  const updated = current.includes(opt)
                                    ? current.filter((v: string) => v !== opt)
                                    : [...current, opt];
                                  updateCustomField(index, { value: updated });
                                }}
                                className="px-2 py-1 rounded text-xs transition-all"
                                style={(field.value || []).includes(opt)
                                  ? { background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid rgba(212,168,83,0.35)' }
                                  : { background: 'var(--surface2)', color: 'var(--text-3)', border: '1px solid var(--border)' }
                                }
                              >
                                {(field.value || []).includes(opt) ? '✓ ' : ''}{opt}
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {field.type === 'date' && (
                          <input
                            type="date"
                            className="input text-sm"
                            value={field.value}
                            onChange={(e) => updateCustomField(index, { value: e.target.value })}
                          />
                        )}
                        
                        {field.type === 'html' && (
                          <textarea
                            className="textarea font-mono text-xs"
                            value={field.value}
                            onChange={(e) => updateCustomField(index, { value: e.target.value })}
                            placeholder="<p>HTML...</p>"
                            rows={4}
                          />
                        )}
                        
                        {field.type === 'markdown' && (
                          <textarea
                            className="textarea font-mono text-xs"
                            value={field.value}
                            onChange={(e) => updateCustomField(index, { value: e.target.value })}
                            placeholder="# Markdown..."
                            rows={4}
                          />
                        )}
                        
                        {field.type === 'json' && (
                          <textarea
                            className="textarea font-mono text-xs"
                            value={typeof field.value === 'object' ? JSON.stringify(field.value, null, 2) : field.value}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                updateCustomField(index, { value: parsed });
                              } catch {
                                updateCustomField(index, { value: e.target.value });
                              }
                            }}
                            placeholder='{"key": "value"}'
                            rows={4}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </div>
      )}
      
      {tab === 'metadata' && (
        <div className="space-y-6">
          {/* Category & Author with Create Buttons */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="label flex items-center gap-2">
                <Folder className="w-4 h-4" /> Category
              </label>
              {categories && categories.length > 0 ? (
                <select
                  className="input w-full"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">-- Select Category --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              ) : (
                <div className="text-sm mb-2" style={{ color: 'var(--text-3)' }}>No categories yet. Create one:</div>
              )}
              
              {/* Create Category Inline */}
              <div className="mt-2 p-3 rounded-lg" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Create New Category</span>
                </div>
                <div className="flex gap-2">
                  <input
                    className="input flex-1 text-sm"
                    placeholder="Category name..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createCategoryMut.mutate(newCategoryName)}
                  />
                  <button
                    onClick={() => createCategoryMut.mutate(newCategoryName)}
                    disabled={!newCategoryName.trim() || createCategoryMut.isPending}
                    className="btn-primary !py-1.5 !px-3 text-sm"
                  >
                    {createCategoryMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Author */}
            <div>
              <label className="label flex items-center gap-2">
                <User className="w-4 h-4" /> Author
              </label>
              {authors && authors.length > 0 ? (
                <select
                  className="input w-full"
                  value={authorId}
                  onChange={(e) => setAuthorId(e.target.value)}
                >
                  <option value="">-- Select Author --</option>
                  {authors.map(author => (
                    <option key={author.id} value={author.id}>{author.name}</option>
                  ))}
                </select>
              ) : (
                <div className="text-sm mb-2" style={{ color: 'var(--text-3)' }}>No authors yet. Create one:</div>
              )}
              
              {/* Create Author Inline */}
              <div className="mt-2 p-3 rounded-lg" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Create New Author</span>
                </div>
                <div className="flex gap-2">
                  <input
                    className="input flex-1 text-sm"
                    placeholder="Author name..."
                    value={newAuthorName}
                    onChange={(e) => setNewAuthorName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createAuthorMut.mutate(newAuthorName)}
                  />
                  <button
                    onClick={() => createAuthorMut.mutate(newAuthorName)}
                    disabled={!newAuthorName.trim() || createAuthorMut.isPending}
                    className="btn-primary !py-1.5 !px-3 text-sm"
                  >
                    {createAuthorMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Read Time & Featured */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label flex items-center gap-2">
                <Clock className="w-4 h-4" /> Read Time (minutes)
              </label>
              <input
                type="number"
                min={1}
                max={120}
                className="input"
                value={readTime}
                onChange={(e) => setReadTime(parseInt(e.target.value) || 5)}
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => setIsFeatured(!isFeatured)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                style={isFeatured
                  ? { background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid rgba(212,168,83,0.35)' }
                  : { background: 'var(--surface2)', color: 'var(--text-3)', border: '1px solid var(--border)' }
                }
              >
                <Star className="w-4 h-4" style={isFeatured ? { fill: 'var(--accent)', color: 'var(--accent)' } : { color: 'var(--text-3)' }} />
                {isFeatured ? 'Featured Post' : 'Mark as Featured'}
              </button>
            </div>
          </div>
          
          {/* Key Points / Bullets */}
          <div>
            <label className="label">Key Points / Bullets</label>
            <div className="space-y-2">
              {bullets.map((bullet, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="flex-1 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--surface2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>• {bullet}</span>
                  <button
                    onClick={() => removeBullet(index)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--red)' }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Add a key point..."
                  value={newBullet}
                  onChange={(e) => setNewBullet(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addBullet()}
                />
                <button
                  onClick={addBullet}
                  disabled={!newBullet.trim()}
                  className="btn-secondary !px-3"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Tags */}
          <div>
            <label className="label flex items-center gap-2">
              <Tag className="w-4 h-4" /> Tags
            </label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                    style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid rgba(212,168,83,0.30)' }}
                  >
                    #{tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 transition-colors" style={{ color: 'var(--accent)' }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Add a tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                />
                <button
                  onClick={addTag}
                  disabled={!newTag.trim()}
                  className="btn-secondary !px-3"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Tab */}
      {tab === 'sections' && (
        <div className="space-y-3">
          {blocks.length === 0 && !leadParagraph ? (
            <div className="clay-card p-8 text-center">
              <Eye className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--text-4)' }} />
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>Niciun conținut adăugat</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>Adaugă blocuri în tab-ul Content pentru a vedea previzualizarea</p>
            </div>
          ) : (
            <>
              {blocks.filter(b => b.type === 'section' && b.title).length > 1 && (
                <div className="clay-card p-4" style={{ borderLeft: '3px solid var(--accent)' }}>
                  <p className="text-xs font-bold mb-2" style={{ color: 'var(--accent)' }}>Cuprins</p>
                  <ol className="space-y-1">
                    {blocks.filter(b => b.type === 'section' && b.title).map((b, i) => (
                      <li key={i} className="text-xs flex gap-1.5">
                        <span style={{ color: 'var(--accent)' }}>{i + 1}.</span>
                        <span style={{ color: 'var(--text-3)' }}>{b.title}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {leadParagraph && (
                <div className="clay-card p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded mb-2 inline-block" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>Intro</span>
                  <p className="text-sm italic" style={{ color: 'var(--text-2)' }}>{leadParagraph}</p>
                </div>
              )}
              {blocks.map((block, idx) => (
                <div key={block.id} className="clay-card overflow-hidden" style={!block.visible ? { opacity: 0.4 } : {}}>
                  <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>{BLOCK_LABELS[block.type]}</span>
                    {block.title && block.type !== 'keypoints' && <span className="text-xs truncate flex-1" style={{ color: 'var(--text-3)' }}>{block.title}</span>}
                    <button onClick={() => toggleBlockVisible(idx)} className="ml-auto p-1 rounded" title={block.visible ? 'Ascunde' : 'Arată'} style={{ color: block.visible ? 'var(--accent)' : 'var(--text-4)' }}>
                      {block.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="p-3">
                    {block.type === 'section' && (<>{block.title && <p className="text-sm font-bold mb-1" style={{ color: 'var(--text)' }}>{block.title}</p>}<p className="text-sm whitespace-pre-line line-clamp-3" style={{ color: 'var(--text-3)' }}>{block.text}</p></>)}
                    {block.type === 'paragraph' && <p className="text-sm whitespace-pre-line line-clamp-3" style={{ color: 'var(--text-3)' }}>{block.text}</p>}
                    {block.type === 'heading' && <p className={`font-bold ${block.level === 3 ? 'text-sm' : 'text-base'}`} style={{ color: 'var(--text)' }}>{block.title} <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-4)' }}>H{block.level || 2}</span></p>}
                    {(block.type === 'bullets' || block.type === 'numbered') && (<ul className="text-sm space-y-0.5" style={{ color: 'var(--text-3)', paddingLeft: '1em', listStyle: block.type === 'bullets' ? 'disc' : 'decimal' }}>{(block.text || '').split('\n').filter(Boolean).slice(0, 4).map((it, i) => <li key={i}>{it}</li>)}</ul>)}
                    {block.type === 'blockquote' && (<blockquote className="text-sm italic border-l-2 pl-3" style={{ borderColor: 'var(--accent)', color: 'var(--text-2)' }}>{block.text}{block.attribution && <footer className="text-xs mt-1 not-italic" style={{ color: 'var(--text-4)' }}>— {block.attribution}</footer>}</blockquote>)}
                    {block.type === 'infobox' && (<div className="text-sm rounded-lg p-2" style={{ background: 'rgba(59,130,246,0.08)', color: 'var(--text-2)' }}>{block.text}</div>)}
                    {block.type === 'image' && block.src && (<img src={block.src} alt={block.caption || ''} className="w-full h-32 object-cover rounded-lg" />)}
                    {block.type === 'card' && (<div className="rounded-lg p-2" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>{block.title && <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{block.title}</p>}<p className="text-xs line-clamp-2 mt-0.5" style={{ color: 'var(--text-3)' }}>{block.text}</p></div>)}
                    {block.type === 'keypoints' && (<div className="rounded-lg p-2" style={{ background: 'var(--accent-bg)' }}>{block.title && <p className="text-xs font-bold mb-1" style={{ color: 'var(--text)' }}>{block.title}</p>}<ul style={{ color: 'var(--text-2)', paddingLeft: '1em', listStyle: 'disc' }} className="text-xs space-y-0.5">{(block.text || '').split('\n').filter(Boolean).slice(0, 3).map((it, i) => <li key={i}>{it}</li>)}</ul></div>)}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {tab === 'seo' && (
        <div className="clay-card p-6 space-y-4">
          <div>
            <label className="label">SEO Title</label>
            <input
              className="input"
              placeholder={title || 'SEO page title...'}
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-4)' }}>{metaTitle.length}/60 characters recommended</p>
          </div>
          <div>
            <label className="label">SEO Description</label>
            <textarea
              className="textarea"
              placeholder="Brief description for search engines..."
              value={metaDesc}
              onChange={(e) => setMetaDesc(e.target.value)}
              rows={3}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-4)' }}>{metaDesc.length}/160 characters recommended</p>
          </div>

          {/* Preview */}
          <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>Google Preview</p>
            <div className="text-sm font-medium" style={{ color: '#1a0dab' }}>{metaTitle || title || 'Post Title'}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--green)' }}>yoursite.com &rsaquo; blog</div>
            <div className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-2)' }}>
              {metaDesc || excerpt || 'Post description will appear here...'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
