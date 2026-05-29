import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe, CheckCircle2, XCircle, Loader2, AlertCircle,
  Link2, Unlink, RefreshCw, Copy, Check, ExternalLink,
} from 'lucide-react';
import { api } from '../lib/api';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="p-1.5 rounded-lg transition-colors"
      style={{ color: copied ? 'var(--green)' : 'var(--text-3)' }}
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function DnsRecord({ type, name, value }: { type: string; name: string; value: string }) {
  return (
    <div className="rounded-xl p-3 font-mono text-xs"
      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="font-bold px-2 py-0.5 rounded-md text-[10px]"
          style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>{type}</span>
        <CopyButton text={value} />
      </div>
      <div className="space-y-1">
        <div className="flex gap-2">
          <span style={{ color: 'var(--text-3)' }}>Name:</span>
          <span style={{ color: 'var(--text)' }}>{name}</span>
        </div>
        <div className="flex gap-2">
          <span style={{ color: 'var(--text-3)' }}>Value:</span>
          <span className="break-all" style={{ color: 'var(--text)' }}>{value}</span>
        </div>
      </div>
    </div>
  );
}

export function DomainSettings() {
  const queryClient = useQueryClient();
  const [domainInput, setDomainInput] = useState('');
  const [error, setError] = useState('');

  const { data: domainData, isLoading } = useQuery({
    queryKey: ['domain'],
    queryFn: api.domain.get,
    retry: false,
  });

  const connectMut = useMutation({
    mutationFn: () => api.domain.connect(domainInput.trim().replace(/^https?:\/\//, '')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setDomainInput('');
      setError('');
    },
    onError: (err: any) => setError(err.message ?? 'Failed to connect domain'),
  });

  const verifyMut = useMutation({
    mutationFn: api.domain.verify,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['domain'] }),
    onError: (err: any) => setError(err.message ?? 'Verification failed'),
  });

  const disconnectMut = useMutation({
    mutationFn: api.domain.disconnect,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-3)' }} />
      </div>
    );
  }

  const domain = domainData?.domain;
  const status = domainData?.status;
  const dnsRecords: any[] = domainData?.dnsRecords ?? [];

  const statusColor = status === 'verified'
    ? 'var(--green)'
    : status === 'pending'
    ? 'var(--amber)'
    : 'var(--text-3)';

  const statusBg = status === 'verified'
    ? 'var(--green-bg)'
    : status === 'pending'
    ? 'var(--amber-bg)'
    : 'var(--surface2)';

  const StatusIcon = status === 'verified' ? CheckCircle2 : status === 'pending' ? AlertCircle : XCircle;

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Domain Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
          Connect a custom domain to your website
        </p>
      </div>

      {/* ── Current domain status ── */}
      {domain ? (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
                Connected Domain
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" style={{ color: 'var(--blue)' }} strokeWidth={1.75} />
                <span className="text-base font-semibold" style={{ color: 'var(--text)' }}>{domain}</span>
                <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
                </a>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl flex-shrink-0"
              style={{ background: statusBg, border: `1px solid ${statusColor}22` }}>
              <StatusIcon className="w-3.5 h-3.5" style={{ color: statusColor }} />
              <span className="text-xs font-bold capitalize" style={{ color: statusColor }}>{status}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {status !== 'verified' && (
              <button
                onClick={() => verifyMut.mutate()}
                disabled={verifyMut.isPending}
                className="btn-primary !text-xs !py-2 !px-3"
              >
                {verifyMut.isPending
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying…</>
                  : <><RefreshCw className="w-3.5 h-3.5" /> Verify DNS</>}
              </button>
            )}
            <button
              onClick={() => { if (confirm(`Disconnect ${domain}?`)) disconnectMut.mutate(); }}
              disabled={disconnectMut.isPending}
              className="btn-danger !text-xs !py-2 !px-3"
            >
              {disconnectMut.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Unlink className="w-3.5 h-3.5" />}
              Disconnect
            </button>
          </div>

          {/* DNS Records */}
          {status === 'pending' && dnsRecords.length > 0 && (
            <div className="pt-2 space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-xl"
                style={{ background: 'var(--amber-bg)', border: '1px solid rgba(217,119,6,0.20)' }}>
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--amber)' }} />
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                  Add these DNS records at your domain registrar, then click <strong>Verify DNS</strong>.
                  Propagation can take up to 48 hours.
                </p>
              </div>
              <div className="space-y-2">
                {dnsRecords.map((rec: any, i: number) => (
                  <DnsRecord key={i} type={rec.type} name={rec.name} value={rec.value} />
                ))}
              </div>
            </div>
          )}

          {status === 'verified' && (
            <div className="flex items-center gap-2 p-3 rounded-xl"
              style={{ background: 'var(--green-bg)', border: '1px solid rgba(22,163,74,0.20)' }}>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--green)' }} />
              <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                Your domain is verified and pointing to your website correctly.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ── Connect form ── */
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="w-4 h-4" style={{ color: 'var(--blue)' }} strokeWidth={1.75} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Connect a Custom Domain</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            Enter your domain name below. We'll provide you with DNS records to add at your registrar.
          </p>
          <div>
            <label className="label">Domain Name</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-3)' }} />
                <input
                  className="input !pl-9"
                  placeholder="yourdomain.com"
                  value={domainInput}
                  onChange={e => { setDomainInput(e.target.value); setError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter' && domainInput.trim()) connectMut.mutate(); }}
                />
              </div>
              <button
                onClick={() => connectMut.mutate()}
                disabled={!domainInput.trim() || connectMut.isPending}
                className="btn-primary"
              >
                {connectMut.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</>
                  : 'Connect'}
              </button>
            </div>
            {error && (
              <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: 'var(--red)' }}>
                <XCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Info cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Globe, title: 'Custom Domain', desc: 'Use yourdomain.com instead of a generic URL', color: 'var(--blue)', bg: 'var(--blue-bg)' },
          { icon: CheckCircle2, title: 'SSL Included', desc: 'Free HTTPS certificate automatically issued', color: 'var(--green)', bg: 'var(--green-bg)' },
          { icon: RefreshCw, title: 'Instant Propagation', desc: 'Changes go live within minutes after verification', color: 'var(--purple)', bg: 'var(--purple-bg)' },
        ].map(({ icon: Icon, title, desc, color, bg }) => (
          <div key={title} className="rounded-2xl p-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
              <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.75} />
            </div>
            <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>{title}</div>
            <div className="text-xs" style={{ color: 'var(--text-3)' }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
