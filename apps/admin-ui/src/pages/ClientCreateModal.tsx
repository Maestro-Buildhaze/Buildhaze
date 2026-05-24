import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

interface Props {
  onClose: () => void;
  client: any | null;
}

export function ClientCreateModal({ onClose, client }: Props) {
  const queryClient = useQueryClient();
  const isEditing = !!client;
  
  const [formData, setFormData] = useState({
    email: client?.email || '',
    password: '', // Only for create
    businessName: client?.businessName || '',
    slug: client?.slug || '',
    templateId: client?.template?.id || '',
    domain: client?.domain || '',
    plan: client?.plan || 'basic',
    isActive: client?.isActive ?? true,
  });

  // Get templates for dropdown
  const { data: templates } = useQuery({
    queryKey: ['admin-templates'],
    queryFn: api.admin.getTemplates,
  });

  // Create/Update mutation
  const saveMut = useMutation({
    mutationFn: async () => {
      if (isEditing) {
        return api.admin.updateClient(client.id, {
          businessName: formData.businessName,
          templateId: formData.templateId || null,
          domain: formData.domain || null,
          plan: formData.plan,
          isActive: formData.isActive,
          ...(formData.password && { password: formData.password }),
        });
      } else {
        return api.admin.createClient({
          email: formData.email,
          password: formData.password,
          businessName: formData.businessName,
          templateId: formData.templateId || undefined,
          domain: formData.domain || undefined,
          plan: formData.plan,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing && !formData.password) {
      alert('Parola este obligatorie pentru clienți noi');
      return;
    }
    saveMut.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Editează Client' : 'Client Nou'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email {isEditing && '(opțional)'}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              disabled={isEditing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 dark:disabled:bg-gray-700 dark:bg-gray-700 dark:text-white"
              required={!isEditing}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Parola {isEditing ? '(lasă gol pentru a păstra)' : ''}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
              required={!isEditing}
            />
          </div>

          {/* Business Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nume Business
            </label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => {
                const name = e.target.value;
                setFormData(prev => ({ 
                  ...prev, 
                  businessName: name,
                  slug: !isEditing && !prev.slug 
                    ? name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') 
                    : prev.slug
                }));
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Slug (pentru URL: slug.cms-platform.com)
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
              disabled={isEditing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 dark:disabled:bg-gray-700 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          {/* Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Template
            </label>
            <select
              value={formData.templateId}
              onChange={(e) => setFormData(prev => ({ ...prev, templateId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">- Selectează template -</option>
              {templates?.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name} ({t.niche})</option>
              ))}
            </select>
          </div>

          {/* Domain */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Domeniu Custom (opțional)
            </label>
            <input
              type="text"
              value={formData.domain}
              onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
              placeholder="ex: lexprime.ro"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              Clientul trebuie să configureze DNS CNAME către cms-platform.com
            </p>
          </div>

          {/* Plan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Plan
            </label>
            <select
              value={formData.plan}
              onChange={(e) => setFormData(prev => ({ ...prev, plan: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          {/* Active */}
          {isEditing && (
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
              />
              <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Cont activ
              </label>
            </div>
          )}

          {/* Error */}
          {saveMut.isError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg text-sm">
              {saveMut.error instanceof Error ? saveMut.error.message : 'A apărut o eroare'}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={saveMut.isPending}
              className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {saveMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvează' : 'Creează Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
