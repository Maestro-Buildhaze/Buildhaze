import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Mail, Edit, Send, Save, X } from 'lucide-react';

interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  fromName: string | null;
  fromEmail: string | null;
  isActive: boolean;
  lastSentAt: string | null;
}

export function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selected, setSelected] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await api.admin.getEmailTemplates();
      setTemplates(res.templates || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.admin.updateEmailTemplate(selected.key, {
        subject: selected.subject,
        htmlBody: selected.htmlBody,
        textBody: selected.textBody,
        isActive: selected.isActive,
      });
      await loadTemplates();
      alert('Template saved!');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!selected) return;
    const toEmail = prompt('Enter email address for test:');
    if (!toEmail) return;
    
    setSending(true);
    try {
      await api.admin.sendTestEmail(selected.key, toEmail);
      alert('Test email sent!');
    } catch (err) {
      console.error('Send failed:', err);
      alert('Failed to send');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="p-8">Loading templates...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="w-6 h-6" />
          Email Templates
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="bg-white dark:bg-warm-900 rounded-xl shadow-soft border border-warm-200 dark:border-warm-800">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Templates</h2>
          </div>
          <div className="divide-y">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className={`w-full p-4 text-left hover:bg-warm-50 dark:bg-warm-800/50 ${selected?.id === t.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{t.name}</h3>
                    <p className="text-sm text-warm-500 dark:text-warm-400">{t.key}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-warm-100 dark:bg-warm-800 text-warm-700 dark:text-warm-300'}`}>
                    {t.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {t.lastSentAt && (
                  <p className="text-xs text-gray-400 mt-1">
                    Last sent: {new Date(t.lastSentAt).toLocaleDateString()}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-white dark:bg-warm-900 rounded-xl shadow-soft border border-warm-200 dark:border-warm-800">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="font-semibold flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  Edit: {selected.name}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleSendTest}
                    disabled={sending}
                    className="px-3 py-1 bg-warm-100 dark:bg-warm-800 rounded hover:bg-warm-200 dark:bg-warm-700 flex items-center gap-1"
                  >
                    <Send className="w-4 h-4" />
                    {sending ? 'Sending...' : 'Test'}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm text-warm-500 dark:text-warm-400">Subject</label>
                  <input
                    type="text"
                    value={selected.subject}
                    onChange={(e) => setSelected({ ...selected, subject: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm text-warm-500 dark:text-warm-400">From Name</label>
                  <input
                    type="text"
                    value={selected.fromName || ''}
                    onChange={(e) => setSelected({ ...selected, fromName: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm text-warm-500 dark:text-warm-400">HTML Body</label>
                  <textarea
                    value={selected.htmlBody}
                    onChange={(e) => setSelected({ ...selected, htmlBody: e.target.value })}
                    rows={10}
                    className="w-full border rounded px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-warm-500 dark:text-warm-400">Text Body</label>
                  <textarea
                    value={selected.textBody}
                    onChange={(e) => setSelected({ ...selected, textBody: e.target.value })}
                    rows={5}
                    className="w-full border rounded px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.isActive}
                    onChange={(e) => setSelected({ ...selected, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label>Active</label>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-warm-50 dark:bg-warm-800/50 rounded-lg p-8 text-center text-warm-500 dark:text-warm-400">
              <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Select a template to edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
