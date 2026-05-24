import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Users, FolderOpen, LogOut, ChevronLeft, ChevronRight, Sun, Moon, Sparkles, Settings, Menu, X
} from 'lucide-react';
import { clearSession } from '../lib/auth';

const ADMIN_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Clienți' },
  { to: '/templates', icon: FolderOpen, label: 'Template-uri' },
  { to: '/settings', icon: Settings, label: 'Setări' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const currentPage = ADMIN_NAV.find(n => location.pathname === n.to)?.label || 'Dashboard';

  return (
    <div className="min-h-screen flex bg-warm-50 dark:bg-warm-950">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 h-full z-50 transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        } bg-white dark:bg-warm-900 border-r border-warm-200 dark:border-warm-800 flex-col`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-warm-200 dark:border-warm-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="ml-3">
              <h1 className="font-bold text-warm-800 dark:text-warm-100">Buildhaze</h1>
              <p className="text-xs text-warm-500">Admin Panel</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {ADMIN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                    : 'text-warm-600 dark:text-warm-300 hover:bg-warm-100 dark:hover:bg-warm-800'
                }`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-warm-200 dark:border-warm-800">
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-warm-600 dark:text-warm-300 hover:bg-warm-100 dark:hover:bg-warm-800 transition-all w-full mb-2"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {!collapsed && <span className="font-medium">{darkMode ? 'Light' : 'Dark'}</span>}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all w-full"
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span className="font-medium">Deconectare</span>}
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-warm-800 border border-warm-200 dark:border-warm-700 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-warm-900 border-r border-warm-200 dark:border-warm-800 transform transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Mobile Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-warm-200 dark:border-warm-800">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <h1 className="font-bold text-warm-800 dark:text-warm-100">Buildhaze</h1>
              </div>
            </div>
            <button onClick={() => setMobileOpen(false)} className="p-2">
              <X className="w-6 h-6 text-warm-500" />
            </button>
          </div>

          {/* Mobile Nav */}
          <nav className="flex-1 p-3 space-y-1">
            {ADMIN_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                      : 'text-warm-600 dark:text-warm-300 hover:bg-warm-100 dark:hover:bg-warm-800'
                  }`
                }
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Mobile Bottom */}
          <div className="p-3 border-t border-warm-200 dark:border-warm-800">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all w-full"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Deconectare</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        {/* Top Bar */}
        <header className="h-16 bg-white dark:bg-warm-900 border-b border-warm-200 dark:border-warm-800 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-warm-100 dark:hover:bg-warm-800"
            >
              <Menu className="w-6 h-6 text-warm-600 dark:text-warm-300" />
            </button>
            <h2 className="text-lg font-semibold text-warm-800 dark:text-warm-100">{currentPage}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Live</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
