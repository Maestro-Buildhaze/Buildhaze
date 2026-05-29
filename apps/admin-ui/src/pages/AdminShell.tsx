import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, FolderOpen, LogOut, ChevronLeft, ChevronRight,
  Sun, Moon, Sparkles, Settings, Menu, X,
  BarChart3, Heart, FileText, Archive, Layers, Globe, CreditCard,
  Gauge, GitBranch, Mail, Wrench, Download, Search
} from 'lucide-react';
import { clearSession } from '../lib/auth';

const ADMIN_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Clienți' },
  { to: '/templates', icon: FolderOpen, label: 'Template-uri' },
  { to: '/settings', icon: Settings, label: 'Setări' },
];

const ADMIN_TOOLS_NAV = [
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/health', icon: Heart, label: 'System Health' },
  { to: '/admin/activity-logs', icon: FileText, label: 'Activity Logs' },
  { to: '/admin/backups', icon: Archive, label: 'Backups' },
  { to: '/admin/bulk-ops', icon: Layers, label: 'Bulk Ops' },
  { to: '/admin/domains', icon: Globe, label: 'Domains' },
  { to: '/admin/billing', icon: CreditCard, label: 'Billing' },
  { to: '/admin/quotas', icon: Gauge, label: 'Quotas' },
  { to: '/admin/template-versions', icon: GitBranch, label: 'Versions' },
  { to: '/admin/email-templates', icon: Mail, label: 'Email Templates' },
  { to: '/admin/maintenance', icon: Wrench, label: 'Maintenance' },
  { to: '/admin/exports', icon: Download, label: 'Exports' },
  { to: '/admin/seo', icon: Search, label: 'SEO Global' },
];

function SidebarContent({
  collapsed,
  onClose,
  darkMode,
  toggleDarkMode,
  handleLogout,
}: {
  collapsed: boolean;
  onClose?: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  handleLogout: () => void;
}) {
  const navItem = (item: { to: string; icon: any; label: string }, size: 'lg' | 'sm' = 'lg') => (
    <NavLink
      key={item.to}
      to={item.to}
      onClick={onClose}
      end={item.to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
          collapsed && !onClose ? 'px-0 py-3 justify-center' : size === 'lg' ? 'px-3 py-2.5' : 'px-3 py-2'
        } ${
          isActive
            ? size === 'lg'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/25'
              : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25'
            : 'text-slate-400 hover:text-white hover:bg-white/10'
        }`
      }
    >
      <item.icon className={`shrink-0 ${size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'}`} />
      {(!collapsed || onClose) && (
        <span className={`font-medium ${size === 'sm' ? 'text-sm' : 'text-sm'}`}>{item.label}</span>
      )}
    </NavLink>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`h-16 flex items-center border-b border-white/10 shrink-0 ${collapsed && !onClose ? 'px-0 justify-center' : 'px-5'}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        {(!collapsed || onClose) && (
          <div className="ml-3 min-w-0">
            <h1 className="font-bold text-white text-sm leading-tight">Buildhaze</h1>
            <p className="text-xs text-slate-400 leading-tight">Admin Panel</p>
          </div>
        )}
        {onClose && (
          <button onClick={onClose} className="ml-auto p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-3 scrollbar-none">
        {ADMIN_NAV.map(item => navItem(item, 'lg'))}

        {/* Divider */}
        <div className={`pt-5 pb-2 ${collapsed && !onClose ? 'px-0' : ''}`}>
          {(!collapsed || onClose) && (
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Admin Tools
            </p>
          )}
          {(collapsed && !onClose) && <div className="border-t border-white/10 mx-2" />}
        </div>

        {ADMIN_TOOLS_NAV.map(item => navItem(item, 'sm'))}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white/10 space-y-1 shrink-0">
        <button
          onClick={toggleDarkMode}
          className={`flex items-center gap-3 w-full rounded-xl px-3 py-2 text-slate-400 hover:text-white hover:bg-white/10 transition-all ${collapsed && !onClose ? 'justify-center px-0' : ''}`}
        >
          {darkMode ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
          {(!collapsed || onClose) && <span className="text-sm font-medium">{darkMode ? 'Light mode' : 'Dark mode'}</span>}
        </button>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full rounded-xl px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all ${collapsed && !onClose ? 'justify-center px-0' : ''}`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {(!collapsed || onClose) && <span className="text-sm font-medium">Deconectare</span>}
        </button>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      return saved === null ? true : saved === 'true';
    }
    return true;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(v => !v);
  const handleLogout = () => { clearSession(); navigate('/login'); };

  const currentPage =
    ADMIN_NAV.find(n => n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to))?.label ||
    ADMIN_TOOLS_NAV.find(n => location.pathname.startsWith(n.to))?.label ||
    'Dashboard';

  const sidebarBg = 'bg-[#0f1117]';
  const sidebarBorder = 'border-r border-white/[0.06]';

  return (
    <div className={`min-h-screen flex ${darkMode ? 'dark' : ''} bg-slate-100 dark:bg-[#080b10]`}>

      {/* Desktop Sidebar — always dark */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 h-full z-50 flex-col transition-all duration-300 ${
          collapsed ? 'w-[72px]' : 'w-60'
        } ${sidebarBg} ${sidebarBorder}`}
      >
        <SidebarContent
          collapsed={collapsed}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          handleLogout={handleLogout}
        />
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="absolute -right-3 top-[72px] w-6 h-6 bg-[#1a1f2e] border border-white/10 rounded-full flex items-center justify-center shadow-lg hover:bg-[#252b3b] transition-colors"
        >
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            : <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 ${sidebarBg} ${sidebarBorder} transform transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent
          collapsed={false}
          onClose={() => setMobileOpen(false)}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          handleLogout={handleLogout}
        />
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <main className={`flex-1 min-h-screen flex flex-col transition-all duration-300 ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-60'}`}>
        {/* Topbar */}
        <header className="h-14 bg-white/80 dark:bg-[#0f1117]/90 backdrop-blur-md border-b border-slate-200 dark:border-white/[0.06] flex items-center justify-between px-5 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">Admin</span>
              <span className="text-xs text-slate-300 dark:text-slate-600 hidden sm:inline">/</span>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white">{currentPage}</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Live</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow">
              <span className="text-xs font-bold text-white">A</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-5 lg:p-7 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
