import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Mail, Edit, Send, Save } from 'lucide-react';

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

  if (loading) return <div className="p-8" style={{ color: 'var(--txt-muted)' }}>Loading templates...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="icon-box w-11 h-11 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f97316,#c2590a)' }}>
          <Mail className="w-5 h-5 text-white relative z-10" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold" style={{ color: 'var(--txt-primary)' }}>Email Templates</h1>
          <p className="text-sm" style={{ color: 'var(--txt-muted)' }}>Editează și trimite template-uri de email</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="neu-card overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--neu-border)' }}>
            <h2 className="font-bold text-[16px]" style={{ color: 'var(--txt-primary)' }}>Templates</h2>
          </div>
          <div>
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className="w-full p-4 text-left transition-colors"
                style={selected?.id === t.id
                  ? { background: 'var(--accent-glow)', borderLeft: '3px solid var(--accent)' }
                  : { borderLeft: '3px solid transparent' }}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[14px] truncate" style={{ color: 'var(--txt-primary)' }}>{t.name}</h3>
                    <p className="text-[12px] truncate" style={{ color: 'var(--txt-muted)' }}>{t.key}</p>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0"
                    style={t.isActive
                      ? { background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }
                      : { background: 'var(--neu-surface2)', color: 'var(--txt-muted)', border: '1px solid var(--neu-border)' }}>
                    {t.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {t.lastSentAt && (
                  <p className="text-[11px] mt-1" style={{ color: 'var(--txt-muted)' }}>
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
            <div className="neu-card overflow-hidden">
              <div className="px-5 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--neu-border)' }}>
                <h2 className="font-bold text-[16px] flex items-center gap-2" style={{ color: 'var(--txt-primary)' }}>
                  <Edit className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                  Edit: {selected.name}
                </h2>
                <div className="flex gap-2">
                  <button onClick={handleSendTest} disabled={sending} className="neu-btn-ghost flex items-center gap-1.5 px-4 py-2 text-sm disabled:opacity-50">
                    <Send className="w-4 h-4" />
                    {sending ? 'Sending...' : 'Test'}
                  </button>
                  <button onClick={handleSave} disabled={saving} className="neu-btn-primary flex items-center gap-1.5 px-4 py-2 text-sm disabled:opacity-50">
                    <Save className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">{saving ? 'Saving...' : 'Save'}</span>
                  </button>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="section-label mb-2 block">Subject</label>
                  <input type="text" value={selected.subject} onChange={(e) => setSelected({ ...selected, subject: e.target.value })} className="neu-input" />
                </div>
                <div>
                  <label className="section-label mb-2 block">From Name</label>
                  <input type="text" value={selected.fromName || ''} onChange={(e) => setSelected({ ...selected, fromName: e.target.value })} className="neu-input" />
                </div>
                <div>
                  <label className="section-label mb-2 block">HTML Body</label>
                  <textarea
                    value={selected.htmlBody}
                    onChange={(e) => setSelected({ ...selected, htmlBody: e.target.value })}
                    rows={10}
                    className="neu-input font-mono text-[13px]"
                  />
                </div>
                <div>
                  <label className="section-label mb-2 block">Text Body</label>
                  <textarea
                    value={selected.textBody}
                    onChange={(e) => setSelected({ ...selected, textBody: e.target.value })}
                    rows={5}
                    className="neu-input font-mono text-[13px]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={selected.isActive} onChange={(e) => setSelected({ ...selected, isActive: e.target.checked })} className="w-4 h-4" style={{ accentColor: 'var(--accent)' }} />
                  <label className="text-[14px]" style={{ color: 'var(--txt-primary)' }}>Active</label>
                </div>
              </div>
            </div>
          ) : (
            <div className="neu-card p-16 text-center">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: 'var(--txt-muted)' }} />
              <p className="text-[15px]" style={{ color: 'var(--txt-muted)' }}>Select a template to edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
