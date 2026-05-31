import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, Copy, Check, Image as ImageIcon, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

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
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Media Library</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>{files?.length ?? 0} files</p>
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
        className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all"
        style={{
          borderColor: dragging ? 'var(--green)' : 'var(--border)',
          background: dragging ? 'var(--green-bg)' : 'var(--surface2)',
        }}
      >
        <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-4)' }} strokeWidth={1.5} />
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>Drop images here or click to upload</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>JPG, PNG, WebP, GIF, SVG up to 10MB</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-3)' }} />
        </div>
      ) : !files || files.length === 0 ? (
        <div className="clay-card p-12 text-center">
          <ImageIcon className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-4)' }} strokeWidth={1} />
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>No media files yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {files.map((file) => (
            <div key={file.id} className="group relative clay-card overflow-hidden aspect-square">
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
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ background: 'rgba(255,255,255,0.12)' }}
                    title="Copy URL"
                  >
                    {copied === file.url
                      ? <Check className="w-3.5 h-3.5" style={{ color: 'var(--green)' }} />
                      : <Copy className="w-3.5 h-3.5" style={{ color: '#fff' }} />}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this file?')) deleteMut.mutate(file.id);
                    }}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ background: 'rgba(239,68,68,0.20)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--red)' }} />
                  </button>
                </div>
                <div className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.70)' }}>{file.name}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
