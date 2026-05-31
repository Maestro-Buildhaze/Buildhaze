import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Loader2, Eye, EyeOff, Sun, Moon } from 'lucide-react';
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
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden"
      style={{ background: 'var(--bg)' }}>

      {/* ── Ambient blobs ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="blob blob-green w-80 h-80 top-[-12%] left-[-8%]" />
        <div className="blob blob-teal blob-2 w-72 h-72 bottom-[-10%] right-[-6%]" />
        <div className="blob blob-lime blob-3 w-56 h-56 top-[45%] right-[8%]" />
        <div className="blob blob-cyan blob-4 w-44 h-44 bottom-[25%] left-[4%]" />
      </div>

      {/* ── Top bar ── */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
        {LANGS.map((l) => (
          <button key={l.code} onClick={() => setLang(l.code)}
            className="text-sm leading-none px-1.5 py-1 rounded-lg transition-all"
            style={{
              opacity: lang === l.code ? 1 : 0.4,
              background: lang === l.code ? 'var(--surface2)' : 'transparent',
              border: lang === l.code ? '1px solid var(--border)' : '1px solid transparent',
            }}>
            {l.flag}
          </button>
        ))}
        <button onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
          style={{ background: 'var(--surface2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
          {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ── Login card ── */}
      <div className="relative z-10 w-full max-w-[420px] animate-scale-in">

        {/* Logo + headline */}
        <div className="text-center mb-7">
          {/* 3D plastic logo */}
          <div className="inline-flex items-center justify-center w-18 h-18 rounded-3xl mb-5 shine-on-hover"
            style={{
              width: 72, height: 72,
              background: 'linear-gradient(145deg, var(--green-mid) 0%, var(--green) 100%)',
              boxShadow: 'var(--btn-3d-green), 0 0 40px var(--green-glow2)',
            }}>
            <Globe className="w-9 h-9 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-[28px] font-bold tracking-tight leading-tight" style={{ color: 'var(--text)' }}>
            {t.welcomeBack}
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--text-3)' }}>
            {t.signInSubtitle}
          </p>
        </div>

        {/* Clay form card */}
        <div className="clay-card p-7">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="form-group">
              <label className="label">{t.emailAddress}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="form-group">
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
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors p-1"
                  style={{ color: 'var(--text-3)' }}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl text-sm font-medium"
                style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.18)' }}>
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--red)' }} />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white transition-all"
              style={{
                background: loading
                  ? 'var(--green)'
                  : 'linear-gradient(180deg, var(--green-mid) 0%, var(--green) 100%)',
                boxShadow: loading ? 'none' : 'var(--btn-3d-green)',
                opacity: loading ? 0.75 : 1,
              }}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? t.signingIn : t.signIn}
            </button>
          </form>
        </div>

        {/* Powered-by strip */}
        <div className="mt-4 px-4 py-2.5 rounded-2xl flex items-center gap-2.5"
          style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)' }}>
          <span className="status-dot live" />
          <p className="text-[11px] font-medium" style={{ color: 'var(--green)' }}>
            {t.poweredBy}
          </p>
        </div>
      </div>
    </div>
  );
}
