import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Newspaper, TrendingUp, Loader2, MapPin, X, ExternalLink,
  Sparkles, Globe, Trash2, RefreshCw, FileText, Eye,
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
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Vezi știrea
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
                    onClick={() => postToSiteMut.mutate(item.id)}
                    disabled={postToSiteMut.isPending}
                    className="btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-1"
                    style={{ color: 'var(--purple)', borderColor: 'var(--purple)' }}
                  >
                    <Eye className="w-3 h-3" />
                    {postToSiteMut.isPending ? '...' : 'Site'}
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
              Choose up to 5 countries to get industry news from:
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4 max-h-60 overflow-y-auto">
              {countriesData?.countries.map((country) => (
                <label
                  key={country.code}
                  className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <input
                    type="checkbox"
                    checked={selectedCountries.includes(country.code)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (selectedCountries.length < 5) {
                          setSelectedCountries([...selectedCountries, country.code]);
                        }
                      } else {
                        setSelectedCountries(selectedCountries.filter(c => c !== country.code));
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
                {selectedCountries.length}/5 selected
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
    </div>
  );
}
