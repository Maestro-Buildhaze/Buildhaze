import React, { useState } from 'react';
import { Settings2, Bell, Shield, Database, Globe, Mail, Save, Check } from 'lucide-react';

function NeuToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="neu-toggle" onClick={() => onChange(!checked)} style={{ cursor: 'pointer' }}>
      <div className="neu-toggle-track" style={checked ? {
        background: 'linear-gradient(135deg,#f0b429,#a86000)',
        boxShadow: '0 0 14px rgba(240,180,41,0.35)',
      } : {}} />
      <div className="neu-toggle-thumb" style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }} />
    </div>
  );
}

function SectionCard({ icon, grad, title, children }: { icon: React.ReactNode; grad: string; title: string; children: React.ReactNode }) {
  return (
    <div className="neu-card p-7">
      <div className="flex items-center gap-4 mb-6 relative z-10">
        <div className="icon-box w-11 h-11 flex items-center justify-center" style={{ background: grad }}>
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--txt-primary)' }}>{title}</h2>
        </div>
        <div className="ml-auto h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.06), transparent)' }} />
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export function Settings() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    siteName: 'Buildhaze',
    adminEmail: 'admin@maestro-buildhaze.com',
    notifications: true,
    autoPublish: false,
    maintenanceMode: false,
    language: 'ro',
    timezone: 'Europe/Bucharest',
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="mb-2">
        <h1 className="text-3xl font-extrabold" style={{ color: 'var(--txt-primary)' }}>Setări</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--txt-muted)' }}>Configurează platforma și preferințele</p>
      </div>

      {/* ── General Settings ── */}
      <SectionCard icon={<Settings2 className="w-5 h-5 text-white relative z-10" />} grad="linear-gradient(135deg,#f0b429,#a86000)" title="Setări Generale">
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="section-label block mb-2">Nume Platformă</label>
            <input
              type="text"
              value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              className="neu-input w-full"
            />
          </div>
          <div>
            <label className="section-label block mb-2">Email Administrator</label>
            <input
              type="email"
              value={settings.adminEmail}
              onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
              className="neu-input w-full"
            />
          </div>
          <div>
            <label className="section-label block mb-2">Limbă</label>
            <select
              value={settings.language}
              onChange={(e) => setSettings({ ...settings, language: e.target.value })}
              className="neu-select w-full"
            >
              <option value="ro">Română</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label className="section-label block mb-2">Fus Orar</label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="neu-select w-full"
            >
              <option value="Europe/Bucharest">Europe/Bucharest (EET)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="America/New_York">America/New York (EST)</option>
            </select>
          </div>
        </div>
      </SectionCard>

      {/* ── Notifications ── */}
      <SectionCard icon={<Bell className="w-5 h-5 text-white relative z-10" />} grad="linear-gradient(135deg,#60a5fa,#2563eb)" title="Notificări">
        <div className="space-y-3">
          {[
            {
              icon: <Mail className="w-5 h-5" style={{ color: 'var(--gold)' }} />,
              label: 'Notificări Email',
              desc: 'Primește notificări despre clienți noi',
              key: 'notifications' as const,
            },
            {
              icon: <Globe className="w-5 h-5" style={{ color: '#60a5fa' }} />,
              label: 'Auto-publicare',
              desc: 'Publică automat când clientul salvează',
              key: 'autoPublish' as const,
            },
          ].map(item => (
            <div
              key={item.key}
              className="flex items-center justify-between p-4 rounded-[14px] cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: 'inset 1px 1px 4px rgba(0,0,0,0.3)',
              }}
              onClick={() => setSettings(s => ({ ...s, [item.key]: !s[item.key] }))}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--txt-primary)' }}>{item.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--txt-muted)' }}>{item.desc}</p>
                </div>
              </div>
              <NeuToggle checked={settings[item.key]} onChange={(v) => setSettings(s => ({ ...s, [item.key]: v }))} />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Security ── */}
      <SectionCard icon={<Shield className="w-5 h-5 text-white relative z-10" />} grad="linear-gradient(135deg,#f87171,#b91c1c)" title="Securitate">
        <div
          className="flex items-center justify-between p-4 rounded-[14px] cursor-pointer"
          style={{
            background: 'rgba(248,113,113,0.06)',
            border: '1px solid rgba(248,113,113,0.15)',
            boxShadow: 'inset 1px 1px 4px rgba(0,0,0,0.3)',
          }}
          onClick={() => setSettings(s => ({ ...s, maintenanceMode: !s.maintenanceMode }))}
        >
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5" style={{ color: '#f87171' }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--txt-primary)' }}>Mod Mentenanță</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--txt-muted)' }}>Blochează accesul clienților temporar</p>
            </div>
          </div>
          <div className="neu-toggle" style={{ cursor: 'pointer' }}>
            <div className="neu-toggle-track" style={settings.maintenanceMode ? {
              background: 'linear-gradient(135deg,#f87171,#b91c1c)',
              boxShadow: '0 0 14px rgba(248,113,113,0.35)',
            } : {}} />
            <div className="neu-toggle-thumb" style={{ transform: settings.maintenanceMode ? 'translateX(20px)' : 'translateX(0)' }} />
          </div>
        </div>
        {settings.maintenanceMode && (
          <div className="mt-3 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.18)' }}>
            ⚠ Modul mentenanță este activ. Clienții nu pot accesa platforma.
          </div>
        )}
      </SectionCard>

      {/* Save Button */}
      <div className="flex justify-end pb-4">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2.5 px-7 py-3 rounded-[13px] font-bold text-sm transition-all ${saved ? '' : 'neu-btn-primary'}`}
          style={saved ? {
            background: 'linear-gradient(135deg,#34d399,#059669)',
            color: '#001a0a',
            boxShadow: '0 0 20px rgba(52,211,153,0.35)',
            border: 'none',
            borderRadius: 13,
          } : {}}
        >
          {saved ? (
            <>
              <Check className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Salvat!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Salvează Setări</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
