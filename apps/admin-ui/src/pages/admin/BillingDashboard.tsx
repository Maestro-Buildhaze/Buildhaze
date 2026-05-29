import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { CreditCard, DollarSign, Receipt, TrendingUp, Plus } from 'lucide-react';

interface Subscription {
  id: string;
  clientId: string;
  clientName: string;
  plan: string;
  status: string;
  priceMonthly: number;
  currentPeriodEnd: string;
}

interface Invoice {
  id: string;
  clientName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string;
}

export function BillingDashboard() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [mrr, setMrr] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [subRes, invRes] = await Promise.all([
        api.admin.getSubscriptions(),
        api.admin.getInvoices(),
      ]);
      setSubscriptions(subRes.subscriptions || []);
      setMrr(subRes.mrr || 0);
      setInvoices(invRes.invoices || []);
    } catch (err) {
      console.error('Failed to load billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8" style={{ color: 'var(--txt-muted)' }}>Se încarcă datele de billing...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="icon-box w-10 h-10 flex items-center justify-center"
          style={{ background: 'linear-gradient(145deg,#f97316,#c2590a)' }}
        >
          <CreditCard className="w-5 h-5 text-white relative z-10" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--txt-primary)' }}>Billing & Subscriptions</h1>
          <p className="text-sm" style={{ color: 'var(--txt-muted)' }}>Gestionează abonamente și facturi</p>
        </div>
      </div>

      <div className="gold-divider" />

      {/* MRR Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="neu-card p-5 relative overflow-hidden">
          <div className="stat-ring" style={{ borderColor: 'rgba(96,165,250,0.15)' }} />
          <div className="flex items-center gap-3 relative z-10">
            <div className="icon-box w-11 h-11 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#60a5fa,#2563eb)' }}>
              <TrendingUp className="w-5 h-5 text-white relative z-10" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--txt-muted)' }}>Monthly Recurring Revenue</p>
              <p className="text-2xl font-extrabold" style={{ color: '#60a5fa' }}>€{mrr.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="neu-card p-5 relative overflow-hidden">
          <div className="stat-ring" style={{ borderColor: 'rgba(52,211,153,0.15)' }} />
          <div className="flex items-center gap-3 relative z-10">
            <div className="icon-box w-11 h-11 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#34d399,#059669)' }}>
              <DollarSign className="w-5 h-5 text-white relative z-10" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--txt-muted)' }}>Active Subscriptions</p>
              <p className="text-2xl font-extrabold" style={{ color: '#34d399' }}>{subscriptions.filter(s => s.status === 'active').length}</p>
            </div>
          </div>
        </div>
        <div className="neu-card p-5 relative overflow-hidden">
          <div className="stat-ring" style={{ borderColor: 'rgba(167,139,250,0.15)' }} />
          <div className="flex items-center gap-3 relative z-10">
            <div className="icon-box w-11 h-11 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#a78bfa,#7c3aed)' }}>
              <Receipt className="w-5 h-5 text-white relative z-10" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--txt-muted)' }}>Pending Invoices</p>
              <p className="text-2xl font-extrabold" style={{ color: '#a78bfa' }}>{invoices.filter(i => i.status === 'open').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions */}
      <div className="neu-card overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--neu-border)' }}>
          <div className="icon-box w-7 h-7 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#34d399,#059669)' }}>
            <DollarSign className="w-3.5 h-3.5 text-white relative z-10" />
          </div>
          <h2 className="font-bold text-base" style={{ color: 'var(--txt-primary)' }}>Active Subscriptions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--neu-border)' }}>
                {['Client', 'Plan', 'Status', 'Monthly', 'Renews'].map((h, i) => (
                  <th key={h} className={`px-5 py-3.5 section-label text-left ${i === 3 ? 'text-right' : ''}`}
                    style={{ background: 'rgba(0,0,0,0.15)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subscriptions.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10" style={{ color: 'var(--txt-muted)' }}>Niciun abonament activ</td></tr>
              ) : subscriptions.slice(0, 10).map((sub) => (
                <tr key={sub.id} className="table-row-hover transition-all" style={{ borderBottom: '1px solid var(--neu-border)' }}>
                  <td className="py-3.5 px-5" style={{ color: 'var(--txt-primary)' }}>{sub.clientName}</td>
                  <td className="py-3.5 px-5">
                    <span className="glass-pill text-[11px] font-bold px-2.5 py-0.5" style={{ color: '#60a5fa', borderColor: 'rgba(96,165,250,0.25)', background: 'rgba(96,165,250,0.08)' }}>{sub.plan}</span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="glass-pill text-[11px] font-bold px-2.5 py-0.5"
                      style={sub.status === 'active'
                        ? { color: '#34d399', borderColor: 'rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.08)' }
                        : { color: 'var(--txt-muted)', borderColor: 'var(--neu-border)', background: 'var(--glass-bg)' }
                      }>{sub.status}</span>
                  </td>
                  <td className="py-3.5 px-5 text-right font-semibold" style={{ color: '#f97316' }}>€{sub.priceMonthly.toFixed(2)}</td>
                  <td className="py-3.5 px-5 text-sm" style={{ color: 'var(--txt-muted)' }}>
                    {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="neu-card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--neu-border)' }}>
          <div className="flex items-center gap-2">
            <div className="icon-box w-7 h-7 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f97316,#c2590a)' }}>
              <Receipt className="w-3.5 h-3.5 text-white relative z-10" />
            </div>
            <h2 className="font-bold text-base" style={{ color: 'var(--txt-primary)' }}>Facturi Recente</h2>
          </div>
          <button className="neu-btn-primary flex items-center gap-1.5 px-3 py-1.5 text-sm">
            <Plus className="w-4 h-4" /> Create Invoice
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--neu-border)' }}>
                {['Invoice #', 'Client', 'Status', 'Amount', 'Due Date'].map((h, i) => (
                  <th key={h} className={`px-5 py-3.5 section-label text-left ${i === 3 ? 'text-right' : ''}`}
                    style={{ background: 'rgba(0,0,0,0.15)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10" style={{ color: 'var(--txt-muted)' }}>Nicio factură încă</td></tr>
              ) : invoices.slice(0, 10).map((inv) => (
                <tr key={inv.id} className="table-row-hover transition-all" style={{ borderBottom: '1px solid var(--neu-border)' }}>
                  <td className="py-3.5 px-5 font-mono text-sm" style={{ color: 'var(--txt-secondary)' }}>{inv.invoiceNumber}</td>
                  <td className="py-3.5 px-5" style={{ color: 'var(--txt-primary)' }}>{inv.clientName}</td>
                  <td className="py-3.5 px-5">
                    <span className="glass-pill text-[11px] font-bold px-2.5 py-0.5"
                      style={
                        inv.status === 'paid'
                          ? { color: '#34d399', borderColor: 'rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.08)' }
                          : inv.status === 'open'
                          ? { color: '#fbbf24', borderColor: 'rgba(251,191,36,0.25)', background: 'rgba(251,191,36,0.08)' }
                          : { color: 'var(--txt-muted)', borderColor: 'var(--neu-border)', background: 'var(--glass-bg)' }
                      }>{inv.status}</span>
                  </td>
                  <td className="py-3.5 px-5 text-right font-semibold" style={{ color: '#f97316' }}>€{inv.amount.toFixed(2)} {inv.currency}</td>
                  <td className="py-3.5 px-5 text-sm" style={{ color: 'var(--txt-muted)' }}>{new Date(inv.dueDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
