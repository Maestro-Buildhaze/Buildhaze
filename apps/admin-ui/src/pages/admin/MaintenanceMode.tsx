import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Wrench, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

interface MaintenanceSettings {
  isEnabled: boolean;
  message: string;
  startAt: string | null;
  endAt: string | null;
  countdownEnabled: boolean;
  theme: string;
  allowedIps: string[];
}

export function MaintenanceMode() {
  const [settings, setSettings] = useState<MaintenanceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.admin.getMaintenanceMode();
      setSettings(res.settings);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await api.admin.updateMaintenanceMode(settings);
      alert('Settings saved!');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8" style={{ color: 'var(--txt-muted)' }}>Loading...</div>;
  if (!settings) return <div className="p-8" style={{ color: 'var(--txt-muted)' }}>Failed to load settings</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="icon-box w-11 h-11 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f97316,#c2590a)' }}>
            <Wrench className="w-5 h-5 text-white relative z-10" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold" style={{ color: 'var(--txt-primary)' }}>Maintenance Mode</h1>
            <p className="text-sm" style={{ color: 'var(--txt-muted)' }}>Controlează accesul la platformă</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="neu-btn-primary px-5 py-2.5 disabled:opacity-50 self-start sm:self-auto">
          <span className="relative z-10">{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      {/* Status Alert */}
      <div
        className="flex items-center gap-3 p-4 rounded-xl"
        style={settings.isEnabled
          ? { background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.30)' }
          : { background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.30)' }}
      >
        {settings.isEnabled ? (
          <>
            <AlertTriangle className="w-6 h-6 shrink-0" style={{ color: '#fbbf24' }} />
            <div>
              <h3 className="font-semibold text-[15px]" style={{ color: '#fbbf24' }}>Maintenance Mode is ACTIVE</h3>
              <p className="text-[13px]" style={{ color: '#fbbf2499' }}>All visitors will see the maintenance page</p>
            </div>
          </>
        ) : (
          <>
            <CheckCircle className="w-6 h-6 shrink-0" style={{ color: '#34d399' }} />
            <div>
              <h3 className="font-semibold text-[15px]" style={{ color: '#34d399' }}>System is Online</h3>
              <p className="text-[13px]" style={{ color: '#34d39999' }}>Maintenance mode is disabled</p>
            </div>
          </>
        )}
      </div>

      {/* Settings Form */}
      <div className="neu-card p-6 space-y-6">
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={settings.isEnabled} onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })} className="w-5 h-5" style={{ accentColor: 'var(--accent)' }} />
          <label className="font-semibold text-[15px]" style={{ color: 'var(--txt-primary)' }}>Enable Maintenance Mode</label>
        </div>

        <div>
          <label className="section-label mb-2 block">Maintenance Message</label>
          <textarea value={settings.message} onChange={(e) => setSettings({ ...settings, message: e.target.value })} rows={3} className="neu-input" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="section-label mb-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Start Time (optional)
            </label>
            <input type="datetime-local" value={settings.startAt?.slice(0, 16) || ''} onChange={(e) => setSettings({ ...settings, startAt: e.target.value || null })} className="neu-input" />
          </div>
          <div>
            <label className="section-label mb-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> End Time (optional)
            </label>
            <input type="datetime-local" value={settings.endAt?.slice(0, 16) || ''} onChange={(e) => setSettings({ ...settings, endAt: e.target.value || null })} className="neu-input" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" checked={settings.countdownEnabled} onChange={(e) => setSettings({ ...settings, countdownEnabled: e.target.checked })} className="w-5 h-5" style={{ accentColor: 'var(--accent)' }} />
          <label className="font-semibold text-[15px]" style={{ color: 'var(--txt-primary)' }}>Show Countdown Timer</label>
        </div>

        <div>
          <label className="section-label mb-2 block">Theme</label>
          <select value={settings.theme} onChange={(e) => setSettings({ ...settings, theme: e.target.value })} className="neu-select">
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="blue">Blue</option>
          </select>
        </div>

        <div>
          <label className="section-label mb-2 block">Allowed IP Addresses (one per line)</label>
          <textarea
            value={settings.allowedIps?.join('\n') || ''}
            onChange={(e) => setSettings({ ...settings, allowedIps: e.target.value.split('\n').filter(ip => ip.trim()) })}
            rows={3}
            className="neu-input font-mono text-[13px]"
            placeholder="192.168.1.1"
          />
        </div>
      </div>
    </div>
  );
}
