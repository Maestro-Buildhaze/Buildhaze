import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bot, Save, Loader2, Plus, Trash2, ChevronDown, ChevronUp,
  MessageCircle, Settings, Eye, ToggleLeft, ToggleRight, Rocket, Zap,
} from 'lucide-react';
import { api } from '../lib/api';
import clsx from 'clsx';

interface FAQ { question: string; answer: string }

const TONES = [
  { value: 'professional', label: 'Profesional' },
  { value: 'friendly', label: 'Prietenos' },
  { value: 'formal', label: 'Formal' },
];
const POSITIONS = [
  { value: 'bottom-right', label: 'Dreapta-jos' },
  { value: 'bottom-left', label: 'Stânga-jos' },
];
const LANGUAGES = [
  { value: 'ro', label: '🇷🇴 Română' },
  { value: 'en', label: '🇬🇧 English' },
];
const COLORS = ['#059669','#2563eb','#7c3aed','#dc2626','#ea580c','#0891b2','#1e293b'];

export function ChatbotSettings() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'config'|'faq'|'preview'>('config');
  const [form, setForm] = useState<any>(null);
  const [faq, setFaq] = useState<FAQ[]>([]);
  const [saved, setSaved] = useState(false);
  const [publishSaved, setPublishSaved] = useState(false);

  const { isLoading, data: configData } = useQuery({
    queryKey: ['chatbot-config'],
    queryFn: () => api.chat.getConfig(),
  });

  useEffect(() => {
    if (!configData) return;
    setForm({
      enabled: configData.enabled ?? false,
      botName: configData.botName ?? 'Assistant',
      welcomeMessage: configData.welcomeMessage ?? 'Bună ziua! Cu ce vă pot ajuta?',
      tone: configData.tone ?? 'professional',
      language: configData.language ?? 'ro',
      primaryColor: configData.primaryColor ?? '#059669',
      position: configData.position ?? 'bottom-right',
      businessInfo: configData.businessInfo ?? '',
      bookingEnabled: configData.bookingEnabled ?? false,
      offlineMessage: configData.offlineMessage ?? 'Momentan offline. Lăsați un mesaj.',
    });
    try {
      const raw = configData.faq;
      setFaq(raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : []);
    } catch { setFaq([]); }
  }, [configData]);

  const saveMutation = useMutation({
    mutationFn: (payload: any) => api.chat.updateConfig(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chatbot-config'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => api.publish.deploy(),
    onSuccess: () => { setPublishSaved(true); setTimeout(() => setPublishSaved(false), 3000); },
  });

  async function handleSaveAndPublish() {
    if (!form) return;
    await saveMutation.mutateAsync({ ...form, faq: faq.filter(f => f.question.trim()) });
    publishMutation.mutate();
  }

  function set(key: string, val: any) {
    setForm((f: any) => ({ ...f, [key]: val }));
  }

  function addFaq() {
    setFaq(f => [...f, { question: '', answer: '' }]);
  }
  function removeFaq(i: number) {
    setFaq(f => f.filter((_, idx) => idx !== i));
  }
  function updateFaq(i: number, key: keyof FAQ, val: string) {
    setFaq(f => f.map((item, idx) => idx === i ? { ...item, [key]: val } : item));
  }

  function handleSave() {
    if (!form) return;
    saveMutation.mutate({ ...form, faq: faq.filter(f => f.question.trim()) });
  }

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="animate-spin text-primary-600" size={28} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
            <Bot size={20} className="text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Chatbot AI</h1>
            <p className="text-sm text-gray-500">Configurați asistentul virtual pentru website</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => set('enabled', !form.enabled)}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors',
              form.enabled ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
          >
            {form.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            {form.enabled ? 'Activ' : 'Inactiv'}
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saved ? 'Salvat!' : 'Salvează'}
          </button>
          <button
            onClick={handleSaveAndPublish}
            disabled={saveMutation.isPending || publishMutation.isPending}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {(saveMutation.isPending || publishMutation.isPending) ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
            {publishSaved ? 'Publicat!' : 'Salvează & Publică'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([['config','Configurare',Settings],['faq','FAQ / Cunoștințe',MessageCircle],['preview','Preview',Eye]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {/* Config Tab */}
      {tab === 'config' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Numele botului</label>
              <input value={form.botName} onChange={e => set('botName', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Limbă</label>
              <select value={form.language} onChange={e => set('language', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Ton</label>
              <select value={form.tone} onChange={e => set('tone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Poziție</label>
              <select value={form.position} onChange={e => set('position', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Mesaj de bun-venit</label>
            <input value={form.welcomeMessage} onChange={e => set('welcomeMessage', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Culoare principală</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => set('primaryColor', c)}
                  style={{ background: c }}
                  className={clsx('w-8 h-8 rounded-full border-2 transition-transform', form.primaryColor === c ? 'border-gray-900 scale-110' : 'border-transparent')} />
              ))}
              <input type="color" value={form.primaryColor} onChange={e => set('primaryColor', e.target.value)}
                className="w-8 h-8 rounded-full border border-gray-300 cursor-pointer overflow-hidden" title="Culoare personalizată" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Informații despre afacere</label>
            <p className="text-xs text-gray-400 mb-1">Descrie serviciile, locația, orarul, prețurile. AI-ul va folosi aceste informații.</p>
            <textarea value={form.businessInfo} onChange={e => set('businessInfo', e.target.value)}
              rows={5} placeholder="Ex: Cabinet de avocatură în București, specializat în drept civil și comercial. Ore de lucru: Luni-Vineri 09:00-18:00. Consultație inițială gratuită 30 min..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Mesaj offline</label>
            <input value={form.offlineMessage} onChange={e => set('offlineMessage', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>

          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
            <Zap size={20} className="text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800">Integrare Booking</p>
              <p className="text-xs text-green-600">Chatbot-ul va sugera programări automat când vizitatorii întreabă.</p>
            </div>
            <button onClick={() => set('bookingEnabled', !form.bookingEnabled)}
              className={clsx('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                form.bookingEnabled ? 'bg-green-500' : 'bg-gray-300')}>
              <span className={clsx('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                form.bookingEnabled ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
        </div>
      )}

      {/* FAQ Tab */}
      {tab === 'faq' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Adăugați întrebări frecvente — AI-ul le va cita exact în răspunsuri.</p>
            <button onClick={addFaq}
              className="flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
              <Plus size={16} />Adaugă
            </button>
          </div>
          {faq.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <MessageCircle size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nicio întrebare adăugată încă.</p>
            </div>
          )}
          <div className="space-y-3">
            {faq.map((item, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <input value={item.question} onChange={e => updateFaq(i, 'question', e.target.value)}
                      placeholder="Întrebare..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium" />
                  </div>
                  <button onClick={() => removeFaq(i)} className="text-gray-400 hover:text-red-500 transition-colors mt-1">
                    <Trash2 size={16} />
                  </button>
                </div>
                <textarea value={item.answer} onChange={e => updateFaq(i, 'answer', e.target.value)}
                  placeholder="Răspuns complet..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Tab */}
      {tab === 'preview' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-4">Previzualizare widget chat pe site:</p>
          <div className="relative bg-gray-100 rounded-xl overflow-hidden" style={{ height: 480 }}>
            <div className="absolute inset-0 flex items-end justify-end p-6">
              {/* Chat window preview */}
              <div className="w-80 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ height: 400 }}>
                <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: form.primaryColor }}>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">🤖</div>
                  <div>
                    <div className="text-sm font-bold">{form.botName}</div>
                    <div className="text-xs opacity-75">Online</div>
                  </div>
                </div>
                <div className="flex-1 p-3 overflow-y-auto">
                  <div className="flex">
                    <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-gray-800 max-w-[85%]">
                      {form.welcomeMessage}
                    </div>
                  </div>
                </div>
                <div className="p-3 border-t border-gray-100 flex gap-2">
                  <input readOnly placeholder="Scrieți un mesaj..."
                    className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-sm outline-none" />
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ background: form.primaryColor }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  </div>
                </div>
              </div>
            </div>
            {/* Fab button */}
            <div className="absolute bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center"
              style={{ background: form.primaryColor }}>
              <MessageCircle size={24} color="white" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
