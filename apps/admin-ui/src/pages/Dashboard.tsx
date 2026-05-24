import { useQuery } from '@tanstack/react-query';
import { Users, FolderOpen, Globe, TrendingUp, Activity, Zap, ArrowUpRight, Sparkles } from 'lucide-react';
import { api } from '../lib/api';

export function Dashboard() {
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: api.admin.getClients,
  });

  const { data: templates } = useQuery({
    queryKey: ['admin-templates'],
    queryFn: api.admin.getTemplates,
  });

  const stats = {
    totalClients: clients?.length || 0,
    activeClients: clients?.filter((c: any) => c.isActive).length || 0,
    totalTemplates: templates?.length || 0,
    withDomain: clients?.filter((c: any) => c.domain).length || 0,
    published: clients?.filter((c: any) => c.lastPublishedAt).length || 0,
  };

  const statCards = [
    { label: 'Clienți Total', value: stats.totalClients, icon: Users, color: 'from-amber-500 to-orange-500', trend: '+12%' },
    { label: 'Clienți Activi', value: stats.activeClients, icon: Activity, color: 'from-green-500 to-emerald-500', trend: '+8%' },
    { label: 'Template-uri', value: stats.totalTemplates, icon: FolderOpen, color: 'from-orange-500 to-amber-500', trend: '+3' },
    { label: 'Cu Domeniu', value: stats.withDomain, icon: Globe, color: 'from-rose-500 to-pink-500', trend: '+2' },
    { label: 'Publicați', value: stats.published, icon: Zap, color: 'from-purple-500 to-violet-500', trend: '+5' },
    { label: 'Conversie', value: '94%', icon: TrendingUp, color: 'from-blue-500 to-cyan-500', trend: '+2%' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-warm-800 dark:text-warm-100">Dashboard</h1>
            <p className="text-warm-500">Bine ai venit în panoul de administrare Buildhaze</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-warm-900 rounded-2xl shadow-soft p-5 hover:shadow-soft-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-green-600 flex items-center gap-0.5">
                {stat.trend}
                <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
            <p className="text-2xl font-bold text-warm-800 dark:text-warm-100">{stat.value}</p>
            <p className="text-sm text-warm-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Clients */}
        <div className="bg-white dark:bg-warm-900 rounded-2xl shadow-soft p-6">
          <h3 className="text-lg font-semibold text-warm-800 dark:text-warm-100 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            Clienți Recenți
          </h3>
          {clientsLoading ? (
            <div className="text-center py-8 text-warm-500">Se încarcă...</div>
          ) : clients?.slice(0, 5).map((client: any) => (
            <div key={client.id} className="flex items-center gap-3 py-3 border-b border-warm-100 dark:border-warm-800 last:border-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center text-lg font-semibold text-amber-600 dark:text-amber-400">
                {client.businessName.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-medium text-warm-800 dark:text-warm-100">{client.businessName}</p>
                <p className="text-sm text-warm-500">{client.email}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${client.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30'}`}>
                {client.isActive ? 'Activ' : 'Inactiv'}
              </span>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-warm-900 rounded-2xl shadow-soft p-6">
          <h3 className="text-lg font-semibold text-warm-800 dark:text-warm-100 mb-4">Acțiuni Rapide</h3>
          <div className="space-y-3">
            <a href="/admin/clients" className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 hover:shadow-soft transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-warm-800 dark:text-warm-100">Clienți</p>
                <p className="text-sm text-warm-500">Gestionează toți clienții</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-amber-500" />
            </a>
            <a href="/admin/templates" className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-rose-50 dark:from-orange-900/20 dark:to-rose-900/20 hover:shadow-soft transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-warm-800 dark:text-warm-100">Template-uri</p>
                <p className="text-sm text-warm-500">Încarcă și gestionează template-uri</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-orange-500" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
