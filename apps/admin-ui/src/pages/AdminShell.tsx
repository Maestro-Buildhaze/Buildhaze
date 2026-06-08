import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, FolderOpen, LogOut, ChevronLeft, ChevronRight,
  Sun, Moon, Settings, Menu, X,
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
          className={`flex items-center gap-3 rounded-[12px] transition-all duration-200 relative overflow-hidden
            ${isCollapsed ? 'justify-center px-0 py-3 mx-1' : isMain ? 'px-3 py-2.5' : 'px-3 py-2.5'}`}
          style={isActive ? {
            background: 'linear-gradient(135deg, #f97316 0%, #c2590a 100%)',
            boxShadow: '0 4px 16px rgba(249,115,22,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
            color: '#fff',
          } : {
            color: 'var(--txt-secondary)',
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
          <item.icon className={`shrink-0 relative z-10 ${isMain ? 'w-5 h-5' : 'w-[18px] h-[18px]'}`} />
          {!isCollapsed && (
            <span className={`font-medium relative z-10 ${isMain ? 'text-[16px]' : 'text-[14px]'}`}>
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
        style={{ borderBottom: '1px solid var(--neu-border)' }}
      >
        {/* Logo */}
        <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-xl overflow-hidden" style={{ background: 'var(--neu-surface2)', border: '1px solid var(--neu-border)' }}>
          <img src="/logo.png" alt="Buildhaze Logo" className="w-7 h-7 object-contain" />
        </div>
        {!isCollapsed && (
          <div className="ml-2.5 flex-1 min-w-0">
            <p className="text-[15px] font-bold leading-tight" style={{ color: 'var(--txt-primary)' }}>Buildhaze</p>
            <p className="text-[11px] leading-tight" style={{ color: 'var(--txt-muted)' }}>Admin Panel</p>
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
            ? <div className="mx-3" style={{ height: 1, background: 'var(--neu-border)' }} />
            : <p className="px-3 pb-1" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--txt-muted)' }}>
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
        style={{ borderTop: '1px solid var(--neu-border)' }}
      >
        <button
          onClick={toggleDarkMode}
          className={`flex items-center gap-3 w-full rounded-[13px] transition-all px-3 py-2 ${isCollapsed ? 'justify-center px-0' : ''}`}
          style={{ color: 'var(--txt-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--neu-raised)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {darkMode ? <Sun className="w-[17px] h-[17px] shrink-0" /> : <Moon className="w-[17px] h-[17px] shrink-0" />}
          {!isCollapsed && <span className="text-[14px] font-medium">{darkMode ? 'Light' : 'Dark'}</span>}
        </button>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full rounded-[13px] transition-all px-3 py-2 ${isCollapsed ? 'justify-center px-0' : ''}`}
          style={{ color: 'rgba(248,113,113,0.7)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!isCollapsed && <span className="text-[14px] font-medium">Deconectare</span>}
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
    // dark is default (no class) — light adds .light-mode on <html>
    if (!darkMode) {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(v => !v);
  const handleLogout = () => { clearSession(); navigate('/login'); };

  const currentPage =
    ADMIN_NAV.find(n => n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to))?.label ||
    ADMIN_TOOLS_NAV.find(n => location.pathname.startsWith(n.to))?.label ||
    'Dashboard';

  const SIDEBAR_W = collapsed ? 72 : 240;

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--neu-bg)' }}>

      {/* ═══ Desktop Sidebar ═══ */}
      <aside
        className={`admin-sidebar hidden lg:flex fixed left-0 top-0 h-full z-50 flex-col transition-[width] duration-300 ease-in-out`}
        style={{ width: SIDEBAR_W }}
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
          className="absolute -right-3.5 top-[72px] w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 z-10"
          style={{
            background: 'var(--neu-surface2)',
            border: '1px solid var(--neu-border-hi)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)',
          }}
        >
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5" style={{ color: '#f97316' }} />
            : <ChevronLeft  className="w-3.5 h-3.5" style={{ color: '#f97316' }} />}
        </button>
      </aside>

      {/* ═══ Mobile Sidebar ═══ */}
      <aside
        className={`admin-sidebar lg:hidden fixed inset-y-0 left-0 z-50 w-[240px] flex flex-col transform transition-transform duration-300`}
        style={{ transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <SidebarContent
          collapsed={false}
          onClose={() => setMobileOpen(false)}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          handleLogout={handleLogout}
        />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ═══ Main ═══ */}
      <main
        className={`flex-1 min-h-screen flex flex-col transition-all duration-300 ${
          collapsed ? 'lg:ml-[72px]' : 'lg:ml-[240px]'
        }`}
      >
        {/* Topbar */}
        <header className="topbar-glass h-[64px] flex items-center justify-between sticky top-0 z-30 px-6">
          <div className="flex items-center gap-4">
            {/* Hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl transition-colors"
              style={{ color: 'var(--txt-secondary)', background: 'var(--neu-surface2)', border: '1px solid var(--neu-border)' }}
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2.5">
              <span className="section-label hidden sm:block">Admin</span>
              <span className="hidden sm:block" style={{ color: 'var(--txt-muted)', fontSize: 14 }}>/</span>
              <span className="text-[17px] font-bold" style={{ color: 'var(--txt-primary)' }}>{currentPage}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl transition-all hover:scale-105"
              style={{
                background: 'var(--neu-surface2)',
                border: '1px solid var(--neu-border)',
                color: 'var(--txt-secondary)',
                boxShadow: 'var(--shadow-raise)',
              }}
              title={darkMode ? 'Switch to Light' : 'Switch to Dark'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Live badge */}
            <div className="glass-pill flex items-center gap-1.5 px-3 py-1.5" style={{ borderColor: 'rgba(52,211,153,0.22)' }}>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#34d399', boxShadow: '0 0 7px #34d399', animation: 'pulse-glow 2s infinite' }}
              />
              <span className="text-xs font-bold hidden sm:inline" style={{ color: '#34d399' }}>Live</span>
            </div>

            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold"
              style={{
                background: 'linear-gradient(145deg, #f97316, #c2590a)',
                boxShadow: '0 0 14px rgba(249,115,22,0.40), inset 0 1px 0 rgba(255,255,255,0.3)',
                color: '#fff',
              }}
            >
              A
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-5 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
