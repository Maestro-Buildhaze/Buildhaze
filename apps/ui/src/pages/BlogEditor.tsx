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
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
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
  
  const [tab, setTab] = useState<'content' | 'metadata' | 'seo'>('content');
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
      setCustomFields(Array.isArray(cf) ? cf : []);
    }
  }, [existing]);

  const saveMut = useMutation({
    mutationFn: () => {
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
        customFields,
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
    
    setCustomFields([...customFields, field]);
    setNewFieldName('');
    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldOptions('');
    setShowAddField(false);
  };
  
  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };
  
  const updateCustomField = (index: number, updates: Partial<CustomField>) => {
    const updated = [...customFields];
    updated[index] = { ...updated[index], ...updates };
    setCustomFields(updated);
  };
  
  const moveCustomField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const updated = [...customFields];
      [updated[index], updated[index - 1]] = [updated[index - 1], updated[index]];
      setCustomFields(updated);
    } else if (direction === 'down' && index < customFields.length - 1) {
      const updated = [...customFields];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      setCustomFields(updated);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/blog')} className="btn-secondary !px-2.5">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{isNew ? 'New Post' : 'Edit Post'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPublished((v) => !v)}
            className={clsx(
              'btn-secondary !py-1.5 text-xs gap-1.5',
              isPublished && '!bg-emerald-500/15 !text-emerald-300 !border-emerald-500/25',
            )}
          >
            {isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {isPublished ? 'Published' : 'Draft'}
          </button>
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || !title || !content}
            className={clsx('btn-primary', saved && '!bg-emerald-500/20 !text-emerald-300')}
          >
            {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : saveMut.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] w-fit">
        {(['content', 'metadata', 'seo'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize',
              tab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70',
            )}
          >
            {t === 'content' ? `Content${customFields.length > 0 ? ' • ' + customFields.length + ' fields' : ''}` : t === 'metadata' ? 'Metadata' : 'SEO'}
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
            <p className="text-[11px] text-white/25 mt-1">
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
              <span className="text-white/30 self-center">or paste URL</span>
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
                <img src={coverImage} alt="Cover preview" className="w-full h-48 object-cover rounded-xl border border-white/[0.07]" />
                <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-xs text-white/80">
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
            <p className="text-[11px] text-white/25 mt-1">{excerpt.length}/300 characters recommended</p>
          </div>

          {/* Content */}
          <div>
            <label className="label">Content *</label>
            <textarea
              className="textarea font-mono text-sm"
              placeholder="Write your post content here. HTML is supported."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              style={{ minHeight: '400px' }}
            />
            <p className="text-[11px] text-white/25 mt-1.5">
              HTML supported &middot; {content.length} characters
            </p>
          </div>

          {/* Custom Fields Section */}
          <div className="pt-6 border-t border-white/[0.07]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MoreHorizontal className="w-5 h-5" /> Custom Fields
                </h3>
                <p className="text-sm text-white/50">Add extra fields of any type</p>
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
              <div className="glass-card p-4 space-y-4 border-amber-500/30 mb-4">
                <h4 className="font-medium text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-500" /> New Field
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
                        className={clsx(
                          'flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-xs',
                          newFieldType === type
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                        )}
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
            {customFields.length === 0 ? (
              <div className="text-center py-8 text-white/40 border border-white/10 rounded-xl border-dashed">
                <MoreHorizontal className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No custom fields yet</p>
                <p className="text-xs mt-1">Click "Add Field" to add extra content fields</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customFields.map((field, index) => (
                  <div key={index} className="glass-card p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col gap-1 pt-1">
                        <button
                          onClick={() => moveCustomField(index, 'up')}
                          disabled={index === 0}
                          className="p-1 rounded hover:bg-white/10 disabled:opacity-30"
                        >
                          <GripVertical className="w-3 h-3 text-white/40" />
                        </button>
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-white">{field.label}</label>
                            <p className="text-[10px] text-white/40">{field.name} • {field.type}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => moveCustomField(index, 'up')}
                              disabled={index === 0}
                              className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveCustomField(index, 'down')}
                              disabled={index === customFields.length - 1}
                              className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30"
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => removeCustomField(index)}
                              className="p-1 rounded text-red-400 hover:bg-red-500/10"
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
                            className={clsx(
                              'flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-all',
                              field.value
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-white/5 text-white/60 border border-white/10'
                            )}
                          >
                            <CheckSquare className={clsx('w-4 h-4', field.value && 'fill-emerald-400')} />
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
                                className={clsx(
                                  'px-2 py-1 rounded text-xs transition-all',
                                  (field.value || []).includes(opt)
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-white/5 text-white/60 border border-white/10'
                                )}
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
                <div className="text-sm text-white/50 mb-2">No categories yet. Create one:</div>
              )}
              
              {/* Create Category Inline */}
              <div className="mt-2 p-3 bg-white/[0.03] rounded-lg border border-white/[0.07]">
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="w-3 h-3 text-amber-500" />
                  <span className="text-xs font-medium text-white/70">Create New Category</span>
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
                <div className="text-sm text-white/50 mb-2">No authors yet. Create one:</div>
              )}
              
              {/* Create Author Inline */}
              <div className="mt-2 p-3 bg-white/[0.03] rounded-lg border border-white/[0.07]">
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="w-3 h-3 text-amber-500" />
                  <span className="text-xs font-medium text-white/70">Create New Author</span>
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
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                  isFeatured
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                )}
              >
                <Star className={clsx('w-4 h-4', isFeatured && 'fill-purple-400')} />
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
                  <span className="flex-1 px-3 py-2 rounded-lg bg-white/5 text-sm">• {bullet}</span>
                  <button
                    onClick={() => removeBullet(index)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10"
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
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-amber-500/20 text-amber-300"
                  >
                    #{tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-white"
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

      {tab === 'seo' && (
        <div className="glass-card p-6 space-y-4">
          <div>
            <label className="label">SEO Title</label>
            <input
              className="input"
              placeholder={title || 'SEO page title...'}
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
            />
            <p className="text-[11px] text-white/25 mt-1">{metaTitle.length}/60 characters recommended</p>
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
            <p className="text-[11px] text-white/25 mt-1">{metaDesc.length}/160 characters recommended</p>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Google Preview</p>
            <div className="text-[#8ab4f8] text-sm font-medium">{metaTitle || title || 'Post Title'}</div>
            <div className="text-[#3c4043] text-[11px] mt-0.5">yoursite.com &rsaquo; blog</div>
            <div className="text-[#bdc1c6] text-xs mt-1 leading-relaxed">
              {metaDesc || excerpt || 'Post description will appear here...'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
