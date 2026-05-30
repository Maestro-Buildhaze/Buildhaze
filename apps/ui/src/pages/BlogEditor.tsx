import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Eye, EyeOff, Loader2, Image as ImageIcon, X,
  Plus, Trash2, Tag, Clock, Star, User, Folder,
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
            {t === 'content' ? 'Content' : t === 'metadata' ? 'Metadata' : 'SEO'}
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

          {/* Cover Image */}
          <div>
            <label className="label">Cover Image URL</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="https://..."
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
              />
              {coverImage && (
                <button onClick={() => setCoverImage('')} className="btn-secondary !px-2.5">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {coverImage && (
              <img src={coverImage} alt="Cover preview" className="mt-2 w-full h-48 object-cover rounded-xl border border-white/[0.07]" />
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
        </div>
      )}
      
      {tab === 'metadata' && (
        <div className="space-y-6">
          {/* Category & Author */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label flex items-center gap-2">
                <Folder className="w-4 h-4" /> Category
              </label>
              <select
                className="input w-full"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">-- Select Category --</option>
                {categories?.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="label flex items-center gap-2">
                <User className="w-4 h-4" /> Author
              </label>
              <select
                className="input w-full"
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
              >
                <option value="">-- Select Author --</option>
                {authors?.map(author => (
                  <option key={author.id} value={author.id}>{author.name}</option>
                ))}
              </select>
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
