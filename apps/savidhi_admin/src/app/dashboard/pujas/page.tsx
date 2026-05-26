'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { pujaService, templeService, deityService, hamperService } from '@/lib/services';
import { useDebouncedValue } from '@/lib/hooks';
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

interface PujaForm {
  id: string;
  name: string;
  temple_id: string;
  temple_name?: string;
  deity_id: string;
  default_pujari_id: string;
  description: string;
  schedule_day: string;        // free text label like "FRI" or "Mon, Fri"
  schedule_time: string;       // "HH:MM" 24h
  lunar_phase: string;
  event_repeats: boolean;
  repeat_duration: RepeatDuration | '';
  repeats_on: string[];
  start_date: string;          // YYYY-MM-DD
  max_devotee: number;
  booking_mode: BookingMode;
  duration_minutes: number;
  price_for_1: number;
  price_for_2: number;
  price_for_4: number;
  price_for_6: number;
  sample_video_url: string;
  slider_images: string[];
  benefits: string;
  rituals_included: string;
  items_used: string[];
  how_will_it_happen: string[];
  shlok: string;
  hamper_id: string;
  send_hamper: boolean;
  is_active: boolean;
}

interface SelectOption {
  id: string;
  name: string;
}

const EMPTY_FORM: PujaForm = {
  id: '', name: '', temple_id: '', deity_id: '', default_pujari_id: '',
  description: '', schedule_day: '', schedule_time: '', lunar_phase: '',
  event_repeats: false, repeat_duration: '', repeats_on: [], start_date: '',
  max_devotee: 100, booking_mode: 'BOTH', duration_minutes: 60,
  price_for_1: 0, price_for_2: 0, price_for_4: 0, price_for_6: 0,
  sample_video_url: '', slider_images: [],
  benefits: '', rituals_included: '', items_used: [], how_will_it_happen: [],
  shlok: '',
  hamper_id: '', send_hamper: false,
  is_active: true,
};

const WEEKDAYS: { code: string; label: string }[] = [
  { code: 'MON', label: 'Mon' }, { code: 'TUE', label: 'Tue' }, { code: 'WED', label: 'Wed' },
  { code: 'THU', label: 'Thu' }, { code: 'FRI', label: 'Fri' }, { code: 'SAT', label: 'Sat' },
  { code: 'SUN', label: 'Sun' },
];

const MONTH_DATES: string[] = Array.from({ length: 31 }, (_, i) => String(i + 1));

// 16 canonical tithis (Shukla 1-15 + Krishna Amavasya). The Prokerala API
// returns these names; we let the admin pick from the same list so the
// backend's tithi-name matching works without normalisation.
const TITHIS: string[] = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi',
  'Purnima', 'Amavasya',
];

// ─── Component ─────────────────────────────────────────────────────────────
export default function PujasPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading pujas…</div>}>
      <PujasPageInner />
    </Suspense>
  );
}

function PujasPageInner() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [pujas, setPujas] = useState<any[]>([]);
  const [temples, setTemples] = useState<SelectOption[]>([]);
  const [deities, setDeities] = useState<SelectOption[]>([]);
  const [hampers, setHampers] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PujaForm | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [cleanupTarget, setCleanupTarget] = useState<{ id: string; name: string } | null>(null);
  const [cleanupFrom, setCleanupFrom] = useState<string>('');
  const [cleanupResult, setCleanupResult] = useState<{ would_delete?: number; would_keep?: number; deleted?: number; kept?: number } | null>(null);
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterTempleId = searchParams.get('temple_id') ?? '';

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await pujaService.list({
        search: debouncedSearch || undefined,
        temple_id: filterTempleId || undefined,
      });
      setPujas(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load pujas', err);
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
  useEffect(() => { loadData(); }, [debouncedSearch, filterTempleId]);

  const repeatsOnOptions: string[] = useMemo(() => {
    if (editing?.repeat_duration === 'WEEK_DAYS') return WEEKDAYS.map(w => w.code);
    if (editing?.repeat_duration === 'MONTH_DATE') return MONTH_DATES;
    if (editing?.repeat_duration === 'LUNAR_PHASE') return TITHIS;
    return [];
  }, [editing?.repeat_duration]);

  const handleAdd = () => {
    setIsNew(true);
    setError(null);
    setEditing({ ...EMPTY_FORM });
  };

  const handleEdit = (p: any) => {
    setIsNew(false);
    setError(null);
    setEditing({
      id: p.id ?? '',
      name: p.name ?? '',
      temple_id: p.temple_id ?? '',
      temple_name: p.temple_name ?? '',
      deity_id: p.deity_id ?? '',
      default_pujari_id: p.default_pujari_id ?? '',
      description: p.description ?? '',
      schedule_day: p.schedule_day ?? '',
      schedule_time: p.schedule_time ?? '',
      lunar_phase: p.lunar_phase ?? '',
      event_repeats: !!p.event_repeats,
      repeat_duration: (p.repeat_duration as RepeatDuration) || '',
      repeats_on: Array.isArray(p.repeats_on) ? p.repeats_on : [],
      start_date: p.start_date ? String(p.start_date).slice(0, 10) : '',
      max_devotee: Number(p.max_devotee ?? 100),
      booking_mode: (p.booking_mode as BookingMode) || 'BOTH',
      duration_minutes: Number(p.duration_minutes ?? 60),
      price_for_1: Number(p.price_for_1 ?? 0),
      price_for_2: Number(p.price_for_2 ?? 0),
      price_for_4: Number(p.price_for_4 ?? 0),
      price_for_6: Number(p.price_for_6 ?? 0),
      sample_video_url: p.sample_video_url ?? '',
      slider_images: Array.isArray(p.slider_images) ? p.slider_images : [],
      benefits: p.benefits ?? '',
      rituals_included: p.rituals_included ?? '',
      items_used: Array.isArray(p.items_used) ? p.items_used : [],
      how_will_it_happen: Array.isArray(p.how_will_it_happen) ? p.how_will_it_happen : [],
      shlok: p.shlok ?? '',
      hamper_id: p.hamper_id ?? '',
      send_hamper: !!p.send_hamper,
      is_active: p.is_active !== false,
    });
  };

  const update = <K extends keyof PujaForm>(k: K, v: PujaForm[K]) => {
    setEditing(prev => prev ? { ...prev, [k]: v } : prev);
  };

  const toggleRepeatsOn = (val: string) => {
    if (!editing) return;
    const has = editing.repeats_on.includes(val);
    update('repeats_on', has ? editing.repeats_on.filter(v => v !== val) : [...editing.repeats_on, val]);
  };

  const handleSave = async () => {
    if (!editing) return;
    setError(null);
    try {
      setSaving(true);
      const payload = {
        name: editing.name,
        temple_id: editing.temple_id,
        deity_id: editing.deity_id || null,
        description: editing.description,
        schedule_day: editing.schedule_day,
        schedule_time: editing.schedule_time,
        lunar_phase: editing.lunar_phase,
        event_repeats: editing.event_repeats,
        repeat_duration: editing.event_repeats ? editing.repeat_duration || null : null,
        repeats_on: editing.event_repeats ? editing.repeats_on : [],
        start_date: editing.start_date || null,
        max_devotee: Number(editing.max_devotee) || 100,
        booking_mode: editing.booking_mode,
        duration_minutes: Number(editing.duration_minutes) || 60,
        price_for_1: Number(editing.price_for_1) || 0,
        price_for_2: Number(editing.price_for_2) || 0,
        price_for_4: Number(editing.price_for_4) || 0,
        price_for_6: Number(editing.price_for_6) || 0,
        sample_video_url: editing.sample_video_url,
        slider_images: editing.slider_images,
        benefits: editing.benefits,
        rituals_included: editing.rituals_included,
        items_used: editing.items_used,
        how_will_it_happen: editing.how_will_it_happen,
        shlok: editing.shlok,
        hamper_id: editing.hamper_id || null,
        send_hamper: editing.send_hamper,
        is_active: editing.is_active,
      };
      if (isNew) await pujaService.create(payload);
      else await pujaService.update(editing.id, payload);
      setEditing(null);
      setIsNew(false);
      await loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save puja';
      setError(msg);
      console.error('Failed to save puja', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this puja permanently? This only works if it has no bookings — otherwise use the status toggle to mark it inactive.')) return;
    try {
      const res = await pujaService.delete(id);
      const msg = res.data?.message || 'Puja deleted';
      alert(msg);
      await loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete puja';
      alert(msg);
      console.error('Failed to delete puja', err);
    }
  };

  const handleGenerate = async (id: string) => {
    try {
      setGenerating(id);
      const r = await pujaService.generateEvents(id, 60);
      const d = r.data?.data;
      alert(`Generated ${d?.generated ?? 0} events; ${d?.skipped ?? 0} already existed.`);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to generate events');
    } finally {
      setGenerating(null);
    }
  };

  const openCleanup = (p: any) => {
    setCleanupTarget({ id: p.id, name: p.name });
    setCleanupFrom(new Date().toISOString().slice(0, 10));
    setCleanupResult(null);
  };

  const runCleanup = async (dryRun: boolean) => {
    if (!cleanupTarget || !cleanupFrom) return;
    try {
      setCleanupBusy(true);
      const fromIso = new Date(`${cleanupFrom}T00:00:00Z`).toISOString();
      const r = await pujaService.bulkDeleteEvents(cleanupTarget.id, { from: fromIso, dry_run: dryRun });
      setCleanupResult(r.data?.data ?? null);
      if (!dryRun) {
        await loadData();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Cleanup failed');
    } finally {
      setCleanupBusy(false);
    }
  };

  const columns = [
    { key: 'id', label: 'ID', render: (r: any) => (r.id ?? '').slice(0, 8) },
    { key: 'name', label: 'Puja Name' },
    { key: 'temple_name', label: 'Temple' },
    { key: 'schedule_day', label: 'Day' },
    { key: 'schedule_time', label: 'Time' },
    { key: 'max_devotee', label: 'Max' },
    { key: 'booking_mode', label: 'Booking Mode', render: (r: any) => <StatusBadge status={r.booking_mode} /> },
    { key: 'event_repeats', label: 'Repeat', render: (r: any) => r.event_repeats ? (r.repeat_duration || 'Yes') : 'No' },
    {
      key: 'upcoming_events_count',
      label: 'Upcoming Events',
      render: (r: any) => (
        <button
          type="button"
          onClick={() => router.push(`/dashboard/puja-bookings?puja_id=${r.id}`)}
          className="text-xs px-2 py-1 border border-border rounded hover:bg-accent"
          title="View events for this puja"
        >
          {r.upcoming_events_count ?? 0}
        </button>
      ),
    },
    {
      key: 'status', label: 'Status', render: (r: any) => {
        const bookable = (r.upcoming_events_count ?? 0) > 0;
        return (
          <span title={bookable ? undefined : 'Generate an upcoming event before activating this puja — until then it stays hidden from the public catalog.'}>
            <StatusToggle
              active={bookable && r.is_active}
              disabled={!bookable}
              onChange={async (next) => {
                await pujaService.update(r.id, { is_active: next });
                setPujas(prev => prev.map(p => p.id === r.id ? { ...p, is_active: next } : p));
              }}
            />
          </span>
        );
      },
    },
    { key: 'action', label: 'Action', render: (r: any) => (
      <div className="flex items-center gap-1">
        <ViewButton onClick={() => handleEdit(r)} />
        <EditButton onClick={() => handleEdit(r)} />
        <button
          type="button"
          onClick={() => handleGenerate(r.id)}
          disabled={generating === r.id}
          title={r.event_repeats ? 'Generate next 60 days of events' : 'Generate the one-time event from the start date'}
          className="text-xs px-2 py-1 border border-border rounded hover:bg-accent disabled:opacity-50"
        >
          {generating === r.id ? '…' : '⚡'}
        </button>
        <button
          type="button"
          onClick={() => openCleanup(r)}
          title="Cleanup future events (bulk delete with no bookings)"
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
      {filterTempleId && (
        <div className="bg-primary/10 border border-primary/30 rounded-md px-4 py-2 mb-3 flex items-center justify-between">
          <div className="text-xs">
            Showing pujas for temple <span className="font-semibold">{temples.find((t) => t.id === filterTempleId)?.name ?? filterTempleId.slice(0, 8)}</span>
            <span className="ml-2 text-muted-foreground">· {pujas.length} pujas</span>
          </div>
          <button onClick={() => router.push('/dashboard/pujas')} className="text-xs text-primary hover:underline">Clear filter</button>
        </div>
      )}
      <DataTable columns={columns} data={pujas} />

      <Modal
        open={!!editing}
        onClose={() => { setEditing(null); setIsNew(false); setError(null); }}
        title={isNew ? 'New Puja' : `Edit Puja ${editing?.id?.slice(0, 8)}`}
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
                await pujaService.update(editing.id, { is_active: next });
                update('is_active', next);
                setPujas(prev => prev.map(p => p.id === editing.id ? { ...p, is_active: next } : p));
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

            {/* ── Basics ── */}
            <input
              value={editing.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Puja Name *"
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
                value={editing.max_devotee || ''}
                onChange={(e) => update('max_devotee', Number(e.target.value))}
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

            {/* ── Date & time ── */}
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
                placeholder="Schedule Label (FRI / Mon,Fri)"
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
                              selected
                                ? 'bg-primary text-white border-primary'
                                : 'bg-accent border-border text-foreground hover:border-primary'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Booking mode ── */}
            <select
              value={editing.booking_mode}
              onChange={(e) => update('booking_mode', e.target.value as BookingMode)}
              className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground"
            >
              <option value="BOTH">Booking Mode: Both (One Time & Subscription)</option>
              <option value="ONE_TIME">Booking Mode: One Time only</option>
              <option value="SUBSCRIPTION">Booking Mode: Subscription only</option>
            </select>
            <p className="text-[10px] text-muted-foreground -mt-2">
              {editing.booking_mode === 'ONE_TIME' && 'Devotee can only book a single event.'}
              {editing.booking_mode === 'SUBSCRIPTION' && 'Devotee gets auto-recurring billing for repeating events.'}
              {editing.booking_mode === 'BOTH' && 'Devotee chooses between one-time or subscription.'}
            </p>

            {/* ── Prices ── */}
            <h4 className="text-[10px] font-bold uppercase tracking-wider">Prices *</h4>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={editing.price_for_1 || ''} onChange={(e) => update('price_for_1', Number(e.target.value))} placeholder="For 1 Devotee" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
              <input type="number" value={editing.price_for_2 || ''} onChange={(e) => update('price_for_2', Number(e.target.value))} placeholder="For 2 Devotees" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
              <input type="number" value={editing.price_for_4 || ''} onChange={(e) => update('price_for_4', Number(e.target.value))} placeholder="For 4 Devotees" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
              <input type="number" value={editing.price_for_6 || ''} onChange={(e) => update('price_for_6', Number(e.target.value))} placeholder="For 6 Devotees" className="h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground" />
            </div>

            {/* ── Media ── */}
            <div className="grid grid-cols-2 gap-3">
              <MediaUploadSingle
                label="Sample Puja Video"
                type="video"
                accept="video/*"
                value={editing.sample_video_url}
                onChange={(url) => update('sample_video_url', url)}
              />
              <MediaUploadMulti
                label="Slider Images"
                value={editing.slider_images}
                onChange={(urls) => update('slider_images', urls)}
              />
            </div>

            {/* ── Description ── */}
            <h4 className="text-[10px] font-bold uppercase tracking-wider">Description</h4>
            <textarea
              value={editing.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Long-form summary shown on the puja detail page"
              className="w-full h-20 px-3 py-2 bg-accent border border-border rounded-md text-xs text-foreground resize-none"
            />

            {/* ── Benefits / Rituals ── */}
            <h4 className="text-[10px] font-bold uppercase tracking-wider">Benefits</h4>
            <textarea
              value={editing.benefits}
              onChange={(e) => update('benefits', e.target.value)}
              placeholder="Bhuta Sudhi for Peace, Good Health, Solve Family Issues"
              className="w-full h-16 px-3 py-2 bg-accent border border-border rounded-md text-xs text-foreground resize-none"
            />

            <h4 className="text-[10px] font-bold uppercase tracking-wider">Rituals Included</h4>
            <textarea
              value={editing.rituals_included}
              onChange={(e) => update('rituals_included', e.target.value)}
              placeholder="Type Here"
              className="w-full h-16 px-3 py-2 bg-accent border border-border rounded-md text-xs text-foreground resize-none"
            />

            {/* ── Items used (chip list) ── */}
            <ChipListInput
              label="Items Used"
              placeholder="Type and press Enter (e.g. Hibiscus Garland)"
              value={editing.items_used}
              onChange={(v) => update('items_used', v)}
            />

            {/* ── How it will happen (steps) ── */}
            <StepListInput
              label="How It Will Happen"
              value={editing.how_will_it_happen}
              onChange={(v) => update('how_will_it_happen', v)}
            />

            {/* ── Puja Shlok (shown read-only on web booking flow) ── */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block">Puja Shlok</label>
              <textarea
                rows={3}
                value={editing.shlok}
                onChange={(e) => update('shlok', e.target.value)}
                placeholder="Sanskrit / Hindi shlok shown to devotees during booking"
                className="w-full bg-accent border border-border rounded-md px-3 py-2 text-xs text-foreground"
              />
            </div>

            {/* ── Hamper ── */}
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

            {/* ── Footer ── */}
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
              Events with any booking (past or present, any status) are kept.
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

// ─── Helper inputs ─────────────────────────────────────────────────────────

function ChipListInput({
  label, placeholder, value, onChange,
}: {
  label: string; placeholder?: string; value: string[]; onChange: (v: string[]) => void;
}) {
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
            <button
              type="button"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              className="text-muted-foreground hover:text-red-500"
              aria-label="Remove"
            >×</button>
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
}: {
  label: string; value: string[]; onChange: (v: string[]) => void;
}) {
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
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-xs text-muted-foreground hover:text-red-500 px-2"
              aria-label="Remove step"
            >×</button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="text-xs text-primary hover:underline mt-1.5"
      >+ Add step</button>
    </div>
  );
}
