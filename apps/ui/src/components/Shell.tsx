import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, Globe, FileText, Image, Settings, LogOut,
  Send, CheckCircle2, Loader2, ExternalLink, Menu, X,
  Sun, Moon, Languages, Link2, Newspaper, Zap, Bot, Calendar, ArrowLeft,
} from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';
import { api } from '../lib/api';
import { clearSession, getStoredClient } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { useI18n, type Lang } from '../lib/i18n';

const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'ro', flag: '🇷🇴', label: 'Română' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isEditorRoute = location.pathname === '/site';
  const queryClient = useQueryClient();
  const storedClient = getStoredClient();
  const [publishState, setPublishState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  const { t, lang, setLang } = useI18n();

  const NAV = [
    { to: '/', icon: LayoutDashboard, label: t.dashboard, exact: true },
    { to: '/site', icon: Globe, label: t.site },
    { to: '/blog', icon: FileText, label: t.blog },
    { to: '/news', icon: Newspaper, label: 'News' },
    { to: '/media', icon: Image, label: t.media },
    { to: '/domain', icon: Link2, label: 'Domain' },
    { to: '/chatbot', icon: Bot, label: 'Chatbot AI' },
    { to: '/bookings', icon: Calendar, label: 'Programări' },
    { to: '/settings', icon: Settings, label: t.settings },
  ];

  const { data: client } = useQuery({
    queryKey: ['me'],
    queryFn: api.auth.me,
    initialData: storedClient ?? undefined,
  });

  const publishMut = useMutation({
    mutationFn: api.publish.deploy,
    onMutate: () => setPublishState('loading'),
    onSuccess: () => {
      setPublishState('done');
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setTimeout(() => setPublishState('idle'), 3000);
    },
    onError: () => {
      setPublishState('error');
      setTimeout(() => setPublishState('idle'), 3000);
    },
  });

  function handleLogout() { clearSession(); navigate('/login'); }
  function closeSidebar() { setSidebarOpen(false); }

  const initials = client?.businessName
    ? client.businessName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* ── Logo / Brand ── */}
      <div className="px-4 pt-5 pb-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo */}
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-xl overflow-hidden" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            <img src="/logo.png" alt="Buildhaze Logo" className="w-8 h-8 object-contain" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>
              Buildhaze
            </div>
            <div className="text-[10px] font-medium truncate max-w-[130px]" style={{ color: 'var(--text-3)' }}>
              {client?.businessName ?? 'Loading…'}
            </div>
          </div>
        </div>
        <button onClick={closeSidebar}
          className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--text-3)', background: 'var(--surface2)' }}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={closeSidebar}
            className={({ isActive }) => clsx('sidebar-item w-full', isActive && 'active')}
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <span className="flex-1">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Publish CTA ── */}
      <div className="px-3 pb-3 space-y-2.5"
        style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>

        {client?.domain && (
          <a href={`https://${client.domain}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all group"
            style={{ color: 'var(--text-3)', background: 'var(--surface2)', border: '1px solid var(--border)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--green)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'}
          >
            <ExternalLink className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
            <span className="truncate">{client.domain}</span>
          </a>
        )}

        <button
          onClick={() => publishMut.mutate()}
          disabled={publishState === 'loading'}
          className={clsx(
            'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all',
            publishState === 'done'
              ? 'text-[var(--green)]'
              : publishState === 'error'
              ? 'text-[var(--red)]'
              : 'text-white',
          )}
          style={publishState === 'done' ? {
            background: 'var(--green-bg)',
            border: '1px solid var(--green-border)',
            boxShadow: 'var(--glow-green)',
          } : publishState === 'error' ? {
            background: 'var(--red-bg)',
            border: '1px solid rgba(220,38,38,0.25)',
          } : {
            background: 'linear-gradient(180deg, var(--green-mid) 0%, var(--green) 100%)',
            boxShadow: 'var(--btn-3d-green)',
          }}
        >
          {publishState === 'loading' ? (
            <><Loader2 className="w-4 h-4 animate-spin" /><span>{t.publishing}</span></>
          ) : publishState === 'done' ? (
            <><CheckCircle2 className="w-4 h-4" /><span>Published!</span></>
          ) : publishState === 'error' ? (
            <><Zap className="w-4 h-4" /><span>Try again</span></>
          ) : (
            <><Send className="w-4 h-4" /><span>{t.publishNow}</span></>
          )}
        </button>

        {client?.lastPublishedAt && (
          <div className="text-[10px] text-center font-medium" style={{ color: 'var(--text-4)' }}>
            Last: {new Date(client.lastPublishedAt).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {/* ── Bottom controls ── */}
      <div className="px-3 pb-4 space-y-0.5"
        style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>

        {/* Theme toggle */}
        <button onClick={toggleTheme} className="sidebar-item w-full">
          {theme === 'light'
            ? <Moon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
            : <Sun className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />}
          <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
        </button>

        {/* Language picker */}
        <div className="relative">
          <button onClick={() => setShowLang(v => !v)} className="sidebar-item w-full">
            <Languages className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
            <span>{LANGS.find(l => l.code === lang)?.flag} {lang.toUpperCase()}</span>
          </button>
          {showLang && (
            <div className="absolute bottom-full left-0 right-0 mb-1 rounded-2xl overflow-hidden z-50"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)' }}>
              {LANGS.map((l) => (
                <button key={l.code}
                  onClick={() => { setLang(l.code); setShowLang(false); }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm transition-colors"
                  style={{
                    color: lang === l.code ? 'var(--green)' : 'var(--text-2)',
                    fontWeight: lang === l.code ? 600 : 400,
                    background: lang === l.code ? 'var(--green-bg)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (lang !== l.code) (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}
                  onMouseLeave={e => { if (lang !== l.code) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span>{l.flag}</span>
                  <span>{l.label}</span>
                  {lang === l.code && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green)' }} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User / Logout */}
        <button onClick={handleLogout} className="sidebar-item w-full group">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--green-mid), var(--cyan))' }}>
            {initials}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-2)' }}>
              {client?.email ?? '…'}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>{t.signOut}</div>
          </div>
          <LogOut className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all"
            style={{ color: 'var(--red)' }} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );

  if (isEditorRoute) {
    return (
      <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
        {/* ── Editor top bar ── */}
        <div className="flex items-center gap-3 px-4 h-12 flex-shrink-0"
          style={{
            background: 'var(--surface-frost)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--border)',
          }}>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ color: 'var(--text-2)', background: 'var(--surface2)', border: '1px solid var(--border)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
            Dashboard
          </button>
          <div className="w-px h-4 flex-shrink-0" style={{ background: 'var(--border)' }} />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(145deg, var(--green-mid), var(--green))', boxShadow: 'var(--btn-3d-green)' }}>
              <Globe className="w-3 h-3 text-white" strokeWidth={2.2} />
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Site &amp; Pages</span>
          </div>
          <div className="flex-1" />
          <button onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--text-3)', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--green-mid), var(--cyan))' }}>
              {initials}
            </div>
            <span className="text-[11px] font-medium hidden sm:block truncate max-w-[140px]" style={{ color: 'var(--text-3)' }}>
              {client?.email ?? '…'}
            </span>
          </div>
        </div>
        {/* ── Full-height editor ── */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(6px)' }}
          onClick={closeSidebar} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex flex-col w-[260px] transition-transform duration-300 ease-out lg:static lg:translate-x-0 lg:flex-shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{
          background: 'var(--surface-frost)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          borderRight: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <SidebarContent />
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{
            background: 'var(--surface-frost)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--border)',
          }}>
          <button onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
            style={{ background: 'var(--surface2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
            <Menu className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(145deg, var(--green-mid), var(--green))', boxShadow: 'var(--btn-3d-green)' }}>
              <Globe className="w-3.5 h-3.5 text-white" strokeWidth={2.2} />
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Buildhaze</span>
          </div>
          <button onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
            style={{ background: 'var(--surface2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </header>

        {/* Page content */}
        <main className={isEditorRoute ? 'flex-1 overflow-hidden flex flex-col' : 'flex-1 overflow-y-auto'}>
          {isEditorRoute ? children : (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
