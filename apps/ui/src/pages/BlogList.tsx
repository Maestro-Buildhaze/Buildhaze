import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileText, Plus, Trash2, Edit2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import clsx from 'clsx';

export function BlogList() {
  const queryClient = useQueryClient();
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Blog Posts</h1>
          <p className="text-sm text-white/40 mt-1">
            {posts?.length ?? 0} posts &middot; {posts?.filter((p) => p.isPublished).length ?? 0} published
          </p>
        </div>
        <Link to="/blog/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Post
        </Link>
      </div>

      {!posts || posts.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <FileText className="w-12 h-12 text-white/15 mx-auto mb-4" strokeWidth={1} />
          <p className="text-sm text-white/40 mb-6">No blog posts yet. Start writing!</p>
          <Link to="/blog/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Write first post
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div key={post.id} className="glass-card px-5 py-4 flex items-center gap-4 group">
              {/* Status dot */}
              <div className={clsx(
                'w-2 h-2 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-[#0a0a0f]',
                post.isPublished
                  ? 'bg-emerald-400 ring-emerald-400/30'
                  : 'bg-white/20 ring-white/10',
              )} />

              {/* Cover */}
              {post.coverImage ? (
                <img src={post.coverImage} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-white/20" strokeWidth={1.5} />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{post.title}</div>
                <div className="text-xs text-white/35 mt-0.5 flex items-center gap-2">
                  {post.isPublished ? (
                    <span className="text-emerald-400/70">Published {new Date(post.publishedAt!).toLocaleDateString()}</span>
                  ) : (
                    <span>Draft &middot; Last edited {new Date(post.updatedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => toggleMut.mutate({ id: post.id, isPublished: !post.isPublished })}
                  className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
                  title={post.isPublished ? 'Unpublish' : 'Publish'}
                >
                  {post.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <Link
                  to={`/blog/${post.id}`}
                  className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => {
                    if (confirm('Delete this post?')) deleteMut.mutate(post.id);
                  }}
                  className="p-2 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
