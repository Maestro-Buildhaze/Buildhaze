import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Layers, CheckSquare, Square, Play, AlertCircle } from 'lucide-react';

interface Client {
  id: string;
  email: string;
  businessName: string;
  slug: string;
  plan: string;
  isActive: boolean;
}

export function BulkOperations() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [operation, setOperation] = useState<string>('');
  const [plan, setPlan] = useState<string>('basic');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const res = await api.admin.getClients();
      setClients(res || []);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const toggleAll = () => {
    if (selected.size === clients.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(clients.map(c => c.id)));
    }
  };

  const handleBulkOperation = async () => {
    if (!operation || selected.size === 0) return;
    
    setRunning(true);
    setResults(null);
    
    try {
      const res = await api.admin.bulkClientOperation(
        Array.from(selected),
        operation,
        operation === 'changePlan' ? plan : undefined
      );
      setResults(res.results);
      await loadClients();
    } catch (err) {
      console.error('Bulk operation failed:', err);
      alert('Operation failed');
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <div className="p-8" style={{ color: 'var(--txt-muted)' }}>Loading clients...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="icon-box w-11 h-11 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f97316,#c2590a)' }}>
          <Layers className="w-5 h-5 text-white relative z-10" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold" style={{ color: 'var(--txt-primary)' }}>Bulk Operations</h1>
          <p className="text-sm" style={{ color: 'var(--txt-muted)' }}>Operațiuni în masă pe mai mulți clienți</p>
        </div>
      </div>

      {/* Operation Controls */}
      <div className="neu-card p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[160px]">
            <label className="section-label mb-2 block">Operation</label>
            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              className="neu-select"
            >
              <option value="">Select operation...</option>
              <option value="activate">Activate</option>
              <option value="deactivate">Deactivate</option>
              <option value="delete">Delete</option>
              <option value="changePlan">Change Plan</option>
              <option value="export">Export</option>
            </select>
          </div>

          {operation === 'changePlan' && (
            <div className="min-w-[130px]">
              <label className="section-label mb-2 block">New Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="neu-select"
              >
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--txt-muted)' }}>
            <CheckSquare className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            {selected.size} of {clients.length} selected
          </div>

          <button
            onClick={handleBulkOperation}
            disabled={!operation || selected.size === 0 || running}
            className="neu-btn-primary flex items-center gap-2 px-5 py-2.5 disabled:opacity-50"
          >
            <Play className="w-4 h-4 relative z-10" />
            <span className="relative z-10">{running ? 'Running...' : 'Execute'}</span>
          </button>
        </div>

        {results && (
          <div
            className="mt-4 p-3 rounded-xl flex items-center gap-2 text-sm"
            style={results.failed === 0
              ? { background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }
              : { background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>Success: {results.success}, Failed: {results.failed}</span>
          </div>
        )}
      </div>

      {/* Clients Table */}
      <div className="neu-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--neu-border)' }}>
                <th className="py-4 px-5">
                  <button onClick={toggleAll}>
                    {selected.size === clients.length
                      ? <CheckSquare className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                      : <Square className="w-5 h-5" style={{ color: 'var(--txt-muted)' }} />}
                  </button>
                </th>
                {['Business', 'Email', 'Slug', 'Plan', 'Status'].map(h => (
                  <th key={h} className="text-left py-4 px-5 section-label">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="table-row-hover transition-colors" style={{ borderBottom: '1px solid var(--neu-border)' }}>
                  <td className="py-3.5 px-5">
                    <button onClick={() => toggleSelect(client.id)}>
                      {selected.has(client.id)
                        ? <CheckSquare className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                        : <Square className="w-5 h-5" style={{ color: 'var(--txt-muted)' }} />}
                    </button>
                  </td>
                  <td className="py-3.5 px-5 text-[14px] font-semibold" style={{ color: 'var(--txt-primary)' }}>{client.businessName}</td>
                  <td className="py-3.5 px-5 text-[14px]" style={{ color: 'var(--txt-secondary)' }}>{client.email}</td>
                  <td className="py-3.5 px-5 text-[13px]" style={{ color: 'var(--txt-muted)' }}>{client.slug}</td>
                  <td className="py-3.5 px-5">
                    <span className="glass-pill text-[11px] font-bold px-2.5 py-0.5" style={{ color: '#60a5fa', borderColor: 'rgba(96,165,250,0.25)', background: 'rgba(96,165,250,0.08)' }}>{client.plan}</span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="glass-pill text-[11px] font-bold px-2.5 py-0.5"
                      style={client.isActive
                        ? { color: '#34d399', borderColor: 'rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.08)' }
                        : { color: '#f87171', borderColor: 'rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.08)' }}
                    >{client.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
