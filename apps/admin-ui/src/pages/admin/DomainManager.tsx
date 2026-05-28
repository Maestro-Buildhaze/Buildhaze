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
    switch (status) {
      case 'active':
      case 'verified':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">{status}</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">{status}</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">{status}</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-warm-100 dark:bg-warm-800 text-warm-700 dark:text-warm-300">{status}</span>;
    }
  };

  const filteredDomains = domains.filter(d => 
    d.domain.toLowerCase().includes(filter.toLowerCase()) ||
    d.clientName.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) return <div className="p-8 text-warm-600 dark:text-warm-400">Loading domains...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="w-6 h-6" />
          Custom Domains
        </h1>
        <input
          type="text"
          placeholder="Search domains..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded-lg px-4 py-2 w-64"
        />
      </div>

      {/* SSL Expiring Alert */}
      {expiringDomains.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">{expiringDomains.length} domains have SSL certificates expiring soon</span>
          </div>
        </div>
      )}

      {/* Domains Table */}
      <div className="bg-white dark:bg-warm-900 rounded-xl shadow-soft border border-warm-200 dark:border-warm-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-warm-50 dark:bg-warm-800/50">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-warm-500 dark:text-warm-400">Domain</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-warm-500 dark:text-warm-400">Client</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-warm-500 dark:text-warm-400">DNS Status</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-warm-500 dark:text-warm-400">SSL Status</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-warm-500 dark:text-warm-400">SSL Expiry</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-warm-500 dark:text-warm-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDomains.map((domain) => (
              <tr key={domain.id} className="border-b last:border-0 hover:bg-warm-50 dark:bg-warm-800/50">
                <td className="py-3 px-4 font-medium">{domain.domain}</td>
                <td className="py-3 px-4">{domain.clientName}</td>
                <td className="py-3 px-4">{getStatusBadge(domain.dnsStatus)}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    {domain.sslStatus === 'active' && <Shield className="w-4 h-4 text-green-500" />}
                    {getStatusBadge(domain.sslStatus)}
                  </div>
                </td>
                <td className="py-3 px-4">
                  {domain.sslExpiresAt ? (
                    <span className={new Date(domain.sslExpiresAt) < new Date(Date.now() + 30 * 86400000) ? 'text-red-600' : ''}>
                      {new Date(domain.sslExpiresAt).toLocaleDateString()}
                    </span>
                  ) : '-'}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => verifyDNS(domain.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Verify DNS"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => renewSSL(domain.id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded"
                      title="Renew SSL"
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredDomains.length === 0 && (
          <div className="p-8 text-center text-warm-500 dark:text-warm-400">No domains found</div>
        )}
      </div>
    </div>
  );
}
