import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Globe, Shield, AlertTriangle, CheckCircle, RefreshCw, Lock } from 'lucide-react';

interface Domain {
  id: string;
  domain: string;
  clientId: string;
  clientName: string;
  status: string;
  dnsStatus: string;
  sslStatus: string;
  sslExpiresAt: string | null;
  createdAt: string;
}

export function DomainManager() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [expiringDomains, setExpiringDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [domainsRes, expiringRes] = await Promise.all([
        api.admin.getDomains(),
        api.admin.getSSLExpiringDomains(),
      ]);
      setDomains(domainsRes.domains || []);
      setExpiringDomains(expiringRes.domains || []);
    } catch (err) {
      console.error('Failed to load domains:', err);
    } finally {
      setLoading(false);
    }
  };

  const verifyDNS = async (id: string) => {
    try {
      await api.admin.verifyDomainDNS(id);
      await loadData();
    } catch (err) {
      console.error('DNS verification failed:', err);
    }
  };

  const renewSSL = async (id: string) => {
    try {
      await api.admin.renewDomainSSL(id);
      await loadData();
    } catch (err) {
      console.error('SSL renewal failed:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, React.CSSProperties> = {
      active:   { background: 'rgba(52,211,153,0.12)',  color: '#34d399', border: '1px solid rgba(52,211,153,0.25)'  },
      verified: { background: 'rgba(52,211,153,0.12)',  color: '#34d399', border: '1px solid rgba(52,211,153,0.25)'  },
      pending:  { background: 'rgba(251,191,36,0.12)',  color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)'  },
      failed:   { background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' },
    };
    const s = styles[status] || { background: 'var(--neu-surface2)', color: 'var(--txt-muted)', border: '1px solid var(--neu-border)' };
    return <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg" style={s}>{status}</span>;
  };

  const filteredDomains = domains.filter(d => 
    d.domain.toLowerCase().includes(filter.toLowerCase()) ||
    d.clientName.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) return <div className="p-8" style={{ color: 'var(--txt-muted)' }}>Loading domains...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="icon-box w-11 h-11 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f97316,#c2590a)' }}>
            <Globe className="w-5 h-5 text-white relative z-10" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold" style={{ color: 'var(--txt-primary)' }}>Custom Domains</h1>
            <p className="text-sm" style={{ color: 'var(--txt-muted)' }}>Gestionează domeniile și certificatele SSL</p>
          </div>
        </div>
        <input
          type="text"
          placeholder="Search domains..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="neu-input w-64"
        />
      </div>

      {/* SSL Expiring Alert */}
      {expiringDomains.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.30)', color: '#fbbf24' }}>
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="font-semibold text-[14px]">{expiringDomains.length} domains have SSL certificates expiring soon</span>
        </div>
      )}

      {/* Domains Table */}
      <div className="neu-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--neu-border)' }}>
                {['Domain', 'Client', 'DNS Status', 'SSL Status', 'SSL Expiry', 'Actions'].map((h, i) => (
                  <th key={h} className={`py-4 px-5 section-label ${i === 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredDomains.map((domain) => (
                <tr key={domain.id} className="table-row-hover transition-colors" style={{ borderBottom: '1px solid var(--neu-border)' }}>
                  <td className="py-4 px-5 text-[14px] font-semibold" style={{ color: 'var(--txt-primary)' }}>{domain.domain}</td>
                  <td className="py-4 px-5 text-[14px]" style={{ color: 'var(--txt-secondary)' }}>{domain.clientName}</td>
                  <td className="py-4 px-5">{getStatusBadge(domain.dnsStatus)}</td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-1.5">
                      {domain.sslStatus === 'active' && <Shield className="w-4 h-4" style={{ color: '#34d399' }} />}
                      {getStatusBadge(domain.sslStatus)}
                    </div>
                  </td>
                  <td className="py-4 px-5 text-[14px]">
                    {domain.sslExpiresAt ? (
                      <span style={{ color: new Date(domain.sslExpiresAt) < new Date(Date.now() + 30 * 86400000) ? '#f87171' : 'var(--txt-secondary)' }}>
                        {new Date(domain.sslExpiresAt).toLocaleDateString()}
                      </span>
                    ) : <span style={{ color: 'var(--txt-muted)' }}>—</span>}
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => verifyDNS(domain.id)} className="p-2 rounded-lg transition-all hover:scale-105" style={{ color: '#818cf8', background: 'rgba(129,140,248,0.08)' }} title="Verify DNS">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => renewSSL(domain.id)} className="p-2 rounded-lg transition-all hover:scale-105" style={{ color: '#34d399', background: 'rgba(52,211,153,0.08)' }} title="Renew SSL">
                        <Lock className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredDomains.length === 0 && (
            <div className="py-16 text-center">
              <Globe className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: 'var(--txt-muted)' }} />
              <p className="text-[15px]" style={{ color: 'var(--txt-muted)' }}>No domains found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
