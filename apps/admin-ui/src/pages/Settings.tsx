import { useState } from 'react';
import { Settings2, Bell, Shield, Database, Globe, Mail, Save, Check } from 'lucide-react';

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
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-warm-800 dark:text-warm-100">Setări</h1>
        <p className="text-warm-500 mt-1">Configurează platforma și preferințele</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* General Settings */}
        <div className="bg-white dark:bg-warm-900 rounded-2xl shadow-soft p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-warm-800 dark:text-warm-100">Setări Generale</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-warm-600 dark:text-warm-300 mb-2">Nume Platformă</label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="w-full px-4 py-2 border border-warm-200 dark:border-warm-700 rounded-xl focus:ring-2 focus:ring-amber-500 dark:bg-warm-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-warm-600 dark:text-warm-300 mb-2">Email Administrator</label>
              <input
                type="email"
                value={settings.adminEmail}
                onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                className="w-full px-4 py-2 border border-warm-200 dark:border-warm-700 rounded-xl focus:ring-2 focus:ring-amber-500 dark:bg-warm-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-warm-600 dark:text-warm-300 mb-2">Limbă</label>
              <select
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                className="w-full px-4 py-2 border border-warm-200 dark:border-warm-700 rounded-xl focus:ring-2 focus:ring-amber-500 dark:bg-warm-800"
              >
                <option value="ro">Română</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-warm-600 dark:text-warm-300 mb-2">Fus Orar</label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="w-full px-4 py-2 border border-warm-200 dark:border-warm-700 rounded-xl focus:ring-2 focus:ring-amber-500 dark:bg-warm-800"
              >
                <option value="Europe/Bucharest">Europe/Bucharest (EET)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="America/New_York">America/New York (EST)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-warm-900 rounded-2xl shadow-soft p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-warm-800 dark:text-warm-100">Notificări</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-warm-50 dark:bg-warm-800 rounded-xl cursor-pointer">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-warm-500" />
                <div>
                  <p className="font-medium text-warm-800 dark:text-warm-100">Notificări Email</p>
                  <p className="text-sm text-warm-500">Primește notificări despre clienți noi</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                className="w-5 h-5 rounded border-warm-300 text-amber-500 focus:ring-amber-500"
              />
            </label>
            <label className="flex items-center justify-between p-4 bg-warm-50 dark:bg-warm-800 rounded-xl cursor-pointer">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-warm-500" />
                <div>
                  <p className="font-medium text-warm-800 dark:text-warm-100">Auto-publicare</p>
                  <p className="text-sm text-warm-500">Publică automat când clientul salvează</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoPublish}
                onChange={(e) => setSettings({ ...settings, autoPublish: e.target.checked })}
                className="w-5 h-5 rounded border-warm-300 text-amber-500 focus:ring-amber-500"
              />
            </label>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white dark:bg-warm-900 rounded-2xl shadow-soft p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-warm-800 dark:text-warm-100">Securitate</h2>
          </div>
          <label className="flex items-center justify-between p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl cursor-pointer">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-rose-500" />
              <div>
                <p className="font-medium text-warm-800 dark:text-warm-100">Mod Mentenanță</p>
                <p className="text-sm text-warm-500">Blochează accesul clienților temporar</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.maintenanceMode}
              onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
              className="w-5 h-5 rounded border-warm-300 text-rose-500 focus:ring-rose-500"
            />
          </label>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-soft hover:shadow-lg'
            }`}
          >
            {saved ? (
              <>
                <Check className="w-5 h-5" />
                Salvat!
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salvează Setări
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
