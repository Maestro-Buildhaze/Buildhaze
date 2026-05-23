import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Eye, EyeOff, Loader2, Image as ImageIcon, X,
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

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDesc, setMetaDesc] = useState('');
  const [tab, setTab] = useState<'write' | 'seo'>('write');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setContent(existing.content);
      setExcerpt(existing.excerpt ?? '');
      setCoverImage(existing.coverImage ?? '');
      setIsPublished(existing.isPublished);
      setMetaTitle(existing.metaTitle ?? '');
      setMetaDesc(existing.metaDesc ?? '');
    }
  }, [existing]);

  const saveMut = useMutation({
    mutationFn: () => {
      const data = { title, content, excerpt, coverImage: coverImage || null, isPublished, metaTitle, metaDesc };
      return isNew ? api.blog.create(data) : api.blog.update(id!, data);
    },
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      if (isNew) navigate(`/blog/${post.id}`, { replace: true });
    },
  });

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
        {(['write', 'seo'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize',
              tab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70',
            )}
          >
            {t === 'write' ? 'Write' : 'SEO & Meta'}
          </button>
        ))}
      </div>

      {tab === 'write' && (
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="label">Post Title</label>
            <input
              className="input text-lg font-semibold"
              placeholder="Enter a captivating title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
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
            <label className="label">Excerpt (optional)</label>
            <textarea
              className="textarea"
              placeholder="Short summary shown in blog listings..."
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
            />
          </div>

          {/* Content */}
          <div>
            <label className="label">Content</label>
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
