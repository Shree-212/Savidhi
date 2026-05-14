'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { chadhavaService, templeService, deityService, hamperService } from '@/lib/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatusToggle } from '@/components/shared/StatusToggle';
import { Modal } from '@/components/shared/Modal';
import { ViewButton, EditButton, DeleteButton, PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';
import { MediaUploadSingle, MediaUploadMulti } from '@/components/shared/MediaUpload';

// ─── Types ─────────────────────────────────────────────────────────────────
type RepeatDuration = 'WEEK_DAYS' | 'MONTH_DATE' | 'LUNAR_PHASE';
type BookingMode = 'ONE_TIME' | 'SUBSCRIPTION' | 'BOTH';

interface Offering {
  id?: string;        // present when the offering already exists; absent for new rows
  item_name: string;
  benefit: string;
  price: number;
  image_url: string;
}

interface ChadhavaForm {
  id: string;
  name: string;
  temple_id: string;
  temple_name?: string;
  deity_id: string;
  default_pujari_id: string;
  description: string;
  schedule_day: string;
  schedule_time: string;
  lunar_phase: string;
  event_repeats: boolean;
  repeat_duration: RepeatDuration | '';
  repeats_on: string[];
  start_date: string;
  max_bookings_per_event: number;
  booking_mode: BookingMode;
  duration_minutes: number;
  sample_video_url: string;
  slider_images: string[];
  benefits: string;
  rituals_included: string;
  items_used: string[];
  how_will_it_happen: string[];
  shlok: string;
  offerings: Offering[];
  hamper_id: string;
  send_hamper: boolean;
  is_active: boolean;
}

interface SelectOption { id: string; name: string; }

const EMPTY_FORM: ChadhavaForm = {
  id: '', name: '', temple_id: '', deity_id: '', default_pujari_id: '',
  description: '', schedule_day: '', schedule_time: '', lunar_phase: '',
  event_repeats: false, repeat_duration: '', repeats_on: [], start_date: '',
  max_bookings_per_event: 100, booking_mode: 'BOTH', duration_minutes: 30,
  sample_video_url: '', slider_images: [],
  benefits: '', rituals_included: '', items_used: [], how_will_it_happen: [],
  shlok: '',
  offerings: [],
  hamper_id: '', send_hamper: false,
  is_active: true,
};

const WEEKDAYS: { code: string; label: string }[] = [
  { code: 'MON', label: 'Mon' }, { code: 'TUE', label: 'Tue' }, { code: 'WED', label: 'Wed' },
  { code: 'THU', label: 'Thu' }, { code: 'FRI', label: 'Fri' }, { code: 'SAT', label: 'Sat' },
  { code: 'SUN', label: 'Sun' },
];
const MONTH_DATES: string[] = Array.from({ length: 31 }, (_, i) => String(i + 1));
const TITHIS: string[] = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi',
  'Purnima', 'Amavasya',
];

// ─── Component ─────────────────────────────────────────────────────────────
export default function ChadhavasPage() {
  const [search, setSearch] = useState('');
  const [chadhavas, setChadhavas] = useState<any[]>([]);
  const [temples, setTemples] = useState<SelectOption[]>([]);
  const [deities, setDeities] = useState<SelectOption[]>([]);
  const [hampers, setHampers] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ChadhavaForm | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [cleanupTarget, setCleanupTarget] = useState<{ id: string; name: string } | null>(null);
  const [cleanupFrom, setCleanupFrom] = useState<string>('');
  const [cleanupResult, setCleanupResult] = useState<{ would_delete?: number; would_keep?: number; deleted?: number; kept?: number } | null>(null);
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const router = useRouter();

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await chadhavaService.list({ search: search || undefined });
      setChadhavas(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load chadhavas', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDropdowns = async () => {
    try {
      const [templesRes, deitiesRes, hampersRes] = await Promise.all([
        templeService.list({ limit: 200 }),
        deityService.list({ limit: 200 }),
        hamperService.list({ limit: 200 }),
      ]);
      setTemples(templesRes.data?.data || []);
      setDeities(deitiesRes.data?.data || []);
      setHampers(hampersRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load dropdowns', err);
    }
  };

  useEffect(() => { loadData(); loadDropdowns(); }, []);
  useEffect(() => { loadData(); }, [search]);

  const repeatsOnOptions: string[] = useMemo(() => {
    if (editing?.repeat_duration === 'WEEK_DAYS') return WEEKDAYS.map(w => w.code);
    if (editing?.repeat_duration === 'MONTH_DATE') return MONTH_DATES;
    if (editing?.repeat_duration === 'LUNAR_PHASE') return TITHIS;
    return [];
  }, [editing?.repeat_duration]);

  const handleAdd = () => {
    setIsNew(true);
    setError(null);
    setEditing({ ...EMPTY_FORM, offerings: [{ item_name: '', benefit: '', price: 0, image_url: '' }] });
  };

  const handleEdit = async (row: any) => {
    setIsNew(false);
    setError(null);
    // List endpoint omits offerings; refetch detail so the editor populates them.
    let c = row;
    try {
      const detail = await chadhavaService.getById(row.id);
      c = detail.data?.data ?? detail.data ?? row;
    } catch (err) {
      console.error('Failed to load chadhava detail', err);
    }
    const offeringsRaw = Array.isArray(c.offerings) ? c.offerings : [];
    const offerings: Offering[] = offeringsRaw.length
      ? offeringsRaw.map((o: any) => ({
          id: o.id ?? undefined,
          item_name: o.item_name ?? '',
          benefit: o.benefit ?? '',
          price: Number(o.price ?? 0),
          image_url: Array.isArray(o.images) ? (o.images[0] ?? '') : (o.image_url ?? ''),
        }))
      : [{ item_name: '', benefit: '', price: 0, image_url: '' }];
    setEditing({
      id: c.id ?? '',
      name: c.name ?? '',
      temple_id: c.temple_id ?? '',
      temple_name: c.temple_name ?? '',
      deity_id: c.deity_id ?? '',
      default_pujari_id: c.default_pujari_id ?? '',
      description: c.description ?? '',
      schedule_day: c.schedule_day ?? '',
      schedule_time: c.schedule_time ?? '',
      lunar_phase: c.lunar_phase ?? '',
      event_repeats: !!c.event_repeats,
      repeat_duration: (c.repeat_duration as RepeatDuration) || '',
      repeats_on: Array.isArray(c.repeats_on) ? c.repeats_on : [],
      start_date: c.start_date ? String(c.start_date).slice(0, 10) : '',
      max_bookings_per_event: Number(c.max_bookings_per_event ?? 100),
      booking_mode: (c.booking_mode as BookingMode) || 'BOTH',
      duration_minutes: Number(c.duration_minutes ?? 30),
      sample_video_url: c.sample_video_url ?? '',
      slider_images: Array.isArray(c.slider_images) ? c.slider_images : [],
      benefits: c.benefits ?? '',
      rituals_included: c.rituals_included ?? '',
      items_used: Array.isArray(c.items_used) ? c.items_used : [],
      how_will_it_happen: Array.isArray(c.how_will_it_happen) ? c.how_will_it_happen : [],
      shlok: c.shlok ?? '',
      offerings,
      hamper_id: c.hamper_id ?? '',
      send_hamper: !!c.send_hamper,
      is_active: c.is_active !== false,
    });
  };

  const update = <K extends keyof ChadhavaForm>(k: K, v: ChadhavaForm[K]) => {
    setEditing(prev => prev ? { ...prev, [k]: v } : prev);
  };

  const toggleRepeatsOn = (val: string) => {
    if (!editing) return;
    const has = editing.repeats_on.includes(val);
    update('repeats_on', has ? editing.repeats_on.filter(v => v !== val) : [...editing.repeats_on, val]);
  };

  const updateOffering = (i: number, field: keyof Offering, val: string | number) => {
    if (!editing) return;
    update('offerings', editing.offerings.map((o, idx) => idx === i ? { ...o, [field]: val } : o));
  };
  const removeOffering = (i: number) => {
    if (!editing) return;
    update('offerings', editing.offerings.filter((_, idx) => idx !== i));
  };
  const addOffering = () => {
    if (!editing) return;
    update('offerings', [...editing.offerings, { item_name: '', benefit: '', price: 0, image_url: '' }]);
  };

  const handleSave = async () => {
    if (!editing) return;
    setError(null);
    try {
      setSaving(true);
      const offerings = editing.offerings.filter(o => o.item_name.trim() !== '');
      const payload = {
        name: editing.name,
        temple_id: editing.temple_id,
        deity_id: editing.deity_id || null,
        schedule_day: editing.schedule_day,
        schedule_time: editing.schedule_time,
        lunar_phase: editing.lunar_phase,
        event_repeats: editing.event_repeats,
        repeat_duration: editing.event_repeats ? editing.repeat_duration || null : null,
        repeats_on: editing.event_repeats ? editing.repeats_on : [],
        start_date: editing.start_date || null,
        max_bookings_per_event: Number(editing.max_bookings_per_event) || 100,
        booking_mode: editing.booking_mode,
        duration_minutes: Number(editing.duration_minutes) || 30,
        slider_images: editing.slider_images,
        benefits: editing.benefits,
        rituals_included: editing.rituals_included,
        items_used: editing.items_used,
        shlok: editing.shlok,
        hamper_id: editing.hamper_id || null,
        send_hamper: editing.send_hamper,
        is_active: editing.is_active,
        offerings,
      };
      if (isNew) await chadhavaService.create(payload);
      else await chadhavaService.update(editing.id, payload);
      setEditing(null);
      setIsNew(false);
      await loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save chadhava';
      setError(msg);
      console.error('Failed to save chadhava', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this chadhava permanently? This only works if it has no bookings — otherwise use the status toggle to mark it inactive.')) return;
    try {
      const res = await chadhavaService.delete(id);
      const msg = res.data?.message || 'Chadhava deleted';
      alert(msg);
      await loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete chadhava';
      alert(msg);
      console.error('Failed to delete chadhava', err);
    }
  };

  const handleGenerate = async (id: string) => {
    try {
      setGenerating(id);
      const r = await chadhavaService.generateEvents(id, 60);
      const d = r.data?.data;
      alert(`Generated ${d?.generated ?? 0} events; ${d?.skipped ?? 0} already existed.`);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to generate events');
    } finally {
      setGenerating(null);
    }
  };

  const openCleanup = (c: any) => {
    setCleanupTarget({ id: c.id, name: c.name });
    setCleanupFrom(new Date().toISOString().slice(0, 10));
    setCleanupResult(null);
  };

  const runCleanup = async (dryRun: boolean) => {
    if (!cleanupTarget || !cleanupFrom) return;
    try {
      setCleanupBusy(true);
      const fromIso = new Date(`${cleanupFrom}T00:00:00Z`).toISOString();
      const r = await chadhavaService.bulkDeleteEvents(cleanupTarget.id, { from: fromIso, dry_run: dryRun });
      setCleanupResult(r.data?.data ?? null);
      if (!dryRun) await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Cleanup failed');
    } finally {
      setCleanupBusy(false);
    }
  };

  const columns = [
    { key: 'id', label: 'ID', render: (r: any) => (r.id ?? '').slice(0, 8) },
    { key: 'name', label: 'Chadhava Name' },
    { key: 'temple_name', label: 'Temple' },
    { key: 'deity_name', label: 'Deity', render: (r: any) => r.deity_name ?? '—' },
    { key: 'schedule_day', label: 'Day' },
    { key: 'schedule_time', label: 'Time' },
    { key: 'max_bookings_per_event', label: 'Max' },
    { key: 'booking_mode', label: 'Booking Mode', render: (r: any) => <StatusBadge status={r.booking_mode} /> },
    { key: 'event_repeats', label: 'Repeat', render: (r: any) => r.event_repeats ? (r.repeat_duration || 'Yes') : 'No' },
    {
      key: 'upcoming_events_count',
      label: 'Upcoming Events',
      render: (r: any) => (
        <button
          type="button"
          onClick={() => router.push(`/dashboard/chadhava-bookings?chadhava_id=${r.id}`)}
          className="text-xs px-2 py-1 border border-border rounded hover:bg-accent"
        >
          {r.upcoming_events_count ?? 0}
        </button>
      ),
    },
    {
      key: 'status', label: 'Status', render: (r: any) => (
        <StatusToggle
          active={r.is_active}
          onChange={async (next) => {
            await chadhavaService.update(r.id, { is_active: next });
            setChadhavas(prev => prev.map(c => c.id === r.id ? { ...c, is_active: next } : c));
          }}
        />
      ),
    },
    { key: 'action', label: 'Action', render: (r: any) => (
      <div className="flex items-center gap-1">
        <ViewButton onClick={() => handleEdit(r)} />
        <EditButton onClick={() => handleEdit(r)} />
        {r.event_repeats && (
          <button
            type="button"
            onClick={() => handleGenerate(r.id)}
            disabled={generating === r.id}
            title="Generate next 60 days of events"
            className="text-xs px-2 py-1 border border-border rounded hover:bg-accent disabled:opacity-50"
          >
            {generating === r.id ? '…' : '⚡'}
          </button>
        )}
        <button
          type="button"
          onClick={() => openCleanup(r)}
          title="Cleanup future events"
          className="text-xs px-2 py-1 border border-border rounded hover:bg-accent"
        >
          🧹
        </button>
        <DeleteButton onClick={() => handleDelete(r.id)} />
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader search={search} onSearchChange={setSearch} onAdd={handleAdd} />
      <DataTable columns={columns} data={chadhavas} />

      <Modal
        open={!!editing}
        onClose={() => { setEditing(null); setIsNew(false); setError(null); }}
        title={isNew ? 'New Chadhava' : `Edit Chadhava ${editing?.id?.slice(0, 8)}`}
        statusBadge={!isNew && editing ? (
          <div className="flex items-center gap-2">
            <StatusBadge
              status={editing.is_active === false ? 'INACTIVE' : 'ACTIVE'}
              className={editing.is_active === false ? 'text-status-cancelled' : 'text-status-completed'}
            />
            <StatusToggle
              active={editing.is_active !== false}
              onChange={async (next) => {
                if (!editing.id) { update('is_active', next); return; }
                await chadhavaService.update(editing.id, { is_active: next });
                update('is_active', next);
                setChadhavas(prev => prev.map(c => c.id === editing.id ? { ...c, is_active: next } : c));
              }}
            />
          </div>
        ) : undefined}
        wide
      >
        {editing && (
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded">
                {error}
              </div>
            )}

            <input
              value={editing.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Chadhava Name *"
              className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={editing.temple_id}
                onChange={(e) => update('temple_id', e.target.value)}
                className="h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground"
              >
                <option value="">Temple *</option>
                {temples.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select
                value={editing.deity_id}
                onChange={(e) => update('deity_id', e.target.value)}
                className="h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground"
              >
                <option value="">Type Of Deity</option>
                {deities.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={editing.max_bookings_per_event || ''}
                onChange={(e) => update('max_bookings_per_event', Number(e.target.value))}
                placeholder="Max Devotee Per Event"
                className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground"
              />
              <input
                type="number"
                value={editing.duration_minutes || ''}
                onChange={(e) => update('duration_minutes', Number(e.target.value))}
                placeholder="Duration (min)"
                className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground"
              />
            </div>

            <h4 className="text-[10px] font-bold uppercase tracking-wider">Date & Time</h4>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="date"
                value={editing.start_date}
                onChange={(e) => update('start_date', e.target.value)}
                placeholder="Start Date"
                className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground"
              />
              <input
                type="time"
                value={editing.schedule_time}
                onChange={(e) => update('schedule_time', e.target.value)}
                placeholder="Time"
                className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground"
              />
              <input
                value={editing.schedule_day}
                onChange={(e) => update('schedule_day', e.target.value)}
                placeholder="Schedule Label (TUE,SAT)"
                className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground"
              />
            </div>

            {/* ── Repeat block ── */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">Event Repeats</span>
              <button
                type="button"
                onClick={() => update('event_repeats', !editing.event_repeats)}
                className={`w-8 h-4 ${editing.event_repeats ? 'bg-primary' : 'bg-muted'} rounded-full relative cursor-pointer transition-colors`}
              >
                <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${editing.event_repeats ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>

            {editing.event_repeats && (
              <div className="space-y-3 border border-border rounded-md p-3 bg-accent/30">
                <select
                  value={editing.repeat_duration}
                  onChange={(e) => { update('repeat_duration', e.target.value as RepeatDuration | ''); update('repeats_on', []); }}
                  className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground"
                >
                  <option value="">Repeat Duration *</option>
                  <option value="WEEK_DAYS">Week Days</option>
                  <option value="MONTH_DATE">Month Dates</option>
                  <option value="LUNAR_PHASE">Lunar Phase (Tithi)</option>
                </select>

                {editing.repeat_duration && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider mb-1.5">Repeats On *</p>
                    <div className="flex flex-wrap gap-1.5">
                      {repeatsOnOptions.map(opt => {
                        const selected = editing.repeats_on.includes(opt);
                        const label = editing.repeat_duration === 'WEEK_DAYS'
                          ? WEEKDAYS.find(w => w.code === opt)?.label ?? opt
                          : opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => toggleRepeatsOn(opt)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                              selected ? 'bg-primary text-white border-primary'
                                       : 'bg-accent border-border text-foreground hover:border-primary'
                            }`}
                          >{label}</button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <select
              value={editing.booking_mode}
              onChange={(e) => update('booking_mode', e.target.value as BookingMode)}
              className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground"
            >
              <option value="BOTH">Booking Mode: Both</option>
              <option value="ONE_TIME">Booking Mode: One Time only</option>
              <option value="SUBSCRIPTION">Booking Mode: Subscription only</option>
            </select>
            <p className="text-[10px] text-muted-foreground -mt-2">
              {editing.booking_mode === 'ONE_TIME' && 'Devotee can only book a single event.'}
              {editing.booking_mode === 'SUBSCRIPTION' && 'Devotee gets auto-recurring billing.'}
              {editing.booking_mode === 'BOTH' && 'Devotee chooses between one-time or subscription.'}
            </p>

            {/* ── Offerings ── */}
            <h4 className="text-[10px] font-bold uppercase tracking-wider">Offerings</h4>
            {editing.offerings.map((o, i) => (
              <div key={i} className="grid grid-cols-4 gap-2">
                <input
                  value={o.item_name}
                  onChange={(e) => updateOffering(i, 'item_name', e.target.value)}
                  placeholder="Item Name"
                  className="h-8 px-2 bg-accent border border-border rounded-md text-xs text-foreground"
                />
                <input
                  value={o.benefit}
                  onChange={(e) => updateOffering(i, 'benefit', e.target.value)}
                  placeholder="Benefit"
                  className="h-8 px-2 bg-accent border border-border rounded-md text-xs text-foreground"
                />
                <input
                  type="number"
                  value={o.price || ''}
                  onChange={(e) => updateOffering(i, 'price', Number(e.target.value))}
                  placeholder="Price"
                  className="h-8 px-2 bg-accent border border-border rounded-md text-xs text-foreground"
                />
                <div className="flex items-center gap-1">
                  <MediaUploadSingle
                    label="Image"
                    type="image"
                    accept="image/*"
                    value={o.image_url}
                    onChange={(url) => updateOffering(i, 'image_url', url)}
                  />
                  <DeleteButton onClick={() => removeOffering(i)} />
                </div>
              </div>
            ))}
            <button onClick={addOffering} className="text-xs text-primary hover:underline">+ Add Offering</button>

            <MediaUploadMulti
              label="Slider Images"
              value={editing.slider_images}
              onChange={(urls) => update('slider_images', urls)}
            />

            <h4 className="text-[10px] font-bold uppercase tracking-wider">Benefits</h4>
            <textarea
              value={editing.benefits}
              onChange={(e) => update('benefits', e.target.value)}
              placeholder="Benefits..."
              className="w-full h-16 px-3 py-2 bg-accent border border-border rounded-md text-xs text-foreground resize-none"
            />
            <h4 className="text-[10px] font-bold uppercase tracking-wider">Rituals Included</h4>
            <textarea
              value={editing.rituals_included}
              onChange={(e) => update('rituals_included', e.target.value)}
              placeholder="Type Here"
              className="w-full h-16 px-3 py-2 bg-accent border border-border rounded-md text-xs text-foreground resize-none"
            />

            <ChipListInput
              label="Items Used"
              placeholder="Type and press Enter (e.g. Mustard Oil)"
              value={editing.items_used}
              onChange={(v) => update('items_used', v)}
            />

            {/* ── Chadhava Shlok (shown read-only on web booking flow) ── */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block">Chadhava Shlok</label>
              <textarea
                rows={3}
                value={editing.shlok}
                onChange={(e) => update('shlok', e.target.value)}
                placeholder="Sanskrit / Hindi shlok shown to devotees during booking"
                className="w-full bg-accent border border-border rounded-md px-3 py-2 text-xs text-foreground"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">Send Hamper to Devotee</span>
              <button
                type="button"
                onClick={() => update('send_hamper', !editing.send_hamper)}
                className={`w-8 h-4 ${editing.send_hamper ? 'bg-primary' : 'bg-muted'} rounded-full relative cursor-pointer`}
              >
                <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 ${editing.send_hamper ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>
            <select
              value={editing.hamper_id}
              onChange={(e) => update('hamper_id', e.target.value)}
              disabled={!editing.send_hamper}
              className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground disabled:opacity-50"
            >
              <option value="">Select Hamper</option>
              {hampers.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>

            <div className="flex gap-3 mt-4">
              <OutlineButton className="flex-1" onClick={() => { setEditing(null); setIsNew(false); setError(null); }}>Cancel</OutlineButton>
              <PrimaryButton className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
              </PrimaryButton>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Cleanup Future Events Modal ── */}
      <Modal
        open={!!cleanupTarget}
        onClose={() => { setCleanupTarget(null); setCleanupResult(null); }}
        title={`Cleanup Future Events — ${cleanupTarget?.name ?? ''}`}
      >
        {cleanupTarget && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Deletes all events with <strong>no bookings</strong> from the chosen date onward.
              Events with any booking are kept.
            </p>
            <label className="text-[10px] font-bold uppercase tracking-wider">Delete events from</label>
            <input
              type="date"
              value={cleanupFrom}
              onChange={(e) => setCleanupFrom(e.target.value)}
              className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground"
            />
            {cleanupResult && (
              <div className="text-xs bg-accent border border-border rounded-md p-3">
                {cleanupResult.would_delete != null ? (
                  <>Dry run: <strong>{cleanupResult.would_delete}</strong> would be deleted, <strong>{cleanupResult.would_keep}</strong> kept (have bookings).</>
                ) : (
                  <>Done: <strong>{cleanupResult.deleted}</strong> deleted, <strong>{cleanupResult.kept}</strong> kept.</>
                )}
              </div>
            )}
            <div className="flex gap-3 mt-2">
              <OutlineButton className="flex-1" onClick={() => runCleanup(true)} disabled={cleanupBusy}>
                {cleanupBusy ? 'Checking…' : 'Dry Run'}
              </OutlineButton>
              <PrimaryButton
                className="flex-1"
                onClick={() => runCleanup(false)}
                disabled={cleanupBusy || !cleanupResult?.would_delete}
              >
                Confirm Deletion
              </PrimaryButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Helper inputs (duplicated from pujas page; could be hoisted later) ───

function ChipListInput({
  label, placeholder, value, onChange,
}: { label: string; placeholder?: string; value: string[]; onChange: (v: string[]) => void; }) {
  const [draft, setDraft] = useState('');
  const commit = () => {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft('');
  };
  return (
    <div>
      <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1.5">{label}</h4>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {value.map((chip, i) => (
          <span key={`${chip}-${i}`} className="text-xs bg-accent border border-border rounded-full px-2.5 py-1 flex items-center gap-1.5">
            {chip}
            <button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-red-500">×</button>
          </span>
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
        onBlur={commit}
        placeholder={placeholder}
        className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground"
      />
    </div>
  );
}

function StepListInput({
  label, value, onChange,
}: { label: string; value: string[]; onChange: (v: string[]) => void; }) {
  const setAt = (i: number, v: string) => onChange(value.map((x, idx) => (idx === i ? v : x)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () => onChange([...value, '']);
  return (
    <div>
      <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1.5">{label}</h4>
      <div className="space-y-1.5">
        {value.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-5 text-right">{i + 1}.</span>
            <input
              value={step}
              onChange={(e) => setAt(i, e.target.value)}
              placeholder={`Step ${i + 1}`}
              className="flex-1 h-8 px-3 bg-accent border border-border rounded-md text-xs text-foreground"
            />
            <button type="button" onClick={() => remove(i)} className="text-xs text-muted-foreground hover:text-red-500 px-2">×</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="text-xs text-primary hover:underline mt-1.5">+ Add step</button>
    </div>
  );
}
