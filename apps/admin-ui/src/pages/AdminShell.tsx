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
  const isCollapsed = collapsed && !onClose;

  const navItem = (item: { to: string; icon: any; label: string }, isMain = true) => (
    <NavLink
      key={item.to}
      to={item.to}
      onClick={onClose}
      end={item.to === '/'}
      className="block"
    >
      {({ isActive }) => (
        <div
          className={`flex items-center gap-3 rounded-[13px] transition-all duration-200 relative overflow-hidden
            ${isCollapsed ? 'justify-center px-0 py-2.5 mx-1' : isMain ? 'px-3 py-2.5' : 'px-3 py-2'}`}
          style={isActive ? {
            background: 'linear-gradient(135deg, #f0b429 0%, #d4870a 100%)',
            boxShadow: '0 4px 16px rgba(240,180,41,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
            color: '#1a0800',
          } : {
            color: 'rgba(185,165,130,0.85)',
          }}
        >
          {/* active shimmer sweep */}
          {isActive && (
            <span
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(105deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0) 70%)',
              }}
            />
          )}
          <item.icon className={`shrink-0 relative z-10 ${isMain ? 'w-[18px] h-[18px]' : 'w-4 h-4'}`} />
          {!isCollapsed && (
            <span className={`font-medium relative z-10 ${isMain ? 'text-sm' : 'text-xs'}`}>
              {item.label}
            </span>
          )}
        </div>
      )}
    </NavLink>
  );

  return (
    <div className="flex flex-col h-full">

      {/* ── Logo ── */}
      <div
        className={`h-[60px] flex items-center shrink-0 ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Shiny logo mark */}
        <div
          className="icon-box w-9 h-9 flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(145deg, #f0b429, #a86000)' }}
        >
          <Sparkles className="w-4 h-4 text-white relative z-10" />
        </div>
        {!isCollapsed && (
          <div className="ml-2.5 flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight" style={{ color: 'var(--txt-primary)' }}>Buildhaze</p>
            <p className="text-[10px] leading-tight" style={{ color: 'var(--txt-muted)' }}>Admin Panel</p>
          </div>
        )}
        {onClose && (
          <button onClick={onClose} className="ml-auto p-1 rounded-lg transition-colors hover:bg-white/5">
            <X className="w-4 h-4" style={{ color: 'var(--txt-muted)' }} />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto scrollbar-none py-3 px-2 space-y-0.5">

        {/* Main nav */}
        {ADMIN_NAV.map(item => navItem(item, true))}

        {/* Divider + label */}
        <div className="pt-4 pb-1">
          {isCollapsed
            ? <div className="mx-3" style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
            : <p className="px-3 pb-1" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(180,140,60,0.5)' }}>
                Tools
              </p>
          }
        </div>

        {/* Tools nav */}
        {ADMIN_TOOLS_NAV.map(item => navItem(item, false))}
      </nav>

      {/* ── Bottom actions ── */}
      <div
        className="p-2 shrink-0 space-y-0.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <button
          onClick={toggleDarkMode}
          className={`flex items-center gap-3 w-full rounded-[13px] transition-all px-3 py-2 hover:bg-white/5 ${isCollapsed ? 'justify-center px-0' : ''}`}
          style={{ color: 'var(--txt-muted)' }}
        >
          {darkMode ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
          {!isCollapsed && <span className="text-xs font-medium">{darkMode ? 'Light' : 'Dark'}</span>}
        </button>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full rounded-[13px] transition-all px-3 py-2 ${isCollapsed ? 'justify-center px-0' : ''}`}
          style={{ color: 'rgba(248,113,113,0.7)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="text-xs font-medium">Deconectare</span>}
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

  return (
    <div className={`min-h-screen flex ${darkMode ? 'dark' : ''}`} style={{ background: 'var(--neu-bg)' }}>

      {/* ── Desktop Sidebar ── always dark neumorphic */}
      <aside
        style={{ background: '#110e0a', borderRight: '1px solid rgba(255,255,255,0.06)' }}
        className={`hidden lg:flex fixed left-0 top-0 h-full z-50 flex-col transition-all duration-300 ${
          collapsed ? 'w-[68px]' : 'w-[220px]'
        }`}
      >
        <SidebarContent
          collapsed={collapsed}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          handleLogout={handleLogout}
        />
        <button
          onClick={() => setCollapsed(v => !v)}
          style={{
            background: '#1e1a14',
            border: '1px solid rgba(255,200,80,0.15)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
          className="absolute -right-3.5 top-20 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
        >
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
            : <ChevronLeft  className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />}
        </button>
      </aside>

      {/* ── Mobile Sidebar ── */}
      <aside
        style={{ background: '#110e0a', borderRight: '1px solid rgba(255,255,255,0.06)' }}
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-[220px] flex flex-col transform transition-transform duration-300 ${
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
        <div
          className="lg:hidden fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Main content ── */}
      <main className={`flex-1 min-h-screen flex flex-col transition-all duration-300 ${
        collapsed ? 'lg:ml-[68px]' : 'lg:ml-[220px]'
      }`}>
        {/* Topbar — liquid glass */}
        <header
          className="topbar-glass h-14 flex items-center justify-between px-5 sticky top-0 z-30"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              style={{ color: 'var(--txt-secondary)' }}
              className="lg:hidden p-2 rounded-xl hover:bg-white/5 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2">
              <span className="section-label hidden sm:inline">Admin</span>
              <span className="hidden sm:inline" style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>/</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--txt-primary)' }}>{currentPage}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Live badge */}
            <div
              className="glass-pill flex items-center gap-1.5 px-3 py-1"
              style={{ borderColor: 'rgba(52,211,153,0.25)' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#34d399', boxShadow: '0 0 6px #34d399', animation: 'pulse-glow 2s infinite' }}
              />
              <span className="text-xs font-semibold" style={{ color: '#34d399' }}>Live</span>
            </div>
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold relative overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, #f0b429, #c48a00)',
                boxShadow: '0 0 12px rgba(240,180,41,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                color: '#1a0f00',
              }}
            >
              A
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-5 lg:p-7 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
