import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Globe, Trash2, Edit, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import { ClientCreateModal } from './ClientCreateModal';

export function Clients() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

  // Get clients list
  const { data: clients, isLoading } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: api.admin.getClients,
  });

  // Delete client mutation
  const deleteMut = useMutation({
    mutationFn: api.admin.deleteClient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-clients'] }),
  });

  // Publish client mutation
  const publishMut = useMutation({
    mutationFn: api.admin.publishClient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-clients'] }),
  });

  // Filter clients
  const filteredClients = clients?.filter((client: any) => 
    client.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clienți</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Client Nou
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Caută client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
          </div>
        ) : filteredClients?.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {searchTerm ? 'Niciun client găsit' : 'Niciun client încă. Creează primul client!'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Template</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ultima Publicare</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredClients?.map((client: any) => (
                  <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{client.businessName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{client.email}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{client.slug}.cms-platform.com</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {client.template ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {client.template.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        client.plan === 'enterprise' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                        client.plan === 'pro' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {client.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        client.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {client.isActive ? 'Activ' : 'Inactiv'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {client.lastPublishedAt 
                        ? new Date(client.lastPublishedAt).toLocaleDateString('ro-RO')
                        : 'Niciodată'
                      }
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {/* Publish Button */}
                      <button
                        onClick={() => publishMut.mutate(client.id)}
                        disabled={publishMut.isPending && publishMut.variables === client.id}
                        className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white text-sm rounded-lg transition-colors"
                      >
                        {publishMut.isPending && publishMut.variables === client.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Globe className="w-4 h-4 mr-1" />
                            Publică
                          </>
                        )}
                      </button>
                      
                      {/* View Site */}
                      {client.lastPublishedAt && (
                        <a
                          href={`https://${client.slug}.cms-platform.com`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      
                      {/* Edit */}
                      <button
                        onClick={() => setEditingClient(client)}
                        className="inline-flex items-center p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg dark:text-blue-400 dark:hover:bg-blue-900/20"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      
                      {/* Delete */}
                      <button
                        onClick={() => {
                          if (confirm(`Sigur vrei să ștergi clientul ${client.businessName}?`)) {
                            deleteMut.mutate(client.id);
                          }
                        }}
                        className="inline-flex items-center p-1.5 text-red-600 hover:bg-red-50 rounded-lg dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Clienți</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{clients?.length || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Cu Template</p>
          <p className="text-2xl font-bold text-emerald-600">
            {clients?.filter((c: any) => c.template).length || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Publicați</p>
          <p className="text-2xl font-bold text-blue-600">
            {clients?.filter((c: any) => c.lastPublishedAt).length || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Activi</p>
          <p className="text-2xl font-bold text-green-600">
            {clients?.filter((c: any) => c.isActive).length || 0}
          </p>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <ClientCreateModal 
          onClose={() => setShowCreateModal(false)} 
          client={null}
        />
      )}
      {editingClient && (
        <ClientCreateModal 
          onClose={() => setEditingClient(null)} 
          client={editingClient}
        />
      )}
    </div>
  );
}
