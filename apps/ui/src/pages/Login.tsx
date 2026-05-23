import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Loader2, Eye, EyeOff, Sun, Moon, Languages } from 'lucide-react';
import { api } from '../lib/api';
import { saveSession } from '../lib/auth';
import { useI18n, type Lang } from '../lib/i18n';
import { useTheme } from '../lib/theme';

const LANGS: { code: Lang; flag: string }[] = [
  { code: 'en', flag: '🇬🇧' },
  { code: 'ro', flag: '🇷🇴' },
  { code: 'de', flag: '🇩🇪' },
];

export function Login() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const { theme, toggle: toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token, client } = await api.auth.login(email, password);
      saveSession(token, client);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* ── Blobs ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="blob blob-green w-72 h-72 sm:w-96 sm:h-96 top-[-10%] left-[-10%]" />
        <div className="blob blob-yellow blob-2 w-64 h-64 sm:w-80 sm:h-80 bottom-[-8%] right-[-8%]" />
        <div className="blob blob-lime blob-3 w-48 h-48 sm:w-64 sm:h-64 top-[40%] right-[10%]" />
        <div className="blob blob-teal blob-4 w-40 h-40 sm:w-56 sm:h-56 bottom-[20%] left-[5%]" />
      </div>

      {/* ── Top bar: theme + lang ── */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        {LANGS.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            className="text-base leading-none transition-opacity"
            style={{ opacity: lang === l.code ? 1 : 0.35 }}
            title={l.code.toUpperCase()}
          >
            {l.flag}
          </button>
        ))}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl transition-colors"
          style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Card ── */}
      <div className="relative z-10 w-full max-w-[400px] animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 shadow-lg"
            style={{ background: 'var(--green)', boxShadow: '0 8px 32px rgba(22,163,74,0.30)' }}
          >
            <Globe className="w-8 h-8 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            {t.welcomeBack}
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-3)' }}>
            {t.signInSubtitle}
          </p>
        </div>

        {/* Form card */}
        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 32px rgba(0,0,0,0.07)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">{t.emailAddress}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">{t.password}</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-11"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-3)' }}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="px-4 py-3 rounded-xl text-sm font-medium"
                style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.15)' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? t.signingIn : t.signIn}
            </button>
          </form>
        </div>

        {/* Yellow accent strip */}
        <div
          className="mt-5 px-5 py-3 rounded-2xl flex items-center gap-3"
          style={{ background: 'var(--yellow-bg)', border: '1px solid rgba(234,179,8,0.25)' }}
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--yellow-light)' }} />
          <p className="text-xs font-medium" style={{ color: 'var(--yellow)' }}>
            {t.poweredBy}
          </p>
        </div>
      </div>
    </div>
  );
}
