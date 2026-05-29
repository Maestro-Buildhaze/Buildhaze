import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText, Plus, Trash2, Edit2, Eye, EyeOff, Loader2,
  Sparkles, X, ChevronDown, Zap, Clock,
} from 'lucide-react';
import { api } from '../lib/api';
import clsx from 'clsx';

interface AiForm {
  topic: string;
  tone: string;
  keywords: string;
}

export function BlogList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiForm, setAiForm] = useState<AiForm>({
    topic: searchParams.get('topic') ?? '',
    tone: 'professional',
    keywords: '',
  });
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiError, setAiError] = useState('');

  const { data: posts, isLoading } = useQuery({ queryKey: ['blog'], queryFn: api.blog.list });

  const deleteMut = useMutation({
    mutationFn: api.blog.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blog'] }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      api.blog.update(id, { isPublished }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blog'] }),
  });

  const generateMut = useMutation({
    mutationFn: () => api.ai.generateBlog({
      topic: aiForm.topic,
      tone: aiForm.tone,
      keywords: aiForm.keywords,
    }),
    onSuccess: (data) => setAiResult(data.blog),
    onError: (err: any) => setAiError(err.message ?? 'Failed to generate blog post'),
  });

  const createFromAiMut = useMutation({
    mutationFn: () => api.blog.create({
      title: aiResult.title,
      content: aiResult.content,
      excerpt: aiResult.excerpt,
      metaTitle: aiResult.metaTitle,
      metaDesc: aiResult.metaDesc,
      isPublished: false,
    }),
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      setShowAiModal(false);
      setAiResult(null);
      navigate(`/blog/${post.id}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-3)' }} />
      </div>
    );
  }

  const publishedCount = posts?.filter(p => p.isPublished).length ?? 0;
  const draftCount = (posts?.length ?? 0) - publishedCount;

  return (
    <div className="animate-fade-in space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Blog Posts</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
            {posts?.length ?? 0} posts · <span style={{ color: 'var(--green)' }}>{publishedCount} published</span>
            {draftCount > 0 && <> · {draftCount} drafts</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowAiModal(true); setAiResult(null); setAiError(''); }}
            className="btn-secondary !gap-1.5"
          >
            <Sparkles className="w-4 h-4" style={{ color: 'var(--purple)' }} />
            AI Generate
          </button>
          <Link to="/blog/new" className="btn-primary">
            <Plus className="w-4 h-4" /> New Post
          </Link>
        </div>
      </div>

      {/* ── Post list or empty ── */}
      {!posts || posts.length === 0 ? (
        <div className="rounded-2xl p-16 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--surface2)' }}>
            <FileText className="w-6 h-6" style={{ color: 'var(--text-3)' }} strokeWidth={1.5} />
          </div>
          <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>No blog posts yet. Start writing!</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowAiModal(true)}
              className="btn-secondary !gap-1.5"
            >
              <Sparkles className="w-4 h-4" style={{ color: 'var(--purple)' }} /> Generate with AI
            </button>
            <Link to="/blog/new" className="btn-primary">
              <Plus className="w-4 h-4" /> Write First Post
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map(post => (
            <div
              key={post.id}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl group transition-all duration-150"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {/* Status dot */}
              <div className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: post.isPublished ? 'var(--green)' : 'var(--border-strong)' }} />

              {/* Cover */}
              {post.coverImage ? (
                <img src={post.coverImage} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--surface2)' }}>
                  <FileText className="w-5 h-5" style={{ color: 'var(--text-3)' }} strokeWidth={1.5} />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{post.title}</div>
                <div className="text-xs mt-0.5 flex items-center gap-3" style={{ color: 'var(--text-3)' }}>
                  {post.isPublished ? (
                    <span style={{ color: 'var(--green)' }}>Published · {new Date(post.publishedAt!).toLocaleDateString()}</span>
                  ) : (
                    <span>Draft · Edited {new Date(post.updatedAt).toLocaleDateString()}</span>
                  )}
                  {(post as any).readTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {(post as any).readTime}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => toggleMut.mutate({ id: post.id, isPublished: !post.isPublished })}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--text-3)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
                  title={post.isPublished ? 'Unpublish' : 'Publish'}
                >
                  {post.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <Link
                  to={`/blog/${post.id}`}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--text-3)' }}
                >
                  <Edit2 className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => { if (confirm('Delete this post?')) deleteMut.mutate(post.id); }}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--text-3)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── AI GENERATE MODAL ── */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAiModal(false); }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" style={{ color: 'var(--purple)' }} strokeWidth={1.75} />
                <span className="font-semibold" style={{ color: 'var(--text)' }}>AI Blog Generator</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--purple-bg)', color: 'var(--purple)' }}>BETA</span>
              </div>
              <button onClick={() => setShowAiModal(false)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-3)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!aiResult ? (
                <>
                  {/* Topic */}
                  <div>
                    <label className="label">Blog Topic *</label>
                    <input
                      className="input"
                      placeholder="e.g. 5 Tips to Win More Clients for Lawyers"
                      value={aiForm.topic}
                      onChange={e => setAiForm(f => ({ ...f, topic: e.target.value }))}
                    />
                  </div>

                  {/* Tone */}
                  <div>
                    <label className="label">Tone</label>
                    <div className="relative">
                      <select
                        className="input appearance-none pr-8"
                        value={aiForm.tone}
                        onChange={e => setAiForm(f => ({ ...f, tone: e.target.value }))}
                      >
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly & Approachable</option>
                        <option value="authoritative">Authoritative</option>
                        <option value="conversational">Conversational</option>
                        <option value="educational">Educational</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                        style={{ color: 'var(--text-3)' }} />
                    </div>
                  </div>

                  {/* Keywords */}
                  <div>
                    <label className="label">SEO Keywords <span style={{ color: 'var(--text-3)' }}>(optional, comma separated)</span></label>
                    <input
                      className="input"
                      placeholder="e.g. personal injury lawyer, legal advice, lawsuit"
                      value={aiForm.keywords}
                      onChange={e => setAiForm(f => ({ ...f, keywords: e.target.value }))}
                    />
                  </div>

                  {aiError && (
                    <p className="text-sm" style={{ color: 'var(--red)' }}>{aiError}</p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setShowAiModal(false)} className="btn-secondary flex-1">Cancel</button>
                    <button
                      onClick={() => { setAiError(''); generateMut.mutate(); }}
                      disabled={!aiForm.topic.trim() || generateMut.isPending}
                      className="btn-primary flex-1"
                    >
                      {generateMut.isPending
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                        : <><Zap className="w-4 h-4" /> Generate Post</>}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Preview result */}
                  <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Generated Title</div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{aiResult.title}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Excerpt</div>
                      <div className="text-xs" style={{ color: 'var(--text-2)' }}>{aiResult.excerpt}</div>
                    </div>
                    {aiResult.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {aiResult.tags.map((tag: string) => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {aiResult.readTime && (
                      <div className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
                        <Clock className="w-3 h-3" /> {aiResult.readTime}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => { setAiResult(null); setAiError(''); }} className="btn-secondary flex-1">
                      ← Try Again
                    </button>
                    <button
                      onClick={() => createFromAiMut.mutate()}
                      disabled={createFromAiMut.isPending}
                      className="btn-primary flex-1"
                    >
                      {createFromAiMut.isPending
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                        : '✓ Create & Edit Post'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
