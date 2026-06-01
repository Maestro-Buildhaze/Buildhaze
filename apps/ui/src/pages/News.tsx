import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Newspaper, TrendingUp, Loader2, MapPin, X, ExternalLink,
  Sparkles, Globe, Trash2, RefreshCw, FileText, Eye, Send,
} from 'lucide-react';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';

// Skeleton loader
function Skeleton({ className }: { className?: string }) {
  return <div className={`shimmer rounded-lg ${className}`} />;
}

export function News() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedNews, setSelectedNews] = useState<null | { id: string; title: string; summary: string; url: string; imageUrl?: string; source: string }>(null);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [postToSiteItem, setPostToSiteItem] = useState<any>(null);
  const [postSiteSummary, setPostSiteSummary] = useState('');

  // Fetch news
  const { data: newsData, isLoading: newsLoading, refetch: refetchNews } = useQuery({
    queryKey: ['news'],
    queryFn: () => api.news.get(),
    staleTime: 30 * 60 * 1000, // 30 min
    retry: false,
  });

  // Fetch countries
  const { data: countriesData } = useQuery({
    queryKey: ['news-countries'],
    queryFn: () => api.news.getCountries(),
    staleTime: 24 * 60 * 60 * 1000,
  });

  // Mutations
  const autoBlogMut = useMutation({
    mutationFn: api.news.createBlogFromNews,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog'] });
    },
  });

  const postToSiteMut = useMutation({
    mutationFn: api.news.postToSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-config'] });
      setPostToSiteItem(null);
    },
  });

  const generateBlogMut = useMutation({
    mutationFn: api.news.generateBlogFromNews,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      setPostToSiteItem(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: api.news.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
  });

  const selectCountriesMut = useMutation({
    mutationFn: api.news.selectCountries,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setShowCountrySelector(false);
    },
  });

  // Generate AI summary for news
  const generateAiSummary = async (newsItem: any) => {
    setSummaryLoading(true);
    setAiSummary('');
    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newsItem.title,
          content: newsItem.summary,
          url: newsItem.url,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiSummary(data.summary || 'Nu s-a putut genera rezumatul.');
      } else {
        // Fallback: create simple summary from existing data
        setAiSummary(`${newsItem.title}\n\n${newsItem.summary}\n\nSursă: ${newsItem.source}`);
      }
    } catch (e) {
      // Fallback if AI service fails
      setAiSummary(`${newsItem.title}\n\n${newsItem.summary}\n\nSursă: ${newsItem.source}`);
    } finally {
      setSummaryLoading(false);
    }
  };

  const news: any[] = newsData?.news ?? [];
  const clientCountries = newsData?.countries ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--blue-bg)' }}>
            <Newspaper className="w-5 h-5" style={{ color: 'var(--blue)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>News</h1>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              Industry news from {clientCountries.length > 0 ? clientCountries.join(', ') : 'your selected countries'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Country selector button */}
          <button
            onClick={() => setShowCountrySelector(true)}
            className="btn-secondary !py-2 !px-3 flex items-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">Țări</span>
            {clientCountries.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface3)' }}>
                {clientCountries.length}
              </span>
            )}
          </button>

          {/* Refresh button */}
          <button
            onClick={() => refetchNews()}
            disabled={newsLoading}
            className="btn-secondary !py-2 !px-3"
          >
            {newsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>

          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-xs ${viewMode === 'grid' ? 'font-semibold' : ''}`}
              style={{ 
                background: viewMode === 'grid' ? 'var(--surface2)' : 'var(--surface)',
                color: viewMode === 'grid' ? 'var(--text)' : 'var(--text-3)'
              }}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-xs ${viewMode === 'list' ? 'font-semibold' : ''}`}
              style={{ 
                background: viewMode === 'list' ? 'var(--surface2)' : 'var(--surface)',
                color: viewMode === 'list' ? 'var(--text)' : 'var(--text-3)'
              }}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {newsData && (
        <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-3)' }}>
          <span>
            <span className="font-semibold" style={{ color: 'var(--text)' }}>{news.length}</span> articles
          </span>
          {newsData.fromCache && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
              From cache
            </span>
          )}
          {clientCountries.length > 0 && (
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {clientCountries.join(', ')}
            </span>
          )}
        </div>
      )}

      {/* News Content */}
      {newsLoading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className={viewMode === 'grid' ? 'h-64' : 'h-24'} />
          ))}
        </div>
      ) : news.length === 0 ? (
        <div 
          className="rounded-2xl p-12 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--surface2)' }}>
            <Newspaper className="w-8 h-8" style={{ color: 'var(--text-3)' }} />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>No news yet</h3>
          <p className="text-sm mb-4 max-w-md mx-auto" style={{ color: 'var(--text-3)' }}>
            Click the refresh button to fetch the latest industry news from your selected countries.
          </p>
          <button
            onClick={() => refetchNews()}
            className="btn-primary"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Fetch News
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {news.map((item: any) => (
            <article
              key={item.id}
              className="group rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-1"
              style={{ 
                background: 'var(--surface)', 
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {/* Image */}
              {item.imageUrl && viewMode === 'grid' && (
                <div className="relative h-40 overflow-hidden">
                  <img 
                    src={item.imageUrl} 
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                      {item.source}
                    </span>
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold" style={{ color: 'var(--blue)' }}>
                    {item.source}
                  </span>
                  {item.sourceCountry && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface3)', color: 'var(--text-3)' }}>
                      {item.sourceCountryName || item.sourceCountry}
                    </span>
                  )}
                </div>

                <h3 className="font-semibold mb-2 line-clamp-2" style={{ color: 'var(--text)' }}>
                  {item.title}
                </h3>

                <p className="text-sm line-clamp-3 mb-4" style={{ color: 'var(--text-3)' }}>
                  {item.summary}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setSelectedNews(item);
                      generateAiSummary(item);
                    }}
                    className="btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-1"
                    style={{ color: 'var(--blue)', borderColor: 'var(--blue)' }}
                  >
                    <FileText className="w-3 h-3" />
                    Vezi pe scurt
                  </button>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Original
                  </a>

                  <button
                    onClick={() => autoBlogMut.mutate(item.id)}
                    disabled={autoBlogMut.isPending}
                    className="btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-1"
                    style={{ color: 'var(--green)', borderColor: 'var(--green)' }}
                  >
                    <Sparkles className="w-3 h-3" />
                    {autoBlogMut.isPending ? '...' : 'Blog'}
                  </button>

                  <button
                    onClick={() => { setPostToSiteItem(item); setPostSiteSummary(item.summary || ''); }}
                    className="btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-1"
                    style={{ color: 'var(--purple)', borderColor: 'var(--purple)' }}
                  >
                    <Send className="w-3 h-3" />
                    Post to site
                  </button>

                  <button
                    onClick={() => deleteMut.mutate(item.id)}
                    disabled={deleteMut.isPending}
                    className="ml-auto p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                    style={{ color: 'var(--red)' }}
                    title="Hide this news"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ── Post to Site Modal ── */}
      {postToSiteItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) setPostToSiteItem(null); }}>
          <div className="rounded-2xl max-w-lg w-full overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {postToSiteItem.imageUrl && (
              <div className="relative h-40">
                <img src={postToSiteItem.imageUrl} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <span className="absolute bottom-3 left-4 text-xs font-bold text-white/80 uppercase tracking-wider">{postToSiteItem.source}</span>
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <h3 className="font-bold text-base leading-snug" style={{ color: 'var(--text)' }}>{postToSiteItem.title}</h3>
                <button onClick={() => setPostToSiteItem(null)} className="p-1 rounded-lg flex-shrink-0 hover:bg-white/5 transition-colors"><X className="w-4 h-4" style={{ color: 'var(--text-3)' }} /></button>
              </div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>Rezumat afișat pe site (editabil)</label>
              <textarea
                value={postSiteSummary}
                onChange={e => setPostSiteSummary(e.target.value)}
                rows={4}
                className="w-full rounded-xl p-3 text-sm resize-none outline-none"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                placeholder="Scrie un rezumat pentru cititori..."
              />
              <p className="text-xs mt-1 mb-5" style={{ color: 'var(--text-4)' }}>Vizitatorul va vedea acest rezumat și un buton care duce la articolul original.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => postToSiteMut.mutate({ newsId: postToSiteItem.id, customSummary: postSiteSummary.trim() || undefined, newsData: postToSiteItem })}
                  disabled={postToSiteMut.isPending}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 !py-2.5"
                >
                  {postToSiteMut.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Postez...</> : <><Send className="w-4 h-4" />Publică la Știri</>}
                </button>
                <button
                  onClick={() => generateBlogMut.mutate({ newsId: postToSiteItem.id, newsData: postToSiteItem })}
                  disabled={generateBlogMut.isPending}
                  className="btn-secondary flex-1 flex items-center justify-center gap-2 !py-2.5"
                  style={{ color: 'var(--green)', borderColor: 'var(--green)' }}
                >
                  {generateBlogMut.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Generez...</> : <><Sparkles className="w-4 h-4" />Generează articol blog cu AI</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Country Selector Modal */}
      {showCountrySelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div 
            className="rounded-2xl p-6 max-w-md w-full"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Select Countries</h3>
              <button 
                onClick={() => setShowCountrySelector(false)} 
                className="p-1 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" style={{ color: 'var(--text-3)' }} />
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
              Select one country to get industry news from:
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4 max-h-60 overflow-y-auto">
              {countriesData?.countries.map((country) => (
                <label
                  key={country.code}
                  className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <input
                    type="radio"
                    name="country"
                    checked={selectedCountries[0] === country.code}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCountries([country.code]);
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-lg">{country.flag}</span>
                  <span className="text-sm" style={{ color: 'var(--text)' }}>{country.name}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                1 country selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCountrySelector(false)}
                  className="btn-secondary !py-2 !px-4"
                >
                  Cancel
                </button>
                <button
                  onClick={() => selectCountriesMut.mutate(selectedCountries)}
                  disabled={selectedCountries.length === 0 || selectCountriesMut.isPending}
                  className="btn-primary !py-2 !px-4"
                >
                  {selectCountriesMut.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Summary Modal */}
      {selectedNews && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div 
            className="rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            {/* Header with image */}
            <div className="relative h-48 sm:h-64">
              {selectedNews.imageUrl ? (
                <img
                  src={selectedNews.imageUrl}
                  alt={selectedNews.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: 'var(--surface2)' }}
                >
                  <Newspaper className="w-16 h-16" style={{ color: 'var(--text-3)' }} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <button
                onClick={() => setSelectedNews(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <div className="absolute bottom-4 left-4 right-4">
                <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                  {selectedNews.source}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
                  {selectedNews.title}
                </h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {summaryLoading ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--blue)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-3)' }}>
                      AI generează rezumatul...
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-4 w-10/12" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-9/12" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" style={{ color: 'var(--green)' }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--green)' }}>
                      Rezumat AI
                    </span>
                  </div>
                  <div 
                    className="text-sm leading-relaxed whitespace-pre-line"
                    style={{ color: 'var(--text)' }}
                  >
                    {aiSummary}
                  </div>
                  
                  <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <a
                      href={selectedNews.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary !py-2 !px-4 flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Citește articolul complet
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
