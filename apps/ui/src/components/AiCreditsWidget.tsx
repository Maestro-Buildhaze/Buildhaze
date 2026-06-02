import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Zap, ChevronDown, ChevronUp, Coins, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  'generate-blog': { label: 'Blog AI', color: '#7c3aed' },
  'news-blog':     { label: 'News → Blog', color: '#0891b2' },
  'niche-news':    { label: 'News Fetch', color: '#059669' },
  'suggestions':   { label: 'Sugestii AI', color: '#ea580c' },
  'chat':          { label: 'Chatbot', color: '#2563eb' },
};

interface Props {
  compact?: boolean;
}

export function AiCreditsWidget({ compact = false }: Props) {
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['ai-usage-today'],
    queryFn: () => api.ai.getUsageToday(),
    refetchInterval: 60_000,
  });

  if (isLoading || !data) return null;

  const { today, monthly } = data;

  const blogUsed = today['generate-blog']?.count ?? 0;
  const newsBlogUsed = today['news-blog']?.count ?? 0;
  const blogLimit = today['generate-blog']?.limit ?? 2;
  const newsBlogLimit = today['news-blog']?.limit ?? 2;

  const monthlyPct = Math.min(100, Math.round((monthly.used / monthly.limit) * 100));

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer"
        style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
        onClick={() => setExpanded(!expanded)}
        title="AI Credits usage today"
      >
        <Zap className="w-3.5 h-3.5" style={{ color: '#7c3aed' }} />
        <span>Blog: <b style={{ color: blogUsed >= blogLimit ? '#dc2626' : 'var(--text)' }}>{blogUsed}/{blogLimit}</b></span>
        <span style={{ color: 'var(--border)' }}>·</span>
        <span>News: <b style={{ color: newsBlogUsed >= newsBlogLimit ? '#dc2626' : 'var(--text)' }}>{newsBlogUsed}/{newsBlogLimit}</b></span>
        <span style={{ color: 'var(--border)' }}>·</span>
        <span style={{ color: monthlyPct >= 80 ? '#dc2626' : 'var(--text-3)' }}>{monthly.used.toLocaleString()}/{monthly.limit.toLocaleString()} tok</span>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
    >
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{ background: 'var(--surface)' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.1)' }}>
            <Zap className="w-4 h-4" style={{ color: '#7c3aed' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI Credits</span>
          <span
            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: monthlyPct >= 80 ? '#fee2e2' : 'rgba(124,58,237,0.08)', color: monthlyPct >= 80 ? '#dc2626' : '#7c3aed' }}
          >
            {monthlyPct}% used
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-3)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-3)' }} />}
      </button>

      {/* Monthly bar */}
      <div className="px-4 pb-3">
        <div className="flex justify-between text-[11px] mb-1" style={{ color: 'var(--text-3)' }}>
          <span>{monthly.used.toLocaleString()} tokeni folosiți azi</span>
          <span>{monthly.remaining.toLocaleString()} rămași luna asta</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${monthlyPct}%`, background: monthlyPct >= 80 ? '#dc2626' : monthlyPct >= 60 ? '#ea580c' : '#7c3aed' }}
          />
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2.5" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Limite zilnice</p>
          {Object.entries(today).map(([action, info]: [string, any]) => {
            const meta = ACTION_LABELS[action];
            if (!meta) return null;
            const pct = info.limit > 0 ? Math.min(100, Math.round((info.count / info.limit) * 100)) : 0;
            const isAtLimit = info.count >= info.limit;
            return (
              <div key={action}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                    <span className="text-[12px] font-medium" style={{ color: 'var(--text-2)' }}>{meta.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                      ~{info.cost.toLocaleString()} tok/operație
                    </span>
                    <span
                      className="text-[12px] font-bold"
                      style={{ color: isAtLimit ? '#dc2626' : 'var(--text)' }}
                    >
                      {info.count}/{info.limit}
                    </span>
                  </div>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: isAtLimit ? '#dc2626' : meta.color }}
                  />
                </div>
                {isAtLimit && (
                  <p className="text-[11px] mt-0.5" style={{ color: '#dc2626' }}>
                    Limită atinsă — resetare la miezul nopții
                  </p>
                )}
              </div>
            );
          })}

          <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Coins className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-3)' }}>LUNAR</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span style={{ color: 'var(--text-2)' }}>Folosit: <b style={{ color: 'var(--text)' }}>{monthly.used.toLocaleString()}</b></span>
              <span style={{ color: 'var(--text-2)' }}>Limită: <b style={{ color: 'var(--text)' }}>{monthly.limit.toLocaleString()}</b></span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px]" style={{ color: 'var(--text-3)' }}>
              <RefreshCw className="w-3 h-3" />
              Reset: {new Date(monthly.resetAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
