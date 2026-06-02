import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bot, Save, Loader2, Plus, Trash2,
  MessageCircle, Settings, Eye, ToggleLeft, ToggleRight, Rocket, Zap,
  Phone, Clock, Globe, MapPin, Briefcase, Sparkles, ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api';
import clsx from 'clsx';

interface FAQ { question: string; answer: string }

const TONES = [
  { value: 'professional', label: 'Profesional', desc: 'Serios, competent, de încredere' },
  { value: 'friendly', label: 'Prietenos', desc: 'Cald, accesibil, conversațional' },
  { value: 'formal', label: 'Formal', desc: 'Sobru, precis, autoritar' },
];
const POSITIONS = [
  { value: 'bottom-right', label: '↘ Dreapta-jos' },
  { value: 'bottom-left', label: '↙ Stânga-jos' },
];
const LANGUAGES = [
  { value: 'ro', label: '🇷🇴 Română' },
  { value: 'en', label: '🇬🇧 English' },
  { value: 'de', label: '🇩🇪 Deutsch' },
  { value: 'fr', label: '🇫🇷 Français' },
  { value: 'es', label: '🇪🇸 Español' },
  { value: 'it', label: '🇮🇹 Italiano' },
  { value: 'hu', label: '🇭🇺 Magyar' },
  { value: 'pl', label: '🇵🇱 Polski' },
];
const COUNTRIES = [
  { value: 'RO', label: '🇷🇴 România' },
  { value: 'US', label: '🇺🇸 United States' },
  { value: 'GB', label: '🇬🇧 United Kingdom' },
  { value: 'DE', label: '🇩🇪 Germania' },
  { value: 'FR', label: '🇫🇷 Franța' },
  { value: 'IT', label: '🇮🇹 Italia' },
  { value: 'ES', label: '🇪🇸 Spania' },
  { value: 'AU', label: '🇦🇺 Australia' },
  { value: 'CA', label: '🇨🇦 Canada' },
  { value: 'HU', label: '🇭🇺 Ungaria' },
  { value: 'PL', label: '🇵🇱 Polonia' },
  { value: 'NL', label: '🇳🇱 Olanda' },
  { value: 'BE', label: '🇧🇪 Belgia' },
  { value: 'CH', label: '🇨🇭 Elveția' },
  { value: 'AT', label: '🇦🇹 Austria' },
];
const COLORS = ['#059669','#2563eb','#7c3aed','#dc2626','#ea580c','#0891b2','#1e293b','#db2777','#d97706'];

// ── Preset templates ─────────────────────────────────────────────────────────
const PRESETS = [
  {
    id: 'lawyer',
    icon: '⚖️',
    label: 'Cabinet Avocat',
    color: '#1e293b',
    data: {
      botName: 'Asistent Juridic',
      tone: 'professional',
      welcomeMessage: 'Bună ziua! Sunt asistentul virtual al cabinetului. Cu ce vă pot ajuta în probleme juridice?',
      offlineMessage: 'Momentan suntem offline. Lăsați un mesaj și vă vom contacta în cel mai scurt timp.',
    },
  },
  {
    id: 'dentist',
    icon: '🦷',
    label: 'Clinică Dentară',
    color: '#0891b2',
    data: {
      botName: 'Asistent Dental',
      tone: 'friendly',
      welcomeMessage: 'Bună! Sunt asistentul clinicii noastre. Pot să vă ajut cu programări sau informații despre tratamente?',
      offlineMessage: 'Suntem în afara orelor de program. Sunați-ne mâine sau lăsați un mesaj.',
    },
  },
  {
    id: 'realestate',
    icon: '🏠',
    label: 'Imobiliare',
    color: '#059669',
    data: {
      botName: 'Agent Virtual',
      tone: 'friendly',
      welcomeMessage: 'Bună ziua! Căutați o proprietate sau doriți să vindeți? Vă pot ajuta!',
      offlineMessage: 'Suntem offline momentan. Lăsați datele de contact și vă vom suna înapoi.',
    },
  },
  {
    id: 'medical',
    icon: '🏥',
    label: 'Clinică Medicală',
    color: '#2563eb',
    data: {
      botName: 'Asistent Medical',
      tone: 'professional',
      welcomeMessage: 'Bună ziua! Vă pot ajuta cu informații despre serviciile noastre medicale sau cu o programare.',
      offlineMessage: 'În afara programului. Pentru urgențe sunați la 112. Pentru programări reveniti mâine.',
    },
  },
  {
    id: 'beauty',
    icon: '💅',
    label: 'Salon Frumusețe',
    color: '#db2777',
    data: {
      botName: 'Asistent Salon',
      tone: 'friendly',
      welcomeMessage: 'Bună! Bine ați venit la salonul nostru 💕 Cum vă pot ajuta astăzi?',
      offlineMessage: 'Suntem închis momentan. Programați-vă online sau reveniti în orele de program!',
    },
  },
  {
    id: 'restaurant',
    icon: '🍽️',
    label: 'Restaurant',
    color: '#ea580c',
    data: {
      botName: 'Asistent Restaurant',
      tone: 'friendly',
      welcomeMessage: 'Bună ziua! Doriți să rezervați o masă sau aveți întrebări despre meniul nostru?',
      offlineMessage: 'Restaurantul este momentan închis. Rezervări la numărul nostru de telefon.',
    },
  },
];

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
      welcomeMessage: configData.welcomeMessage ?? 'Buna ziua! Cu ce va pot ajuta?',
      tone: configData.tone ?? 'professional',
      language: configData.language ?? 'ro',
      country: configData.country ?? 'RO',
      primaryColor: configData.primaryColor ?? '#059669',
      position: configData.position ?? 'bottom-right',
      businessInfo: configData.businessInfo ?? '',
      phone: configData.phone ?? '',
      workingHours: configData.workingHours ?? '',
      niche: configData.niche ?? '',
      bookingEnabled: configData.bookingEnabled ?? false,
      offlineMessage: configData.offlineMessage ?? 'Momentan offline. Lasati un mesaj.',
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

  function set(key: string, val: any) { setForm((f: any) => ({ ...f, [key]: val })); }
  function applyPreset(p: typeof PRESETS[0]) { setForm((f: any) => ({ ...f, ...p.data, primaryColor: p.color })); }
  function addFaq() { setFaq(f => [...f, { question: '', answer: '' }]); }
  function removeFaq(i: number) { setFaq(f => f.filter((_, idx) => idx !== i)); }
  function updateFaq(i: number, key: keyof FAQ, val: string) {
    setFaq(f => f.map((item, idx) => idx === i ? { ...item, [key]: val } : item));
  }
  function handleSave() {
    if (!form) return;
    saveMutation.mutate({ ...form, faq: faq.filter(f => f.question.trim()) });
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white';
  const labelCls = 'block text-sm font-semibold text-gray-700 mb-1';
  const initials = (form?.botName || 'AI').split(' ').map((w: string) => w[0] || '').slice(0, 2).join('').toUpperCase();

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
            <p className="text-sm text-gray-500">Configurati asistentul virtual pentru website</p>
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
            {saved ? 'Salvat!' : 'Salveaza'}
          </button>
          <button
            onClick={handleSaveAndPublish}
            disabled={saveMutation.isPending || publishMutation.isPending}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {(saveMutation.isPending || publishMutation.isPending) ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
            {publishSaved ? 'Publicat!' : 'Salveaza & Publica'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([['config','Configurare',Settings],['faq','FAQ / Cunostinte',MessageCircle],['preview','Preview',Eye]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {/* CONFIG TAB */}
      {tab === 'config' && (
        <div className="space-y-4">

          {/* Presets */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={15} className="text-purple-500" />
              <span className="text-sm font-bold text-gray-800">Preset-uri rapide</span>
              <span className="text-xs text-gray-400 ml-1">aplica ton, mesaj si culoare automat</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map(p => (
                <button key={p.id} onClick={() => applyPreset(p)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition-all text-left">
                  <span className="text-lg">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-700 truncate">{p.label}</div>
                  </div>
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
                </button>
              ))}
            </div>
          </div>

          {/* Identity */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Bot size={14} className="text-primary-500" /> Identitate Bot</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Numele botului</label>
                <input value={form.botName} onChange={e => set('botName', e.target.value)} className={inputCls} placeholder="ex: Asistent Juridic" />
              </div>
              <div>
                <label className={labelCls}>Nisa / Domeniu</label>
                <input value={form.niche} onChange={e => set('niche', e.target.value)} className={inputCls} placeholder="ex: avocatura, medicina, imobiliare" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Ton conversatie</label>
              <div className="grid grid-cols-3 gap-2">
                {TONES.map(t => (
                  <button key={t.value} onClick={() => set('tone', t.value)}
                    className={clsx('p-3 rounded-xl border-2 text-left transition-all',
                      form.tone === t.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300')}>
                    <div className={clsx('text-sm font-bold', form.tone === t.value ? 'text-primary-700' : 'text-gray-700')}>{t.label}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Locale */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Globe size={14} className="text-blue-500" /> Localizare & Aspect</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Tara clientului</label>
                <select value={form.country} onChange={e => set('country', e.target.value)} className={inputCls}>
                  {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Limba raspunsurilor</label>
                <select value={form.language} onChange={e => set('language', e.target.value)} className={inputCls}>
                  {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Pozitie widget</label>
                <select value={form.position} onChange={e => set('position', e.target.value)} className={inputCls}>
                  {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Culoare principala</label>
                <div className="flex gap-1.5 flex-wrap items-center mt-1">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => set('primaryColor', c)} style={{ background: c }}
                      className={clsx('w-7 h-7 rounded-full border-2 transition-all', form.primaryColor === c ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105')} />
                  ))}
                  <input type="color" value={form.primaryColor} onChange={e => set('primaryColor', e.target.value)}
                    className="w-7 h-7 rounded-full border border-gray-300 cursor-pointer" title="Custom" />
                </div>
              </div>
            </div>
          </div>

          {/* Business Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Briefcase size={14} className="text-amber-500" /> Informatii Afacere</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}><Phone size={11} className="inline mr-1" />Telefon contact</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="+40 700 000 000" />
              </div>
              <div>
                <label className={labelCls}><Clock size={11} className="inline mr-1" />Ore program</label>
                <input value={form.workingHours} onChange={e => set('workingHours', e.target.value)} className={inputCls} placeholder="Luni-Vineri 09:00-18:00" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Descriere afacere pentru AI</label>
              <p className="text-xs text-gray-400 mb-1.5">Cu cat e mai detaliat, cu atat AI-ul raspunde mai bine vizitatorilor.</p>
              <textarea value={form.businessInfo} onChange={e => set('businessInfo', e.target.value)}
                rows={5} placeholder="Ex: Cabinet de avocatura in Bucuresti, specializat in drept penal si civil. Avocat cu 15 ani experienta. Consultatie initiala gratuita 30 min..."
                className={inputCls + ' resize-none'} />
            </div>
          </div>

          {/* Messages */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><MessageCircle size={14} className="text-green-500" /> Mesaje</h3>
            <div>
              <label className={labelCls}>Mesaj de bun-venit</label>
              <input value={form.welcomeMessage} onChange={e => set('welcomeMessage', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Mesaj offline</label>
              <input value={form.offlineMessage} onChange={e => set('offlineMessage', e.target.value)} className={inputCls} />
            </div>
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
              <Zap size={18} className="text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-800">Integrare Programari</p>
                <p className="text-xs text-green-600">Chatbot-ul va sugera programari automat cand vizitatorii intreaba.</p>
              </div>
              <button onClick={() => set('bookingEnabled', !form.bookingEnabled)}
                className={clsx('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                  form.bookingEnabled ? 'bg-green-500' : 'bg-gray-300')}>
                <span className={clsx('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                  form.bookingEnabled ? 'translate-x-5' : 'translate-x-0')} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAQ TAB */}
      {tab === 'faq' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700">Intrebari frecvente</p>
              <p className="text-xs text-gray-400">AI-ul le va cita exact in raspunsuri cand sunt relevante.</p>
            </div>
            <button onClick={addFaq}
              className="flex items-center gap-1 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-lg transition-colors">
              <Plus size={14} /> Adauga
            </button>
          </div>
          {faq.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nicio intrebare adaugata inca.</p>
              <p className="text-xs mt-1 text-gray-300">Ex: "Care este tariful consultantei?" / "Aveti cabinet in Cluj?"</p>
            </div>
          )}
          <div className="space-y-3">
            {faq.map((item, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-2 bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 bg-gray-200 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <input value={item.question} onChange={e => updateFaq(i, 'question', e.target.value)}
                    placeholder="Intrebare vizitator..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium bg-white" />
                  <button onClick={() => removeFaq(i)} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
                <textarea value={item.answer} onChange={e => updateFaq(i, 'answer', e.target.value)}
                  placeholder="Raspuns complet si detaliat..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PREVIEW TAB */}
      {tab === 'preview' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-4">Previzualizare widget chat pe site:</p>
          <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden" style={{ height: 520 }}>
            <div className="absolute inset-0 flex items-end justify-end p-6">
              <div className="w-[340px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ height: 440 }}>
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 text-white flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.primaryColor}cc)` }}>
                  <div className="w-9 h-9 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-xs font-bold">{initials}</div>
                  <div className="flex-1">
                    <div className="text-sm font-bold">{form.botName}</div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-xs opacity-80">Online - raspunde instant</span>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-white/70 text-sm">✕</div>
                </div>
                {/* Messages */}
                <div className="flex-1 p-3 overflow-y-auto bg-gray-50 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-1"
                      style={{ background: form.primaryColor }}>{initials}</div>
                    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-gray-800 max-w-[80%]">
                      {form.welcomeMessage}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <div className="px-3 py-2 rounded-2xl rounded-br-sm text-sm text-white max-w-[80%]"
                      style={{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.primaryColor}cc)` }}>
                      Buna ziua, am o intrebare...
                    </div>
                  </div>
                </div>
                {/* Input */}
                <div className="p-2.5 border-t border-gray-100 flex gap-2 bg-white">
                  <input readOnly placeholder="Scrieti un mesaj..."
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" />
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.primaryColor}cc)` }}>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  </div>
                </div>
              </div>
            </div>
            {/* FAB */}
            <div className="absolute bottom-6 right-6 w-14 h-14 rounded-full shadow-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.primaryColor}99)` }}>
              <MessageCircle size={24} color="white" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
