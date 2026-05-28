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

  if (loading) return <div className="p-8">Loading...</div>;
  if (!settings) return <div className="p-8">Failed to load settings</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="w-6 h-6" />
          Maintenance Mode
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Status Alert */}
      <div className={`rounded-lg p-4 mb-6 ${settings.isEnabled ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
        <div className="flex items-center gap-3">
          {settings.isEnabled ? (
            <>
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-800">Maintenance Mode is ACTIVE</h3>
                <p className="text-sm text-yellow-700">All visitors will see the maintenance page</p>
              </div>
            </>
          ) : (
            <>
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-800">System is Online</h3>
                <p className="text-sm text-green-700">Maintenance mode is disabled</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-white dark:bg-warm-900 rounded-xl shadow-soft border border-warm-200 dark:border-warm-800 p-6 space-y-6">
        <div className="flex items-center gap-4">
          <input
            type="checkbox"
            checked={settings.isEnabled}
            onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })}
            className="w-5 h-5"
          />
          <label className="font-medium">Enable Maintenance Mode</label>
        </div>

        <div>
          <label className="block text-sm text-warm-500 dark:text-warm-400 mb-2">Maintenance Message</label>
          <textarea
            value={settings.message}
            onChange={(e) => setSettings({ ...settings, message: e.target.value })}
            rows={3}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-warm-500 dark:text-warm-400 mb-2 flex items-center gap-1">
              <Clock className="w-4 h-4" /> Start Time (optional)
            </label>
            <input
              type="datetime-local"
              value={settings.startAt?.slice(0, 16) || ''}
              onChange={(e) => setSettings({ ...settings, startAt: e.target.value || null })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-warm-500 dark:text-warm-400 mb-2 flex items-center gap-1">
              <Clock className="w-4 h-4" /> End Time (optional)
            </label>
            <input
              type="datetime-local"
              value={settings.endAt?.slice(0, 16) || ''}
              onChange={(e) => setSettings({ ...settings, endAt: e.target.value || null })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="checkbox"
            checked={settings.countdownEnabled}
            onChange={(e) => setSettings({ ...settings, countdownEnabled: e.target.checked })}
            className="w-5 h-5"
          />
          <label className="font-medium">Show Countdown Timer</label>
        </div>

        <div>
          <label className="block text-sm text-warm-500 dark:text-warm-400 mb-2">Theme</label>
          <select
            value={settings.theme}
            onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="blue">Blue</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-warm-500 dark:text-warm-400 mb-2">
            Allowed IP Addresses (one per line, these IPs will bypass maintenance mode)
          </label>
          <textarea
            value={settings.allowedIps?.join('\n') || ''}
            onChange={(e) => setSettings({ ...settings, allowedIps: e.target.value.split('\n').filter(ip => ip.trim()) })}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
            placeholder="192.168.1.1\n10.0.0.1"
          />
        </div>
      </div>
    </div>
  );
}
