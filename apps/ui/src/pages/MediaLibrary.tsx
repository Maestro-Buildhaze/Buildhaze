import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, Copy, Check, Image as ImageIcon, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import clsx from 'clsx';

export function MediaLibrary() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const { data: files, isLoading } = useQuery({ queryKey: ['media'], queryFn: api.media.list });

  const deleteMut = useMutation({
    mutationFn: api.media.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media'] }),
  });

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      await api.media.upload(file);
      queryClient.invalidateQueries({ queryKey: ['media'] });
    } finally {
      setUploading(false);
    }
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Media Library</h1>
          <p className="text-sm text-white/40 mt-1">{files?.length ?? 0} files</p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="btn-primary"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={clsx(
          'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
          dragging
            ? 'border-violet-500/60 bg-violet-500/10'
            : 'border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.02]',
        )}
      >
        <Upload className="w-8 h-8 text-white/20 mx-auto mb-2" strokeWidth={1.5} />
        <p className="text-sm text-white/40">Drop images here or click to upload</p>
        <p className="text-xs text-white/20 mt-1">JPG, PNG, WebP, GIF, SVG up to 10MB</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-white/30" />
        </div>
      ) : !files || files.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <ImageIcon className="w-12 h-12 text-white/15 mx-auto mb-3" strokeWidth={1} />
          <p className="text-sm text-white/40">No media files yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {files.map((file) => (
            <div key={file.id} className="group relative glass-card overflow-hidden aspect-square">
              <img
                src={file.url}
                alt={file.alt ?? file.name}
                className="w-full h-full object-cover"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => copyUrl(file.url)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    title="Copy URL"
                  >
                    {copied === file.url
                      ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                      : <Copy className="w-3.5 h-3.5 text-white/80" />}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this file?')) deleteMut.mutate(file.id);
                    }}
                    className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                  </button>
                </div>
                <div className="text-[10px] text-white/60 truncate">{file.name}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
