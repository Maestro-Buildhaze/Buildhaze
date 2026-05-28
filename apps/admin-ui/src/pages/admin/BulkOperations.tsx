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

  if (loading) return <div className="p-8">Loading clients...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="w-6 h-6" />
          Bulk Operations
        </h1>
      </div>

      {/* Operation Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-sm text-gray-500">Operation</label>
            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              className="border rounded px-3 py-1 block w-40"
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
            <div>
              <label className="text-sm text-gray-500">New Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="border rounded px-3 py-1 block w-32"
              >
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CheckSquare className="w-4 h-4" />
            {selected.size} of {clients.length} selected
          </div>

          <button
            onClick={handleBulkOperation}
            disabled={!operation || selected.size === 0 || running}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {running ? 'Running...' : 'Execute'}
          </button>
        </div>

        {results && (
          <div className={`mt-4 p-3 rounded ${results.failed === 0 ? 'bg-green-100' : 'bg-yellow-100'}`}>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>Success: {results.success}, Failed: {results.failed}</span>
            </div>
          </div>
        )}
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 px-4">
                <button onClick={toggleAll} className="flex items-center gap-2">
                  {selected.size === clients.length ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                </button>
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Business</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Email</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Slug</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Plan</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <button onClick={() => toggleSelect(client.id)}>
                    {selected.has(client.id) ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                  </button>
                </td>
                <td className="py-3 px-4 font-medium">{client.businessName}</td>
                <td className="py-3 px-4 text-sm">{client.email}</td>
                <td className="py-3 px-4 text-sm text-gray-500">{client.slug}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">{client.plan}</span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 text-xs rounded ${client.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {client.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
