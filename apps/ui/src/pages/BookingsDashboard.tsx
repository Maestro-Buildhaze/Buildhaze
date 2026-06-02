import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar, Clock, User, Mail, Phone, Plus, Trash2,
  Check, X, ChevronRight, Download, Settings, Loader2,
  AlertCircle, Tag, DollarSign,
} from 'lucide-react';
import { api } from '../lib/api';
import clsx from 'clsx';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'În așteptare', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmat',    color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Anulat',       color: 'bg-red-100 text-red-800' },
  completed: { label: 'Finalizat',    color: 'bg-gray-100 text-gray-700' },
};

const DAYS = ['Duminică','Luni','Marți','Miercuri','Joi','Vineri','Sâmbătă'];

export function BookingsDashboard() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'bookings'|'services'|'availability'>('bookings');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddService, setShowAddService] = useState(false);
  const [svcForm, setSvcForm] = useState({ name:'', description:'', duration:'60', price:'', currency:'RON', color:'#059669' });

  // ── Bookings ──────────────────────────────────────────────────
  const { data: bookings = [], isLoading: bLoading } = useQuery({
    queryKey: ['bookings', statusFilter],
    queryFn: () => api.get(`/bookings${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => r.data),
  });

  const { data: stats } = useQuery<any>({
    queryKey: ['booking-stats'],
    queryFn: () => api.get('/bookings/stats').then(r => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/bookings/${id}/status`, { status }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['booking-stats'] });
    },
  });

  // ── Services ──────────────────────────────────────────────────
  const { data: services = [], isLoading: sLoading } = useQuery({
    queryKey: ['booking-services'],
    queryFn: () => api.get('/bookings/services').then(r => r.data),
  });

  const addServiceMutation = useMutation({
    mutationFn: (data: any) => api.post('/bookings/services', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['booking-services'] }); setShowAddService(false); setSvcForm({ name:'', description:'', duration:'60', price:'', currency:'RON', color:'#059669' }); },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => api.del(`/bookings/services/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['booking-services'] }),
  });

  // ── Availability ─────────────────────────────────────────────
  const [avail, setAvail] = useState<Record<number, { startTime: string; endTime: string; isActive: boolean }>>({});
  const { isLoading: aLoading, data: availData } = useQuery<any[]>({
    queryKey: ['booking-availability'],
    queryFn: () => api.get('/bookings/availability').then(r => r.data),
  });

  useEffect(() => {
    if (!availData) return;
    const map: Record<number, any> = {};
    availData.forEach((d: any) => { map[d.dayOfWeek] = d; });
    for (let i = 0; i < 7; i++) {
      if (!map[i]) map[i] = { startTime: '09:00', endTime: '17:00', isActive: false };
    }
    setAvail(map);
  }, [availData]);

  const saveAvailMutation = useMutation({
    mutationFn: () => api.put('/bookings/availability', {
      days: Object.entries(avail).map(([dow, a]) => ({ dayOfWeek: Number(dow), ...a })),
    }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['booking-availability'] }),
  });

  function setDay(i: number, key: string, val: any) {
    setAvail(a => ({ ...a, [i]: { ...a[i], [key]: val } }));
  }

  return (
    <div className="animate-fade-in space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Calendar size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Programări</h1>
            <p className="text-sm text-gray-500">Gestionați programările și serviciile</p>
          </div>
        </div>
        <a href="/api/bookings/calendar-feed.ics" download
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <Download size={15} />Export iCal
        </a>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Azi', value: stats.today, color: 'text-blue-600 bg-blue-50' },
            { label: 'Săptămâna', value: stats.thisWeek, color: 'text-purple-600 bg-purple-50' },
            { label: 'În așteptare', value: stats.pending, color: 'text-yellow-600 bg-yellow-50' },
            { label: 'Confirmate', value: stats.confirmed, color: 'text-green-600 bg-green-50' },
          ].map(s => (
            <div key={s.label} className={clsx('rounded-xl p-4 flex flex-col gap-1', s.color.split(' ')[1])}>
              <span className={clsx('text-2xl font-bold', s.color.split(' ')[0])}>{s.value}</span>
              <span className="text-xs font-medium text-gray-500">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([['bookings','Programări',Calendar],['services','Servicii',Tag],['availability','Program',Clock]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {/* ── BOOKINGS TAB ── */}
      {tab === 'bookings' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">Filtru:</span>
            {['','pending','confirmed','cancelled','completed'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={clsx('px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                {s === '' ? 'Toate' : STATUS_LABELS[s]?.label ?? s}
              </button>
            ))}
          </div>

          {bLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Calendar size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nu există programări</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {bookings.map((b: any) => (
                <div key={b.id} className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-blue-600">{b.date.slice(8,10)}</span>
                    <span className="text-[10px] text-blue-400">{b.date.slice(5,7)}/{b.date.slice(0,4).slice(-2)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-gray-900">{b.customerName}</span>
                      <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold', STATUS_LABELS[b.status]?.color)}>
                        {STATUS_LABELS[b.status]?.label}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1"><Clock size={11} />{b.time} ({b.durationMin} min)</span>
                      <span className="flex items-center gap-1"><Mail size={11} />{b.customerEmail}</span>
                      {b.customerPhone && <span className="flex items-center gap-1"><Phone size={11} />{b.customerPhone}</span>}
                      {b.service && <span className="flex items-center gap-1"><Tag size={11} />{b.service.name}</span>}
                    </div>
                    {b.notes && <p className="text-xs text-gray-400 mt-1 italic">{b.notes}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {b.status === 'pending' && (
                      <>
                        <button onClick={() => statusMutation.mutate({ id: b.id, status: 'confirmed' })}
                          className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors" title="Confirmă">
                          <Check size={15} />
                        </button>
                        <button onClick={() => statusMutation.mutate({ id: b.id, status: 'cancelled' })}
                          className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Anulează">
                          <X size={15} />
                        </button>
                      </>
                    )}
                    {b.status === 'confirmed' && (
                      <button onClick={() => statusMutation.mutate({ id: b.id, status: 'completed' })}
                        className="p-2 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors" title="Finalizat">
                        <Check size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SERVICES TAB ── */}
      {tab === 'services' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowAddService(v => !v)}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors">
              <Plus size={16} />Adaugă serviciu
            </button>
          </div>

          {showAddService && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-gray-800">Serviciu nou</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Denumire *</label>
                  <input value={svcForm.name} onChange={e => setSvcForm(f=>({...f,name:e.target.value}))}
                    placeholder="Ex: Consultație juridică"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Durată (minute) *</label>
                  <input type="number" value={svcForm.duration} onChange={e => setSvcForm(f=>({...f,duration:e.target.value}))} min="15" step="15"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Preț (opțional)</label>
                  <div className="flex gap-2">
                    <input type="number" value={svcForm.price} onChange={e => setSvcForm(f=>({...f,price:e.target.value}))}
                      placeholder="0"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    <select value={svcForm.currency} onChange={e => setSvcForm(f=>({...f,currency:e.target.value}))}
                      className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none">
                      <option>RON</option><option>EUR</option><option>USD</option>
                    </select>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Descriere</label>
                  <textarea value={svcForm.description} onChange={e => setSvcForm(f=>({...f,description:e.target.value}))}
                    rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAddService(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Anulează</button>
                <button onClick={() => addServiceMutation.mutate(svcForm)}
                  disabled={!svcForm.name || addServiceMutation.isPending}
                  className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 hover:bg-primary-700 transition-colors">
                  {addServiceMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Salvează
                </button>
              </div>
            </div>
          )}

          {sLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
          ) : services.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 text-center py-10 text-gray-400">
              <Tag size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Niciun serviciu adăugat încă.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
              {services.map((s: any) => (
                <div key={s.id} className="flex items-center gap-4 p-4">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900">{s.name}</p>
                    <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                      <span className="flex items-center gap-1"><Clock size={11} />{s.duration} min</span>
                      {s.price && <span className="flex items-center gap-1"><DollarSign size={11} />{s.price} {s.currency}</span>}
                    </div>
                    {s.description && <p className="text-xs text-gray-400 mt-1">{s.description}</p>}
                  </div>
                  <button onClick={() => deleteServiceMutation.mutate(s.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── AVAILABILITY TAB ── */}
      {tab === 'availability' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <p className="text-sm text-gray-500">Setați orarul săptămânal. Clienții vor putea face programări doar în intervalele active.</p>
          {aLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
          ) : (
            <div className="space-y-2">
              {[1,2,3,4,5,6,0].map(i => {
                const day = avail[i] ?? { startTime: '09:00', endTime: '17:00', isActive: false };
                return (
                  <div key={i} className={clsx('flex items-center gap-4 p-3 rounded-xl transition-colors', day.isActive ? 'bg-green-50 border border-green-100' : 'bg-gray-50')}>
                    <button onClick={() => setDay(i, 'isActive', !day.isActive)}
                      className={clsx('relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                        day.isActive ? 'bg-green-500' : 'bg-gray-300')}>
                      <span className={clsx('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                        day.isActive ? 'translate-x-4' : 'translate-x-0')} />
                    </button>
                    <span className={clsx('w-24 text-sm font-semibold flex-shrink-0', day.isActive ? 'text-gray-900' : 'text-gray-400')}>{DAYS[i]}</span>
                    <div className="flex items-center gap-2 flex-1">
                      <input type="time" value={day.startTime} disabled={!day.isActive}
                        onChange={e => setDay(i, 'startTime', e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none disabled:opacity-40" />
                      <span className="text-gray-400 text-sm">—</span>
                      <input type="time" value={day.endTime} disabled={!day.isActive}
                        onChange={e => setDay(i, 'endTime', e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none disabled:opacity-40" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button onClick={() => saveAvailMutation.mutate()}
            disabled={saveAvailMutation.isPending}
            className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-60">
            {saveAvailMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {saveAvailMutation.isSuccess ? 'Salvat!' : 'Salvează programul'}
          </button>
        </div>
      )}
    </div>
  );
}
