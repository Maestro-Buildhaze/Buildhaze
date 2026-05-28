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

  if (loading) return <div className="p-8">Loading billing data...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="w-6 h-6" />
          Billing & Subscriptions
        </h1>
      </div>

      {/* MRR Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-warm-600 dark:text-warm-400">Monthly Recurring Revenue</p>
              <p className="text-2xl font-bold text-blue-700">€{mrr.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-warm-600 dark:text-warm-400">Active Subscriptions</p>
              <p className="text-2xl font-bold text-green-700">{subscriptions.filter(s => s.status === 'active').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Receipt className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-warm-600 dark:text-warm-400">Pending Invoices</p>
              <p className="text-2xl font-bold text-purple-700">{invoices.filter(i => i.status === 'open').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions */}
      <div className="bg-white dark:bg-warm-900 rounded-xl shadow-soft border border-warm-200 dark:border-warm-800 overflow-hidden mb-8">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Active Subscriptions</h2>
        </div>
        <table className="w-full">
          <thead className="bg-warm-50 dark:bg-warm-800/50">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-warm-500 dark:text-warm-400">Client</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-warm-500 dark:text-warm-400">Plan</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-warm-500 dark:text-warm-400">Status</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-warm-500 dark:text-warm-400">Monthly</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-warm-500 dark:text-warm-400">Renews</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.slice(0, 10).map((sub) => (
              <tr key={sub.id} className="border-b last:border-0 hover:bg-warm-50 dark:bg-warm-800/50">
                <td className="py-3 px-4">{sub.clientName}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 capitalize">{sub.plan}</span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 text-xs rounded ${sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-warm-100 dark:bg-warm-800 text-warm-700 dark:text-warm-300'}`}>
                    {sub.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">€{sub.priceMonthly.toFixed(2)}</td>
                <td className="py-3 px-4 text-sm text-warm-500 dark:text-warm-400">
                  {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white dark:bg-warm-900 rounded-xl shadow-soft border border-warm-200 dark:border-warm-800 overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">Recent Invoices</h2>
          <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm flex items-center gap-1">
            <Plus className="w-4 h-4" /> Create Invoice
          </button>
        </div>
        <table className="w-full">
          <thead className="bg-warm-50 dark:bg-warm-800/50">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-warm-500 dark:text-warm-400">Invoice #</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-warm-500 dark:text-warm-400">Client</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-warm-500 dark:text-warm-400">Status</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-warm-500 dark:text-warm-400">Amount</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-warm-500 dark:text-warm-400">Due Date</th>
            </tr>
          </thead>
          <tbody>
            {invoices.slice(0, 10).map((inv) => (
              <tr key={inv.id} className="border-b last:border-0 hover:bg-warm-50 dark:bg-warm-800/50">
                <td className="py-3 px-4 font-mono text-sm">{inv.invoiceNumber}</td>
                <td className="py-3 px-4">{inv.clientName}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 text-xs rounded ${
                    inv.status === 'paid' ? 'bg-green-100 text-green-700' : 
                    inv.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 
                    'bg-warm-100 dark:bg-warm-800 text-warm-700 dark:text-warm-300'
                  }`}>
                    {inv.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">€{inv.amount.toFixed(2)} {inv.currency}</td>
                <td className="py-3 px-4 text-sm">{new Date(inv.dueDate).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
