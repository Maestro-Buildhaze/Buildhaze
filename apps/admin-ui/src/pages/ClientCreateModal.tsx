import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Building2, Mail, Lock, Globe, Check, Loader2, Sparkles, ChevronDown } from 'lucide-react';
import { api } from '../lib/api';

const PLANS = [
  { value: 'basic', label: 'Basic', price: 'Gratuit', color: 'from-warm-400 to-warm-500' },
  { value: 'pro', label: 'Pro', price: '29€/lună', color: 'from-amber-400 to-orange-500' },
  { value: 'enterprise', label: 'Enterprise', price: '99€/lună', color: 'from-amber-500 to-orange-600' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  client?: any;
}

export function ClientCreateModal({ isOpen, onClose, client }: Props) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    businessName: '',
    slug: '',
    templateId: '',
    domain: '',
    plan: 'basic',
  });

  // Populate form when editing existing client
  useEffect(() => {
    if (client) {
      setFormData({
        email: client.email || '',
        password: '', // Don't show password
        businessName: client.businessName || '',
        slug: client.slug || '',
        templateId: client.templateId || '',
        domain: client.domain || '',
        plan: client.plan || 'basic',
      });
    } else {
      setFormData({
        email: '',
        password: '',
        businessName: '',
        slug: '',
        templateId: '',
        domain: '',
        plan: 'basic',
      });
    }
  }, [client, isOpen]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: templates } = useQuery({
    queryKey: ['admin-templates'],
    queryFn: api.admin.getTemplates,
  });

  const createMut = useMutation({
    mutationFn: api.admin.createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setFormData({
          email: '',
          password: '',
          businessName: '',
          slug: '',
          templateId: '',
          domain: '',
          plan: 'basic',
        });
      }, 1500);
    },
    onError: (err: any) => {
      setError(err.message || 'Eroare la crearea clientului');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createMut.mutateAsync(formData);
    } finally {
      setLoading(false);
    }
  };

  const updateSlug = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    setFormData((prev) => ({ ...prev, slug }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-warm-950/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-warm-900 rounded-3xl shadow-soft-lg border border-warm-200 dark:border-warm-700 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-warm-200 dark:border-warm-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-warm-800 dark:text-warm-100">Client Nou</h2>
              <p className="text-sm text-warm-500">Creează un nou client cu site</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-warm-400 hover:text-warm-600 hover:bg-warm-100 dark:hover:bg-warm-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-xl text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl text-sm flex items-center gap-2">
              <Check className="w-5 h-5" />
              Client creat cu succes!
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Business Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-warm-600 dark:text-warm-300 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Nume Business
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, businessName: e.target.value }));
                  if (!formData.slug) updateSlug(e.target.value);
                }}
                placeholder="ex: Cabinet Avocat Ionescu"
                className="input-premium"
                required
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-warm-600 dark:text-warm-300">Slug (URL)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-400 text-sm">site.com/</span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="cabinet-ionescu"
                  className="input-premium pl-20"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-warm-600 dark:text-warm-300 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="client@example.com"
                className="input-premium"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-warm-600 dark:text-warm-300 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Parolă
              </label>
              <input
                type="text"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Minim 8 caractere"
                className="input-premium"
                required
                minLength={8}
              />
            </div>
          </div>

          {/* Template Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-warm-600 dark:text-warm-300">Template</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {templates?.map((template: any) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, templateId: template.id }))}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.templateId === template.id
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30'
                      : 'border-warm-200 dark:border-warm-700 hover:border-amber-300'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-2">
                    <span className="text-white text-sm font-bold">{template.name.charAt(0)}</span>
                  </div>
                  <p className="font-medium text-sm text-warm-800 dark:text-warm-100">{template.name}</p>
                  <p className="text-xs text-warm-500 capitalize">{template.niche}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Plan Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-warm-600 dark:text-warm-300">Plan</label>
            <div className="grid grid-cols-3 gap-3">
              {PLANS.map((plan) => (
                <button
                  key={plan.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, plan: plan.value }))}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    formData.plan === plan.value
                      ? 'border-amber-500 bg-gradient-to-br ' + plan.color + ' text-white'
                      : 'border-warm-200 dark:border-warm-700 hover:border-amber-300'
                  }`}
                >
                  <p className="font-semibold">{plan.label}</p>
                  <p className={`text-sm ${formData.plan === plan.value ? 'text-white/80' : 'text-warm-500'}`}>
                    {plan.price}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Domain */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-warm-600 dark:text-warm-300 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Domeniu Custom (opțional)
            </label>
            <input
              type="text"
              value={formData.domain}
              onChange={(e) => setFormData((prev) => ({ ...prev, domain: e.target.value }))}
              placeholder="ex: www.legalpro.ro"
              className="input-premium"
            />
            <p className="text-xs text-warm-400">
              Clientul trebuie să configureze DNS CNAME către serverele noastre
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-200 dark:border-warm-700">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-warm-600 dark:text-warm-300 hover:bg-warm-100 dark:hover:bg-warm-800 rounded-xl font-medium transition-all"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={loading || !formData.templateId}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium shadow-soft hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {loading ? 'Se creează...' : 'Creează Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
