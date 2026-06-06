import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText, Plus, Trash2, Edit2, Eye, EyeOff, Loader2,
  Sparkles, X, ChevronDown, Zap, Clock, Filter, CheckSquare, Square,
  Tag, User, Star, Download, Search, BookOpen, BarChart2, TrendingUp,
} from 'lucide-react';
import { api } from '../lib/api';
import { AiCreditsWidget } from '../components/AiCreditsWidget';
import clsx from 'clsx';

interface AiForm {
  topic: string;
  description: string;
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
    description: '',
    tone: 'professional',
    keywords: '',
  });
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiError, setAiError] = useState('');
  
  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());

  const { data: posts, isLoading } = useQuery({ 
    queryKey: ['blog', filterCategory, filterStatus, filterSearch], 
    queryFn: () => api.blog.list({ 
      category: filterCategory || undefined, 
      status: filterStatus || undefined,
      search: filterSearch || undefined,
    }) 
  });
  
  const { data: categories } = useQuery({ 
    queryKey: ['blog-categories'], 
    queryFn: () => api.blog.categories.list() 
  });
  
  const { data: stats } = useQuery({ 
    queryKey: ['blog-stats'], 
    queryFn: () => api.blog.stats() 
  });

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
      description: aiForm.description,
      tone: aiForm.tone,
      keywords: aiForm.keywords,
    }),
    onSuccess: (data) => setAiResult(data.blog),
    onError: (err: any) => setAiError(err.message ?? 'Failed to generate blog post'),
  });

  const createFromAiMut = useMutation({
    mutationFn: () => api.blog.create({
      title: aiResult.title,
      content: aiResult.content ?? '',
      excerpt: aiResult.excerpt,
      metaTitle: aiResult.metaTitle,
      metaDesc: aiResult.metaDesc,
      tags: aiResult.tags ?? [],
      isPublished: false,
      customFields: {
        ...(aiResult.blocks?.length ? { blocks: aiResult.blocks } : {}),
        ...(aiResult.leadParagraph ? { leadParagraph: aiResult.leadParagraph } : {}),
      },
    }),
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      setShowAiModal(false);
      setAiResult(null);
      navigate(`/blog/${post.id}`);
    },
  });
  
  // Bulk operations
  const bulkPublishMut = useMutation({
    mutationFn: () => api.blog.bulkPublish(Array.from(selectedPosts)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      setSelectedPosts(new Set());
    },
  });
  
  const bulkUnpublishMut = useMutation({
    mutationFn: () => api.blog.bulkUnpublish(Array.from(selectedPosts)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      setSelectedPosts(new Set());
    },
  });
  
  const bulkDeleteMut = useMutation({
    mutationFn: () => api.blog.bulkDelete(Array.from(selectedPosts)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      setSelectedPosts(new Set());
    },
  });
  
  const importFromTemplateMut = useMutation({
    mutationFn: () => api.blog.importFromTemplate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      queryClient.invalidateQueries({ queryKey: ['blog-stats'] });
      queryClient.invalidateQueries({ queryKey: ['blog-categories'] });
    },
  });
  
  const togglePostSelection = (id: string) => {
    const newSet = new Set(selectedPosts);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedPosts(newSet);
  };
  
  const selectAll = () => {
    if (selectedPosts.size === (posts?.length ?? 0)) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(posts?.map(p => p.id) ?? []));
    }
  };

  const publishedCount = posts?.filter(p => p.isPublished).length ?? 0;
  const draftCount = (posts?.length ?? 0) - publishedCount;
  const hasActiveFilters = !!(filterCategory || filterStatus || filterSearch);

  /* ── Skeleton loader ── */
  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-4">
        {/* skeleton header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-40 rounded-lg animate-pulse" style={{ background: 'var(--surface2)' }} />
            <div className="h-4 w-56 rounded-lg animate-pulse" style={{ background: 'var(--surface2)' }} />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 rounded-xl animate-pulse" style={{ background: 'var(--surface2)' }} />
            <div className="h-9 w-28 rounded-xl animate-pulse" style={{ background: 'var(--surface2)' }} />
          </div>
        </div>
        {/* skeleton stat row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-[68px] rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
        {/* skeleton rows */}
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-[76px] rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">

      {/* ═══════════════════════════════════
          HEADER BAR
      ═══════════════════════════════════ */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            Blog Posts
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            {posts?.length ?? 0} total
            {publishedCount > 0 && (
              <> · <span style={{ color: 'var(--green)' }}>{publishedCount} live</span></>
            )}
            {draftCount > 0 && (
              <> · <span style={{ color: 'var(--yellow)' }}>{draftCount} draft{draftCount !== 1 ? 's' : ''}</span></>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <AiCreditsWidget compact />
          {(posts?.length === 0 || posts === undefined) && (
            <button
              onClick={() => importFromTemplateMut.mutate()}
              disabled={importFromTemplateMut.isPending}
              className="btn-secondary !gap-1.5"
            >
              {importFromTemplateMut.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
              Import Template
            </button>
          )}
          <button
            onClick={() => { setShowAiModal(true); setAiResult(null); setAiError(''); }}
            className="btn-secondary !gap-1.5"
          >
            <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            AI Generate
          </button>
          <Link to="/blog/new" className="btn-primary">
            <Plus className="w-4 h-4" /> New Post
          </Link>
        </div>
      </div>

      {/* ═══════════════════════════════════
          STATS RIBBON
      ═══════════════════════════════════ */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            {
              icon: <BookOpen className="w-4 h-4" />,
              value: stats.totalPosts,
              label: 'Total Posts',
              color: 'var(--text)',
              bg: 'var(--surface)',
              border: 'var(--border)',
            },
            {
              icon: <Eye className="w-4 h-4" />,
              value: stats.publishedPosts,
              label: 'Published',
              color: 'var(--green)',
              bg: 'rgba(34,197,94,0.08)',
              border: 'rgba(34,197,94,0.25)',
            },
            {
              icon: <Edit2 className="w-4 h-4" />,
              value: stats.draftPosts,
              label: 'Drafts',
              color: 'var(--yellow)',
              bg: 'rgba(245,158,11,0.08)',
              border: 'rgba(245,158,11,0.25)',
            },
            {
              icon: <Tag className="w-4 h-4" />,
              value: stats.totalCategories,
              label: 'Categories',
              color: 'var(--text)',
              bg: 'var(--surface)',
              border: 'var(--border)',
            },
            {
              icon: <Star className="w-4 h-4" />,
              value: stats.featuredPosts,
              label: 'Featured',
              color: 'var(--accent)',
              bg: 'var(--accent-bg)',
              border: 'rgba(212,168,83,0.30)',
            },
          ].map(s => (
            <div
              key={s.label}
              className="clay-card px-4 py-3 flex items-center gap-3 transition-all duration-200"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${s.color}18`, color: s.color }}
              >
                {s.icon}
              </div>
              <div className="min-w-0">
                <div className="text-lg font-bold leading-none" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════
          FILTER BAR
      ═══════════════════════════════════ */}
      <div
        className="clay-card flex flex-wrap items-center gap-2 px-4 py-3"
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: 'var(--text-3)' }}
          />
          <input
            type="text"
            placeholder="Search posts…"
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            className="input !pl-8 w-full"
          />
        </div>

        {/* Category */}
        <div className="relative">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="input appearance-none pr-7 min-w-[140px]"
          >
            <option value="">All categories</option>
            {categories?.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: 'var(--text-3)' }}
          />
        </div>

        {/* Status */}
        <div className="relative">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="input appearance-none pr-7 min-w-[120px]"
          >
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <ChevronDown
            className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: 'var(--text-3)' }}
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => { setFilterCategory(''); setFilterStatus(''); setFilterSearch(''); }}
            className="btn-secondary !gap-1 !py-1.5 !px-3 text-xs"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}

        {/* Active filter pills */}
        {hasActiveFilters && (
          <div className="flex items-center gap-1 flex-wrap">
            {filterSearch && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                "{filterSearch}"
              </span>
            )}
            {filterStatus && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>
                {filterStatus}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════
          BULK ACTIONS BAR (conditional)
      ═══════════════════════════════════ */}
      {selectedPosts.size > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
          style={{ background: 'var(--accent-bg)', border: '1px solid rgba(212,168,83,0.30)', boxShadow: 'var(--glow-amber)' }}
        >
          <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            {selectedPosts.size} selected
          </span>
          <div className="flex-1" />
          <button
            onClick={() => bulkPublishMut.mutate()}
            disabled={bulkPublishMut.isPending}
            className="btn-secondary !gap-1.5 !py-1 !px-3 text-xs"
          >
            <Eye className="w-3.5 h-3.5" /> Publish
          </button>
          <button
            onClick={() => bulkUnpublishMut.mutate()}
            disabled={bulkUnpublishMut.isPending}
            className="btn-secondary !gap-1.5 !py-1 !px-3 text-xs"
          >
            <EyeOff className="w-3.5 h-3.5" /> Unpublish
          </button>
          <button
            onClick={() => { if (confirm(`Delete ${selectedPosts.size} posts?`)) bulkDeleteMut.mutate(); }}
            disabled={bulkDeleteMut.isPending}
            className="btn-secondary !gap-1.5 !py-1 !px-3 text-xs"
            style={{ color: 'var(--red)' }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <button
            onClick={() => setSelectedPosts(new Set())}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-3)' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════
          EMPTY STATE
      ═══════════════════════════════════ */}
      {(!posts || posts.length === 0) ? (
        <div
          className="clay-card p-16 text-center"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'var(--surface2)' }}
          >
            <FileText className="w-7 h-7" style={{ color: 'var(--text-3)' }} strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>
            {hasActiveFilters ? 'No posts match your filters' : 'No blog posts yet'}
          </h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
            {hasActiveFilters
              ? 'Try clearing your filters or adjusting the search.'
              : 'Start building your content library.'}
          </p>
          {!hasActiveFilters && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => { setShowAiModal(true); setAiResult(null); setAiError(''); }}
                className="btn-secondary !gap-1.5"
              >
                <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                Generate with AI
              </button>
              <Link to="/blog/new" className="btn-primary">
                <Plus className="w-4 h-4" /> Write First Post
              </Link>
            </div>
          )}
          {hasActiveFilters && (
            <button
              onClick={() => { setFilterCategory(''); setFilterStatus(''); setFilterSearch(''); }}
              className="btn-secondary"
            >
              <X className="w-4 h-4" /> Clear filters
            </button>
          )}
        </div>
      ) : (
        /* ═══════════════════════════════════
            POST TABLE
        ═══════════════════════════════════ */
        <div
          className="clay-card overflow-hidden"
        >
          {/* Table header row */}
          <div
            className="flex items-center gap-3 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
            style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)', color: 'var(--text-3)' }}
          >
            <button
              onClick={selectAll}
              className="flex items-center gap-1.5 transition-colors hover:opacity-70"
              style={{ color: selectedPosts.size === posts.length ? 'var(--accent)' : 'var(--text-3)' }}
            >
              {selectedPosts.size === posts.length ? (
                <CheckSquare className="w-3.5 h-3.5" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>
            <span className="flex-1">Post</span>
            <span className="hidden md:block w-24 text-center">Status</span>
            <span className="hidden lg:block w-28 text-center">Category</span>
            <span className="hidden lg:block w-20 text-center">Read time</span>
            <span className="hidden md:block w-24 text-center">Date</span>
            <span className="w-24 text-right">Actions</span>
          </div>

          {/* Rows */}
          <div style={{ background: 'var(--surface)' }}>
            {posts.map((post, idx) => (
              <div
                key={post.id}
                className={clsx(
                  'flex items-center gap-3 px-5 py-3.5 group transition-all duration-150',
                  selectedPosts.has(post.id) && 'selected-row',
                )}
                style={{
                  borderBottom: idx < posts.length - 1 ? '1px solid var(--border)' : undefined,
                  background: selectedPosts.has(post.id) ? 'rgba(201,169,98,0.05)' : undefined,
                }}
                onMouseEnter={e => {
                  if (!selectedPosts.has(post.id))
                    e.currentTarget.style.background = 'var(--surface2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = selectedPosts.has(post.id)
                    ? 'rgba(201,169,98,0.05)'
                    : '';
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => togglePostSelection(post.id)}
                  className="transition-colors flex-shrink-0"
                  style={{ color: selectedPosts.has(post.id) ? 'var(--accent)' : 'var(--text-3)' }}
                >
                  {selectedPosts.has(post.id) ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>

                {/* Thumbnail */}
                <div className="flex-shrink-0">
                  {post.coverImage ? (
                    <img
                      src={post.coverImage}
                      alt=""
                      className="w-10 h-10 rounded-xl object-cover"
                      style={{ border: '1px solid var(--border)' }}
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
                    >
                      <FileText className="w-4 h-4" style={{ color: 'var(--text-3)' }} strokeWidth={1.5} />
                    </div>
                  )}
                </div>

                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--text)' }}
                    >
                      {post.title}
                    </span>
                    {post.isFeatured && (
                      <Star className="w-3.5 h-3.5 flex-shrink-0" style={{ fill: 'var(--accent)', color: 'var(--accent)' }} />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {post.author && (
                      <span
                        className="text-[11px] flex items-center gap-1"
                        style={{ color: 'var(--text-3)' }}
                      >
                        <User className="w-3 h-3" />
                        {post.author.name}
                      </span>
                    )}
                    {post.tags && post.tags.length > 0 && (
                      <span
                        className="text-[11px] flex items-center gap-1"
                        style={{ color: 'var(--text-3)' }}
                      >
                        <Tag className="w-3 h-3" />
                        {post.tags.slice(0, 2).join(', ')}
                        {post.tags.length > 2 && (
                          <span style={{ color: 'var(--text-3)' }}>+{post.tags.length - 2}</span>
                        )}
                      </span>
                    )}
                    {post.excerpt && (
                      <span
                        className="text-[11px] hidden xl:block truncate max-w-[280px]"
                        style={{ color: 'var(--text-3)' }}
                      >
                        {post.excerpt}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="hidden md:flex w-24 justify-center flex-shrink-0">
                  <button
                    onClick={() => toggleMut.mutate({ id: post.id, isPublished: !post.isPublished })}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-150 hover:opacity-80"
                    style={post.isPublished
                      ? { background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)' }
                      : { background: 'var(--surface2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}
                    title={post.isPublished ? 'Click to unpublish' : 'Click to publish'}
                  >
                    {post.isPublished ? '● Live' : '○ Draft'}
                  </button>
                </div>

                {/* Category */}
                <div className="hidden lg:flex w-28 justify-center flex-shrink-0">
                  {post.category ? (
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium truncate max-w-full"
                      style={{
                        background: post.category.color ? `${post.category.color}20` : 'rgba(201,169,98,0.12)',
                        color: post.category.color || 'var(--accent)',
                      }}
                    >
                      {post.category.name}
                    </span>
                  ) : (
                    <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>—</span>
                  )}
                </div>

                {/* Read time */}
                <div className="hidden lg:flex w-20 justify-center flex-shrink-0">
                  {post.readTime ? (
                    <span
                      className="text-[11px] flex items-center gap-1"
                      style={{ color: 'var(--text-3)' }}
                    >
                      <Clock className="w-3 h-3" />
                      {post.readTime} min
                    </span>
                  ) : (
                    <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>—</span>
                  )}
                </div>

                {/* Date */}
                <div className="hidden md:flex w-24 justify-center flex-shrink-0">
                  <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : post.createdAt
                        ? new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '—'}
                  </span>
                </div>

                {/* Row actions */}
                <div className="flex items-center gap-1 w-36 justify-end flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleMut.mutate({ id: post.id, isPublished: !post.isPublished })}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors"
                    style={post.isPublished
                      ? { background: 'var(--surface2)', color: 'var(--text-3)', border: '1px solid var(--border)' }
                      : { background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)' }}
                    title={post.isPublished ? 'Unpublish' : 'Publish'}
                  >
                    {post.isPublished ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {post.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  <Link
                    to={`/blog/${post.id}`}
                    className="p-2 rounded-xl transition-colors"
                    style={{ color: 'var(--text-3)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => { if (confirm('Delete this post?')) deleteMut.mutate(post.id); }}
                    className="p-2 rounded-xl transition-colors"
                    style={{ color: 'var(--text-3)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Table footer count */}
          <div
            className="px-5 py-2.5 flex items-center justify-between"
            style={{ background: 'var(--surface2)', borderTop: '1px solid var(--border)' }}
          >
            <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
              Showing {posts.length} post{posts.length !== 1 ? 's' : ''}
              {hasActiveFilters ? ' (filtered)' : ''}
            </span>
            {selectedPosts.size > 0 && (
              <span className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>
                {selectedPosts.size} selected
              </span>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════
          AI GENERATE MODAL
      ═══════════════════════════════════ */}
      {showAiModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAiModal(false); }}
        >
          <div
            className="clay-card w-full max-w-lg overflow-hidden animate-scale-in"
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shine-on-hover"
                  style={{ background: 'var(--accent-bg)', boxShadow: 'var(--shadow-clay-sm)' }}
                >
                  <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} strokeWidth={1.75} />
                </div>
                <div>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>AI Blog Generator</span>
                  <span
                    className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
                  >
                    BETA
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-3)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!aiResult ? (
                <>
                  {/* Credit cost info */}
                  <div
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-[12px]"
                    style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}
                  >
                    <div className="flex items-center gap-1.5" style={{ color: '#7c3aed' }}>
                      <Zap className="w-3.5 h-3.5" />
                      <span className="font-semibold">~4,000 tokeni per blog generat</span>
                    </div>
                    <AiCreditsWidget compact />
                  </div>

                  <div>
                    <label className="label">Blog Topic *</label>
                    <input
                      className="input"
                      placeholder="e.g. 5 Tips to Win More Clients for Lawyers"
                      value={aiForm.topic}
                      onChange={e => setAiForm(f => ({ ...f, topic: e.target.value }))}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="label">
                      Description{' '}
                      <span className="font-normal" style={{ color: 'var(--text-3)' }}>
                        (optional - what should the blog cover?)
                      </span>
                    </label>
                    <textarea
                      className="input min-h-[80px] resize-none"
                      placeholder="e.g. Explain the importance of legal consultation, mention common mistakes people make, add practical advice..."
                      value={aiForm.description}
                      onChange={e => setAiForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="label">Tone</label>
                    <div className="relative">
                      <select
                        className="input appearance-none pr-8"
                        value={aiForm.tone}
                        onChange={e => setAiForm(f => ({ ...f, tone: e.target.value }))}
                      >
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly &amp; Approachable</option>
                        <option value="authoritative">Authoritative</option>
                        <option value="conversational">Conversational</option>
                        <option value="educational">Educational</option>
                      </select>
                      <ChevronDown
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                        style={{ color: 'var(--text-3)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">
                      SEO Keywords{' '}
                      <span className="font-normal" style={{ color: 'var(--text-3)' }}>
                        (optional, comma-separated)
                      </span>
                    </label>
                    <input
                      className="input"
                      placeholder="e.g. personal injury lawyer, legal advice"
                      value={aiForm.keywords}
                      onChange={e => setAiForm(f => ({ ...f, keywords: e.target.value }))}
                    />
                  </div>

                  {aiError && (
                    <div
                      className="px-4 py-3 rounded-xl text-sm"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--red)' }}
                    >
                      {aiError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button onClick={() => setShowAiModal(false)} className="btn-secondary flex-1">
                      Cancel
                    </button>
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
                  {/* AI result preview */}
                  <div
                    className="rounded-xl p-4 space-y-3"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
                  >
                    <div
                      className="text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
                      style={{ color: 'var(--green)' }}
                    >
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--green-bg)' }}
                      >
                        <span style={{ fontSize: 8 }}>✓</span>
                      </div>
                      Post Generated
                    </div>
                    <div>
                      <div
                        className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                        style={{ color: 'var(--text-3)' }}
                      >
                        Title
                      </div>
                      <div className="text-sm font-semibold leading-snug" style={{ color: 'var(--text)' }}>
                        {aiResult.title}
                      </div>
                    </div>
                    <div>
                      <div
                        className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                        style={{ color: 'var(--text-3)' }}
                      >
                        Excerpt
                      </div>
                      <div className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                        {aiResult.excerpt}
                      </div>
                    </div>
                    {aiResult.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {aiResult.tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: 'var(--green-bg)', color: 'var(--green)' }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {aiResult.readTime && (
                      <div
                        className="text-[11px] flex items-center gap-1"
                        style={{ color: 'var(--text-3)' }}
                      >
                        <Clock className="w-3 h-3" /> {aiResult.readTime}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => { setAiResult(null); setAiError(''); }}
                      className="btn-secondary flex-1"
                    >
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
