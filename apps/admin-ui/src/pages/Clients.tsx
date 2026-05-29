import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, Edit, CheckCircle2, Loader2, ExternalLink, X, AlertCircle, Rocket, Eye, Cloud, LogIn } from 'lucide-react';
import { api } from '../lib/api';
import { ClientCreateModal } from './ClientCreateModal';

const CLIENT_UI_URL = import.meta.env.VITE_CLIENT_UI_URL || 'https://buildhaze-client.onrender.com';

export function Clients() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  
  // Publish status modal
  const [publishModal, setPublishModal] = useState<{
    isOpen: boolean;
    clientId: string | null;
    clientName: string;
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string;
    url?: string;
  }>({
    isOpen: false,
    clientId: null,
    clientName: '',
    status: 'idle',
    message: '',
  });

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

  // Publish client mutation with modal tracking
  const publishMut = useMutation({
    mutationFn: api.admin.publishClient,
    onMutate: (clientId) => {
      const client = clients?.find((c: any) => c.id === clientId);
      setPublishModal({
        isOpen: true,
        clientId,
        clientName: client?.businessName || 'Client',
        status: 'loading',
        message: 'Se publică site-ul...',
      });
    },
    onSuccess: (_, clientId) => {
      const client = clients?.find((c: any) => c.id === clientId);
      setPublishModal(prev => ({
        ...prev,
        status: 'success',
        message: 'Site-ul a fost publicat cu succes!',
        url: `https://pub-61d0516b43b34d60b459185fed874027.r2.dev/${client?.slug}/index.html`,
      }));
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
    },
    onError: (error: any) => {
      setPublishModal(prev => ({
        ...prev,
        status: 'error',
        message: error?.message || 'Eroare la publicare. Încearcă din nou.',
      }));
    },
  });

  // Deploy to Cloudflare Pages mutation
  const deployPagesMut = useMutation({
    mutationFn: api.admin.deployClientToPages,
    onMutate: () => {
      setPublishModal({
        isOpen: true,
        clientId: null,
        clientName: '',
        status: 'loading',
        message: 'Se deployează pe Cloudflare Pages...',
      });
    },
    onSuccess: (data) => {
      setPublishModal(prev => ({
        ...prev,
        status: 'success',
        message: 'Site deployat cu succes pe Cloudflare Pages!',
        url: data.url,
      }));
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
    },
    onError: (error: any) => {
      setPublishModal(prev => ({
        ...prev,
        status: 'error',
        message: error?.message || 'Eroare la deploy pe Cloudflare Pages.',
      }));
    },
  });

  // Filter clients
  const filteredClients = clients?.filter((client: any) => 
    client.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper: pill badge
  const Pill = ({ children, color, bg, border }: any) => (
    <span
      className="glass-pill text-[10px] font-bold px-2.5 py-0.5 inline-flex items-center gap-1"
      style={{ color, background: bg, borderColor: border }}
    >
      {children}
    </span>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="icon-box w-10 h-10 flex items-center justify-center"
            style={{ background: 'linear-gradient(145deg,#f97316,#c2590a)' }}
          >
            <Plus className="w-5 h-5 text-white relative z-10" />
          </div>
          <h1 className="text-xl font-extrabold" style={{ color: 'var(--txt-primary)' }}>Clienți</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="neu-btn-primary flex items-center gap-2 px-4 py-2.5 text-sm"
        >
          <Plus className="w-4 h-4" />
          Client Nou
        </button>
      </div>

      <div className="gold-divider" />

      {/* ── Mini stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Clienți', value: clients?.length || 0, color: '#f97316' },
          { label: 'Cu Template',   value: clients?.filter((c: any) => c.template).length || 0, color: '#34d399' },
          { label: 'CF Pages',      value: clients?.filter((c: any) => c.domain?.includes('.pages.dev')).length || 0, color: '#60a5fa' },
          { label: 'Activi',        value: clients?.filter((c: any) => c.isActive).length || 0, color: '#4ade80' },
        ].map(({ label, value, color }) => (
          <div key={label} className="neu-card p-4 relative overflow-hidden">
            <div className="stat-ring" style={{ borderColor: `${color}18` }} />
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--txt-muted)' }}>{label}</p>
            <p className="text-2xl font-extrabold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--txt-muted)' }} />
        <input
          type="text"
          placeholder="Caută client..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="neu-input w-full pl-9 pr-4 py-2.5 text-sm"
        />
      </div>

      {/* ── Table card ── */}
      <div className="neu-card overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: 'var(--txt-muted)' }}>
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#f97316' }} />
            <span className="text-sm">Se încarcă clienții...</span>
          </div>
        ) : filteredClients?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ color: 'var(--txt-muted)' }}>
            <Search className="w-8 h-8 opacity-30" />
            <p className="text-sm">{searchTerm ? 'Niciun client găsit' : 'Niciun client încă. Creează primul!'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--neu-border)' }}>
                  {['Client', 'Template', 'Plan', 'Status', 'Publicat', 'Acțiuni'].map(h => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 text-left section-label ${h === 'Acțiuni' ? 'text-right' : ''}`}
                      style={{ background: 'rgba(0,0,0,0.12)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredClients?.map((client: any) => (
                  <tr
                    key={client.id}
                    className="table-row-hover transition-all"
                    style={{ borderBottom: '1px solid var(--neu-border)' }}
                  >
                    {/* Client info */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="icon-box w-9 h-9 flex items-center justify-center text-sm font-bold shrink-0"
                          style={{ background: 'linear-gradient(135deg,#f97316,#c2590a)', color: '#fff' }}
                        >
                          {client.businessName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--txt-primary)' }}>{client.businessName}</p>
                          <p className="text-xs" style={{ color: 'var(--txt-muted)' }}>{client.email}</p>
                          <p className="text-[10px]" style={{ color: 'var(--txt-muted)' }}>{client.slug}</p>
                        </div>
                      </div>
                    </td>

                    {/* Template */}
                    <td className="px-5 py-4">
                      {client.template
                        ? <Pill color="#60a5fa" bg="rgba(96,165,250,0.08)" border="rgba(96,165,250,0.2)">{client.template.name}</Pill>
                        : <span className="text-xs" style={{ color: 'var(--txt-muted)' }}>—</span>
                      }
                    </td>

                    {/* Plan */}
                    <td className="px-5 py-4">
                      <Pill
                        color={client.plan === 'enterprise' ? '#fbbf24' : client.plan === 'pro' ? '#34d399' : '#9ca3af'}
                        bg={client.plan === 'enterprise' ? 'rgba(251,191,36,0.08)' : client.plan === 'pro' ? 'rgba(52,211,153,0.08)' : 'rgba(156,163,175,0.08)'}
                        border={client.plan === 'enterprise' ? 'rgba(251,191,36,0.2)' : client.plan === 'pro' ? 'rgba(52,211,153,0.2)' : 'rgba(156,163,175,0.2)'}
                      >
                        {client.plan}
                      </Pill>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <Pill
                          color={client.isActive ? '#4ade80' : '#f87171'}
                          bg={client.isActive ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)'}
                          border={client.isActive ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: client.isActive ? '#4ade80' : '#f87171', boxShadow: `0 0 5px ${client.isActive ? '#4ade80' : '#f87171'}` }} />
                          {client.isActive ? 'Activ' : 'Inactiv'}
                        </Pill>
                        {client.lastPublishedAt && (
                          <Pill color="#34d399" bg="rgba(52,211,153,0.08)" border="rgba(52,211,153,0.2)">
                            <CheckCircle2 className="w-3 h-3" />Publicat
                          </Pill>
                        )}
                      </div>
                    </td>

                    {/* Last published */}
                    <td className="px-5 py-4">
                      <span className="text-xs" style={{ color: 'var(--txt-muted)' }}>
                        {client.lastPublishedAt
                          ? new Date(client.lastPublishedAt).toLocaleDateString('ro-RO')
                          : 'Niciodată'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Detalii */}
                        <button
                          onClick={() => navigate(`/clients/${client.id}`)}
                          title="Detalii"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                          style={{ background: 'linear-gradient(135deg,#f97316,#c2590a)', color: '#fff', boxShadow: '0 2px 8px rgba(249,115,22,0.3), inset 0 1px 0 rgba(255,255,255,0.2)' }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden xl:inline">Detalii</span>
                        </button>

                        {/* Ghost Login */}
                        <button
                          onClick={async () => {
                            try {
                              const res = await api.admin.impersonateClient(client.id);
                              window.open(`${CLIENT_UI_URL}?adminToken=${res.token}`, '_blank');
                            } catch (err) {
                              alert('Ghost login eșuat.');
                              console.error(err);
                            }
                          }}
                          title="Ghost Login"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                          style={{ background: 'linear-gradient(135deg,#34d399,#059669)', color: '#fff', boxShadow: '0 2px 8px rgba(52,211,153,0.25), inset 0 1px 0 rgba(255,255,255,0.2)' }}
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span className="hidden xl:inline">Ghost</span>
                        </button>

                        {/* Live site */}
                        {client.lastPublishedAt && (
                          <a
                            href={client.domain ? `https://${client.domain}` : `https://pub-61d0516b43b34d60b459185fed874027.r2.dev/${client.slug}/index.html`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Site live"
                            className="inline-flex items-center p-1.5 rounded-xl transition-all hover:scale-105"
                            style={{ background: 'var(--neu-surface2)', border: '1px solid var(--neu-border)', color: 'var(--txt-secondary)' }}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {/* Publică / Republică */}
                        <button
                          onClick={() => deployPagesMut.mutate(client.id)}
                          disabled={deployPagesMut.isPending}
                          title={client.domain ? 'Republică' : 'Publică'}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105 disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg,#fb923c,#c2410c)', color: '#fff', boxShadow: '0 2px 8px rgba(251,146,60,0.25), inset 0 1px 0 rgba(255,255,255,0.2)' }}
                        >
                          {deployPagesMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
                          <span className="hidden xl:inline">{client.domain ? 'Republică' : 'Publică'}</span>
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => setEditingClient(client)}
                          title="Editează"
                          className="inline-flex items-center p-1.5 rounded-xl transition-all hover:scale-105"
                          style={{ background: 'var(--neu-surface2)', border: '1px solid var(--neu-border)', color: 'var(--txt-secondary)' }}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => { if (confirm(`Ștergi ${client.businessName}?`)) deleteMut.mutate(client.id); }}
                          title="Șterge"
                          className="inline-flex items-center p-1.5 rounded-xl transition-all hover:scale-105"
                          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <ClientCreateModal 
        isOpen={showCreateModal || !!editingClient}
        onClose={() => {
          setShowCreateModal(false);
          setEditingClient(null);
        }}
        client={editingClient}
      />

      {/* ── Publish Status Modal ── */}
      {publishModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={() => !publishMut.isPending && setPublishModal(prev => ({ ...prev, isOpen: false }))}
          />
          <div
            className="relative w-full max-w-md rounded-2xl overflow-hidden"
            style={{
              background: 'var(--neu-surface)',
              border: '1px solid var(--neu-border)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)',
            }}
          >
            {/* Shine top */}
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)' }} />

            {/* Header */}
            <div
              className="px-6 py-4 flex items-center justify-between relative"
              style={{ borderBottom: '1px solid var(--neu-border)', background: 'rgba(0,0,0,0.12)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="icon-box w-9 h-9 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#fb923c,#c2410c)' }}
                >
                  <Rocket className="w-4 h-4 text-white relative z-10" />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--txt-primary)' }}>Publicare Site</h3>
                  {publishModal.clientName && (
                    <p className="text-xs" style={{ color: 'var(--txt-muted)' }}>{publishModal.clientName}</p>
                  )}
                </div>
              </div>
              {!publishMut.isPending && (
                <button
                  onClick={() => setPublishModal(prev => ({ ...prev, isOpen: false }))}
                  className="p-1.5 rounded-xl transition-all hover:bg-white/5"
                  style={{ color: 'var(--txt-muted)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="px-6 py-6 space-y-5">
              {/* Status icon */}
              <div className="flex justify-center">
                {publishModal.status === 'loading' && (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(251,146,60,0.1)', border: '2px solid rgba(251,146,60,0.25)', boxShadow: '0 0 24px rgba(251,146,60,0.15)' }}
                  >
                    <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#fb923c' }} />
                  </div>
                )}
                {publishModal.status === 'success' && (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(52,211,153,0.1)', border: '2px solid rgba(52,211,153,0.25)', boxShadow: '0 0 24px rgba(52,211,153,0.15)' }}
                  >
                    <CheckCircle2 className="w-7 h-7" style={{ color: '#34d399' }} />
                  </div>
                )}
                {publishModal.status === 'error' && (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(248,113,113,0.1)', border: '2px solid rgba(248,113,113,0.25)', boxShadow: '0 0 24px rgba(248,113,113,0.15)' }}
                  >
                    <AlertCircle className="w-7 h-7" style={{ color: '#f87171' }} />
                  </div>
                )}
              </div>

              <p className="text-center text-sm font-medium" style={{ color: 'var(--txt-secondary)' }}>
                {publishModal.message}
              </p>

              {/* Progress */}
              {publishModal.status === 'loading' && (
                <div className="space-y-1.5">
                  <div className="neu-inset h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full animate-pulse"
                      style={{ width: '65%', background: 'linear-gradient(90deg,#fb923c,#fbbf24)' }}
                    />
                  </div>
                  <p className="text-center text-xs" style={{ color: 'var(--txt-muted)' }}>Se generează și se încarcă pe server...</p>
                </div>
              )}

              {/* Success URL */}
              {publishModal.status === 'success' && publishModal.url && (
                <div className="neu-inset p-3">
                  <p className="text-xs mb-1" style={{ color: 'var(--txt-muted)' }}>Site-ul este live la:</p>
                  <a
                    href={publishModal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-medium hover:underline"
                    style={{ color: '#34d399' }}
                  >
                    {publishModal.url}
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                </div>
              )}

              {/* Error info */}
              {publishModal.status === 'error' && (
                <div
                  className="rounded-xl p-3 text-xs"
                  style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}
                >
                  Verifică console logs pentru detalii tehnice.
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                {publishModal.status === 'success' && (
                  <a
                    href={publishModal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg,#34d399,#059669)', color: '#fff', boxShadow: '0 4px 12px rgba(52,211,153,0.3)' }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Vezi Site-ul
                  </a>
                )}
                {publishModal.status === 'error' && (
                  <button
                    onClick={() => { if (publishModal.clientId) publishMut.mutate(publishModal.clientId); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg,#fb923c,#c2410c)', color: '#fff', boxShadow: '0 4px 12px rgba(251,146,60,0.3)' }}
                  >
                    <Rocket className="w-4 h-4" />
                    Încearcă din nou
                  </button>
                )}
                <button
                  onClick={() => setPublishModal(prev => ({ ...prev, isOpen: false }))}
                  disabled={publishMut.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                  style={{ background: 'var(--neu-surface2)', border: '1px solid var(--neu-border)', color: 'var(--txt-secondary)' }}
                >
                  {publishModal.status === 'loading' ? 'Se publică...' : 'Închide'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
