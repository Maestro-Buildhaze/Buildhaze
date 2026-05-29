import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, Globe, FileText, Image, Settings, LogOut,
  Send, CheckCircle2, Loader2, ExternalLink, Menu, X,
  Sun, Moon, Languages, Link2,
} from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';
import { api } from '../lib/api';
import { clearSession, getStoredClient } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { useI18n, type Lang } from '../lib/i18n';

const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'ro', flag: '🇷🇴', label: 'RO' },
  { code: 'de', flag: '🇩🇪', label: 'DE' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
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
    { to: '/media', icon: Image, label: t.media },
    { to: '/domain', icon: Link2, label: 'Domain' },
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

  function handleLogout() {
    clearSession();
    navigate('/login');
  }

  function closeSidebar() { setSidebarOpen(false); }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--green)', boxShadow: '0 2px 12px rgba(22,163,74,0.30)' }}>
            <Globe className="w-4 h-4 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>SiteCMS</div>
            <div className="text-[10px] truncate max-w-[120px]" style={{ color: 'var(--text-3)' }}>
              {client?.businessName ?? '…'}
            </div>
          </div>
        </div>
        {/* Mobile close */}
        <button onClick={closeSidebar} className="lg:hidden p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-3)' }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={closeSidebar}
            className={({ isActive }) => clsx('sidebar-item', isActive && 'active')}
          >
            <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Publish */}
      <div className="px-3 pb-3 space-y-2" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        {client?.domain && (
          <a
            href={`https://${client.domain}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] transition-colors"
            style={{ color: 'var(--text-3)' }}
          >
            <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span className="truncate">{client.domain}</span>
          </a>
        )}

        <button
          onClick={() => publishMut.mutate()}
          disabled={publishState === 'loading'}
          className={clsx('publish-btn w-full justify-center',
            publishState === 'done' && '!bg-[var(--green-bg)] !text-[var(--green)]',
            publishState === 'error' && '!bg-[var(--red-bg)] !text-[var(--red)]',
          )}
        >
          {publishState === 'loading' ? (
            <><Loader2 className="w-4 h-4 animate-spin" />{t.publishing}</>
          ) : publishState === 'done' ? (
            <><CheckCircle2 className="w-4 h-4" />Published!</>
          ) : (
            <><Send className="w-4 h-4" />{t.publishNow}</>
          )}
        </button>

        {client?.lastPublishedAt && (
          <div className="text-[10px] text-center" style={{ color: 'var(--text-3)' }}>
            {new Date(client.lastPublishedAt).toLocaleString()}
          </div>
        )}
      </div>

      {/* Bottom: theme + lang + logout */}
      <div className="px-3 pb-4 space-y-1" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="sidebar-item w-full"
        >
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
            <div className="absolute bottom-full left-0 right-0 mb-1 card shadow-card-hover z-50 overflow-hidden">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code); setShowLang(false); }}
                  className={clsx('flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors',
                    lang === l.code
                      ? 'font-semibold'
                      : 'hover:bg-[var(--surface2)]'
                  )}
                  style={{ color: lang === l.code ? 'var(--green)' : 'var(--text-2)' }}
                >
                  {l.flag} {l.label}
                  {lang === l.code && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--green)]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="sidebar-item w-full group"
        >
          <LogOut className="w-4 h-4 flex-shrink-0 transition-colors group-hover:text-[var(--red)]" strokeWidth={1.75} />
          <div className="flex-1 text-left min-w-0">
            <div className="text-[11px] font-medium truncate" style={{ color: 'var(--text-2)' }}>{client?.email}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>{t.signOut}</div>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex flex-col w-[260px] transition-transform duration-300 lg:static lg:translate-x-0 lg:flex-shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
      >
        <SidebarContent />
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header
          className="lg:hidden flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl transition-colors"
            style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--green)' }}>
              <Globe className="w-3.5 h-3.5 text-white" strokeWidth={2.2} />
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>SiteCMS</span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl transition-colors"
            style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
