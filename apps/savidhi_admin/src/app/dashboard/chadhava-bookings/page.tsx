'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { chadhavaEventService, chadhavaBookingService, chadhavaService, pujariService } from '@/lib/services';
import { sortRows, type SortDir } from '@/lib/sort';
import { useDebouncedValue } from '@/lib/hooks';
import { toLocalDatetimeInputIST, fromLocalDatetimeInputIST } from '@/lib/dateUtils';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { TimelineView } from '@/components/shared/TimelineView';
import { Modal } from '@/components/shared/Modal';
import { ExpandButton, DeleteButton, PrimaryButton, OutlineButton, ViewButton } from '@/components/shared/ActionButtons';
import { MediaUploadSingle } from '@/components/shared/MediaUpload';
import { VideoPreview } from '@/components/shared/VideoPreview';
import type { ChadhavaEvent, ChadhavaBooking, TimelineEvent } from '@/types';

/* ── helpers ──────────────────────────────────────────────── */

const STATUS_COLOR: Record<string, TimelineEvent['color']> = {
  NOT_STARTED: 'orange',
  INPROGRESS:  'teal',
  COMPLETED:   'green',
};

type ChadhavaEventStage =
  | 'YET_TO_START'
  | 'LIVE_ADDED'
  | 'SHORT_VIDEO_ADDED'
  | 'SANKALP_VIDEO_ADDED'
  | 'COMPLETED';

function toTimelineEvent(e: any): TimelineEvent {
  const d = new Date(e.start_time ?? e.startTime);
  return {
    id:            e.id,
    title:         `${(e.chadhava_name ?? e.chadhavaName ?? '').toUpperCase()} -${(e.temple_name ?? e.temple ?? '').split(' ')[0]?.toUpperCase() ?? ''}`,
    subtitle:      `BOOKINGS: ${e.total_bookings ?? 0}/${e.max_bookings ?? 100}`,
    startHour:     d.getHours() + d.getMinutes() / 60,
    durationHours: 2,
    day:           d.getDate(),
    date:          e.start_time ?? e.startTime,
    color:         STATUS_COLOR[e.status] ?? 'orange',
    status:        e.status,
    stage:         e.stage,
  };
}

function mapEvent(e: any): ChadhavaEvent & { stage: ChadhavaEventStage; rawStartTime: string } {
  return {
    ...e,
    chadhavaName: e.chadhava_name ?? e.chadhavaName ?? '',
    temple:       e.temple_name  ?? e.temple ?? '',
    bookings:     `${e.total_bookings ?? 0}/${e.max_bookings ?? 100}`,
    startTime:    e.start_time
      ? new Date(e.start_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : e.startTime ?? '',
    pujari:       e.pujari_name ?? e.pujari ?? 'Not Assigned',
    stage:        e.stage ?? 'YET_TO_START',
    rawStartTime: e.start_time ?? '',
  };
}

function mapBooking(b: any): ChadhavaBooking {
  return {
    id:                   b.id,
    bookedBy:             b.devotee_name ?? b.bookedBy ?? '',
    bookedByPhone:        b.devotee_phone ?? b.bookedByPhone ?? '',
    devoteeCount:         b.devotees?.length ?? b.devoteeCount ?? 0,
    bookingTime:          b.created_at
      ? new Date(b.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : b.bookingTime ?? '',
    offerings:            b.offerings && b.offerings.length
      ? b.offerings
          .map((o: any) => `${o.quantity ?? 1}X ${o.item_name ?? o.name ?? ''}`.trim())
          .filter(Boolean)
          .join(', ')
      : b.offerings_summary ?? '',
    cost:                 Number(b.cost ?? 0),
    status:               b.status,
    chadhavaName:         b.chadhava_name ?? b.chadhavaName ?? '',
    temple:               b.temple_name   ?? b.temple ?? '',
    bookedAt:             b.created_at
      ? new Date(b.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : b.bookedAt ?? '',
    devotees:             (b.devotees ?? []).map((d: any) => ({ name: d.name, gotra: d.gotra })),
    totalOfferings:       (b.offerings ?? []).map((o: any) => ({
      name:     o.item_name ?? o.name ?? '',
      quantity: o.quantity ?? 0,
    })),
    sankalp:              b.sankalp ?? '',
    prasadDeliveryAddress: b.prasad_delivery_address ?? b.prasadDeliveryAddress ?? '',
    pujari:               b.pujari_name ?? b.pujari ?? '',
    sankalpVideoTimeStamp: b.sankalp_video_timestamp ?? b.sankalpVideoTimeStamp,
    // Subscription bookkeeping surfaced via the new Type column (migration 023).
    bookingType:           b.booking_type ?? 'ONE_TIME',
    subscriptionCount:     b.subscription_count ?? null,
    subscriptionRemaining: b.subscription_remaining ?? null,
  };
}

/* ── stage actions ─────────────────────────────────────────── */
// PDF: chadhava has NO prasad shipping. Terminal stage after sankalp is COMPLETED.
const STAGE_ACTIONS: Record<ChadhavaEventStage, { label: string }> = {
  YET_TO_START:        { label: 'Add Live Feed Link' },
  LIVE_ADDED:          { label: 'Add Short Video' },
  SHORT_VIDEO_ADDED:   { label: 'Add Sankalp Video' },
  SANKALP_VIDEO_ADDED: { label: 'Mark Complete' },
  COMPLETED:           { label: 'Completed' },
};

/* ══════════════════════════════════════════════════════════ */

export default function ChadhavaBookingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading chadhava events…</div>}>
      <ChadhavaBookingsPageInner />
    </Suspense>
  );
}

function ChadhavaBookingsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const filterChadhavaId = searchParams.get('chadhava_id') ?? '';
  const filterPujariId = searchParams.get('pujari_id') ?? '';

  const [tab,        setTab]        = useState('List');
  const [search,     setSearch]     = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  // PDF item 4b — date range filter on the events list.
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedPage, setExpandedPage] = useState(1);
  const EXPANDED_PAGE_SIZE = 5;
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const [selectedBooking, setSelectedBooking] = useState<ChadhavaBooking | null>(null);
  const [selectedEvent,   setSelectedEvent]   = useState<(ChadhavaEvent & { stage: ChadhavaEventStage; bookingsData?: any[] }) | null>(null);

  const [showLiveModal,    setShowLiveModal]    = useState(false);
  const [showVideoModal,   setShowVideoModal]   = useState(false);
  const [showSankalpModal, setShowSankalpModal] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editEventPujariId, setEditEventPujariId] = useState('');
  const [editEventStartTime, setEditEventStartTime] = useState('');
  const [editEventMaxBookings, setEditEventMaxBookings] = useState<number>(0);
  const [editEventHasPrasad, setEditEventHasPrasad] = useState(true);

  const [liveLink,       setLiveLink]       = useState('');
  const [shortVideoUrl,  setShortVideoUrl]  = useState('');
  const [sankalpVideoUrl, setSankalpVideoUrl] = useState('');
  const [sankalpTimestamps, setSankalpTimestamps] = useState<Record<string, { minute: string; second: string }>>({});

  // Create-event state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [availableChadhavas, setAvailableChadhavas] = useState<Array<{ id: string; name: string; temple_name?: string }>>([]);
  const [availablePujaris, setAvailablePujaris] = useState<Array<{ id: string; name: string }>>([]);
  const [newEventChadhavaId, setNewEventChadhavaId] = useState('');
  const [newEventPujariId, setNewEventPujariId] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventHasPrasad, setNewEventHasPrasad] = useState(true);
  const [creating, setCreating] = useState(false);

  const [chadhavaEvents, setChadhavaEvents] = useState<(ChadhavaEvent & { stage: ChadhavaEventStage })[]>([]);
  const [chadhavaBookings, setChadhavaBookings] = useState<ChadhavaBooking[]>([]);
  const [timelineEvents,   setTimelineEvents]   = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  /* ── Fetch events ── */
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { limit: 100 };
      if (filterChadhavaId) params.chadhava_id = filterChadhavaId;
      if (filterPujariId) params.pujari_id = filterPujariId;
      // Item 3: server-side search (ID / chadhava name / temple).
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      // Item 4b: date range filter on start_time.
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      const res = await chadhavaEventService.list(params);
      const raw = res.data?.data ?? res.data ?? [];
      setChadhavaEvents(raw.map(mapEvent));
      // Calendar can only place events that have a real start_time.
      setTimelineEvents(raw.filter((e: any) => e.start_time).map(toTimelineEvent));
    } catch (err: any) {
      setError(err.message || 'Failed to load chadhava events');
    } finally {
      setLoading(false);
    }
  }, [filterChadhavaId, filterPujariId, debouncedSearch, fromDate, toDate]);

  /* ── Delete event (real DELETE) ── */
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    try {
      await chadhavaEventService.delete(eventId);
      await fetchEvents();
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message
        || (status === 409
          ? 'Event has active bookings; cancel them first.'
          : err?.message || 'Failed to delete event');
      alert(msg);
    }
  };

  /* ── Cancel-all-bookings (confirm by id) ── */
  const handleCancelAllBookings = async (eventId: string) => {
    const confirmId = prompt(`To cancel all bookings on this event, type the event id (${eventId.slice(0, 8)}…):`);
    if (!confirmId || !eventId.startsWith(confirmId.trim())) {
      alert('Confirmation did not match. Aborted.');
      return;
    }
    try {
      const res = await chadhavaEventService.cancelAllBookings(eventId, { reason: 'Admin bulk cancel', refund: true });
      const data = res.data?.data ?? res.data;
      alert(`Cancelled ${data?.cancelled_count ?? 0} bookings. Refund initiated for ${data?.refund_initiated_count ?? 0}.`);
      await fetchEvents();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to cancel bookings');
    }
  };

  const clearFilter = () => router.push('/dashboard/chadhava-bookings');

  /* ── Fetch bookings for expanded event ── */
  // We hit the event-detail endpoint instead of the bookings list because the
  // list query does NOT return offerings — we need offerings + quantities for
  // the sub-row's "Offerings" column.
  const fetchBookings = useCallback(async (eventId: string) => {
    try {
      const res = await chadhavaEventService.getById(eventId);
      const data = res.data?.data ?? res.data ?? {};
      const raw = data.bookings ?? [];
      setChadhavaBookings(raw.map(mapBooking));
    } catch {
      setChadhavaBookings([]);
    }
  }, []);

  /* ── Fetch event detail (for modal) ── */
  const fetchEventDetail = useCallback(async (eventId: string) => {
    try {
      const res = await chadhavaEventService.getById(eventId);
      const data = res.data?.data ?? res.data;
      const mapped = mapEvent(data) as any;
      mapped.bookingsData = (data.bookings ?? []).map((b: any) => ({
        ...b,
        devotees:  b.devotees  ?? [],
        offerings: b.offerings ?? [],
      }));
      mapped.pujari_id = data.pujari_id ?? '';
      mapped.max_bookings = data.max_bookings ?? 100;
      setSelectedEvent(mapped);
      // PDF item 2 — IST-aware prefill so the form matches the details page.
      setEditEventPujariId(data.pujari_id ?? '');
      setEditEventStartTime(toLocalDatetimeInputIST(data.start_time));
      setEditEventMaxBookings(data.max_bookings ?? 100);
    } catch {
      // fallback: find in list
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Dropdowns for create-event modal
  useEffect(() => {
    (async () => {
      try {
        const [cRes, pjRes] = await Promise.all([
          chadhavaService.list({ limit: 200 }),
          pujariService.list({ limit: 200 }),
        ]);
        setAvailableChadhavas(cRes.data?.data ?? []);
        setAvailablePujaris(pjRes.data?.data ?? []);
      } catch { /* no-op */ }
    })();
  }, []);

  const openCreateModal = () => {
    setNewEventChadhavaId('');
    setNewEventPujariId('');
    setNewEventDate('');
    setNewEventTime('');
    setNewEventHasPrasad(true);
    setShowCreateModal(true);
  };

  const handleCreateEvent = async () => {
    if (!newEventChadhavaId) {
      alert('Please select a chadhava');
      return;
    }
    if ((newEventDate && !newEventTime) || (!newEventDate && newEventTime)) {
      alert('Please provide both date and time, or leave both empty');
      return;
    }
    try {
      setCreating(true);
      const start_time = newEventDate && newEventTime
        ? new Date(`${newEventDate}T${newEventTime}`).toISOString()
        : null;
      await chadhavaEventService.create({
        chadhava_id: newEventChadhavaId,
        pujari_id: newEventPujariId || undefined,
        start_time,
        has_prasad: newEventHasPrasad,
      } as any);
      setShowCreateModal(false);
      await fetchEvents();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (expandedId) {
      fetchBookings(expandedId);
      setExpandedPage(1);
    } else {
      setChadhavaBookings([]);
    }
  }, [expandedId, fetchBookings]);

  /* ── Stage advance ── */
  const handleAdvanceStage = async (eventId: string, data?: Record<string, any>) => {
    try {
      await chadhavaEventService.advanceStage(eventId, { ...data });
      await fetchEvents();
      if (selectedEvent?.id === eventId) await fetchEventDetail(eventId);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to advance stage');
    }
  };

  // Clears the chosen video URL on the event row. Uses /media so it works in
  // any stage (PDF item 5a/c).
  const handleRemoveVideo = async (eventId: string, field: 'short_video_url' | 'sankalp_video_url') => {
    const fieldLabel = field === 'short_video_url' ? 'short video' : 'sankalp video';
    if (!confirm(`Remove the ${fieldLabel} from this event?`)) return;
    try {
      await chadhavaEventService.updateMedia(eventId, { [field]: null });
      if (selectedEvent?.id === eventId) await fetchEventDetail(eventId);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to remove video');
    }
  };

  // Bookings eligible for the sankalp video timestamp UI: not cancelled AND
  // actually paid for. Same filter as the puja side; keeps the modal aligned
  // with the chadhava-sankalp report.
  const sankalpEligibleBookings = (((selectedEvent as any)?.bookingsData ?? []) as any[])
    .filter((b) => b.status !== 'CANCELLED' && (b.payment_status == null || b.payment_status === 'PAID'));

  // PDF item 5b — prefill per-booking sankalp timestamps when the modal opens
  // to replace an existing video.
  useEffect(() => {
    if (!showSankalpModal || !selectedEvent?.bookingsData) return;
    const next: Record<string, { minute: string; second: string }> = {};
    for (const b of sankalpEligibleBookings) {
      const ts = b.sankalp_video_timestamp;
      if (!ts) continue;
      const [m, s] = String(ts).split(':');
      next[b.id] = { minute: m ?? '', second: s ?? '' };
    }
    setSankalpTimestamps(next);
    if ((selectedEvent as any).sankalp_video_url) {
      setSankalpVideoUrl((selectedEvent as any).sankalp_video_url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSankalpModal, selectedEvent?.id, selectedEvent?.bookingsData]);

  useEffect(() => {
    if (!showVideoModal || !selectedEvent) return;
    if ((selectedEvent as any).short_video_url) {
      setShortVideoUrl((selectedEvent as any).short_video_url);
    }
  }, [showVideoModal, selectedEvent?.id]);

  const handleViewBooking = async (bookingId: string) => {
    try {
      const res = await chadhavaBookingService.getById(bookingId);
      const data = res.data?.data ?? res.data;
      setSelectedBooking(mapBooking(data));
    } catch {
      alert('Failed to load booking details');
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await chadhavaBookingService.cancel(bookingId);
      setSelectedBooking(null);
      if (expandedId) fetchBookings(expandedId);
      fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking');
    }
  };

  // Subscription Phase C — see puja-bookings sibling for full doc.
  const handleCancelSubscription = async (booking: ChadhavaBooking & { subscriptionRemaining?: number | null }) => {
    const remaining = booking.subscriptionRemaining ?? 0;
    const confirmMsg = remaining > 0
      ? `Stop subscription on this booking?\n\nThe next ${remaining} auto-paid chadhava${remaining > 1 ? 's' : ''} will be cancelled and the Razorpay e-mandate revoked. The current booking stays active — no refund on past charges.`
      : `Stop subscription on this booking?\n\nThe Razorpay e-mandate will be revoked. The current booking stays active.`;
    if (!confirm(confirmMsg)) return;
    try {
      const res = await chadhavaBookingService.cancelRepeat(booking.id);
      const mandate = res.data?.meta?.mandate_cancel_status;
      const cancelledChildren = res.data?.meta?.child_placeholders_cancelled ?? 0;
      let msg = `Subscription stopped. ${cancelledChildren} future booking${cancelledChildren !== 1 ? 's' : ''} cancelled.`;
      if (mandate === 'failed') msg += '\n\nNote: Razorpay mandate cancel failed at the gateway. We will retry. Watch for unexpected debits.';
      alert(msg);
      if (expandedId) fetchBookings(expandedId);
      fetchEvents();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to stop subscription');
    }
  };

  /* ── Columns ── */
  const eventColumns = [
    { key: 'id', label: 'ID', render: (r: any) => <span className="text-[10px] font-mono">{r.id.slice(0, 8)}</span> },
    { key: 'chadhavaName', label: 'Chadhava Name' },
    { key: 'temple',       label: 'Temple' },
    { key: 'bookings',     label: 'Bookings', render: (r: any) => {
      const [cur, max] = (r.bookings as string).split('/').map(Number);
      const pct = max > 0 ? cur / max : 0;
      return <span className={pct >= 0.9 ? 'text-status-completed font-bold' : ''}>{r.bookings}</span>;
    }},
    { key: 'startTime', label: 'Start Time' },
    { key: 'status',    label: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'pujari',    label: 'Pujari' },
    { key: 'action',    label: 'Action', render: (r: any) => (
      <div className="flex items-center gap-1">
        <ViewButton onClick={() => fetchEventDetail(r.id)} />
        <ExpandButton expanded={expandedId === r.id} onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} />
        <DeleteButton onClick={() => handleDeleteEvent(r.id)} />
      </div>
    )},
  ];

  const bookingColumns = [
    { key: 'id',       label: 'ID',       render: (r: any) => <span className="text-[10px] font-mono">{r.id.slice(0, 8)}</span> },
    { key: 'bookedBy', label: 'Booked By' },
    { key: 'bookedByPhone', label: 'Phone', render: (r: ChadhavaBooking) => (
      r.bookedByPhone ? <span className="font-mono text-[11px]">+91 {r.bookedByPhone}</span> : <span className="text-muted-foreground">—</span>
    ) },
    { key: 'bookingTime', label: 'Booking Time' },
    { key: 'offerings',   label: 'Offerings', render: (r: ChadhavaBooking) => (
      <span className="whitespace-pre-wrap">{r.offerings || '—'}</span>
    ) },
    { key: 'devoteeCount', label: 'Devotees' },
    { key: 'cost',        label: 'Cost', render: (r: ChadhavaBooking) => <span className="text-primary">₹{r.cost}</span> },
    { key: 'status',      label: 'Status', render: (r: ChadhavaBooking) => <StatusBadge status={r.status} /> },
    // Subscription Phase A — see puja-bookings sibling for the same chip.
    { key: 'bookingType', label: 'Type', render: (r: ChadhavaBooking) => (
      r.bookingType === 'SUBSCRIPTION'
        ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
            Sub {r.subscriptionRemaining ?? '?'}/{r.subscriptionCount ?? '?'}
          </span>
        : <span className="text-muted-foreground text-[10px]">—</span>
    )},
    { key: 'action',      label: 'Action', render: (r: ChadhavaBooking) => (
      <div className="flex items-center gap-1">
        <button onClick={() => handleViewBooking(r.id)} className="text-primary text-[10px] hover:underline">View</button>
        {r.bookingType === 'SUBSCRIPTION' && (r.subscriptionRemaining ?? 0) > 0 && (
          <button
            onClick={() => handleCancelSubscription(r)}
            title="Stop future auto-paid bookings + revoke Razorpay mandate"
            className="text-[10px] text-red-600 hover:text-red-700 px-1 border border-red-200 rounded hover:bg-red-50"
          >
            Stop Sub
          </button>
        )}
        <DeleteButton onClick={() => handleCancelBooking(r.id)} title="Cancel this booking" />
      </div>
    )},
  ];

  // Paginated slice of bookings for the inline expanded panel.
  const expandedTotalPages = Math.max(1, Math.ceil(chadhavaBookings.length / EXPANDED_PAGE_SIZE));
  const expandedPageClamped = Math.min(expandedPage, expandedTotalPages);
  const expandedSlice = chadhavaBookings.slice(
    (expandedPageClamped - 1) * EXPANDED_PAGE_SIZE,
    expandedPageClamped * EXPANDED_PAGE_SIZE,
  );

  /* ── Derived for event modal ── */
  const eventStage   = (selectedEvent as any)?.stage as ChadhavaEventStage | undefined;
  const eventStatus  = (selectedEvent as any)?.status as string | undefined;
  const isEventCancelled = eventStatus === 'CANCELLED';
  const allDevotees  = ((selectedEvent as any)?.bookingsData ?? []).flatMap((b: any) =>
    (b.devotees ?? []).map((d: any) => ({ name: d.name, gotra: d.gotra, offerings: b.offerings ?? [] }))
  );
  const totalOfferings = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of (selectedEvent as any)?.bookingsData ?? []) {
      for (const o of b.offerings ?? []) {
        const name = o.item_name ?? o.name ?? '';
        map.set(name, (map.get(name) ?? 0) + (o.quantity ?? 1));
      }
    }
    return Array.from(map.entries()).map(([name, qty]) => ({ name, qty }));
  }, [selectedEvent]);

  if (loading && chadhavaEvents.length === 0) {
    return <div className="flex items-center justify-center h-64"><div className="text-sm text-muted-foreground">Loading chadhava events...</div></div>;
  }
  if (error && chadhavaEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-sm text-red-500">{error}</div>
        <OutlineButton onClick={fetchEvents}>Retry</OutlineButton>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        tabs={['List', 'Timeline']}
        activeTab={tab}
        onTabChange={setTab}
        search={search}
        onSearchChange={setSearch}
        onAdd={openCreateModal}
        showDateNav
        fromDate={fromDate}
        toDate={toDate}
        onDateChange={({ from, to }) => { setFromDate(from); setToDate(to); }}
      />

      {(filterChadhavaId || filterPujariId) && (
        <div className="bg-primary/10 border border-primary/30 rounded-md px-4 py-2 mb-3 flex items-center justify-between">
          <div className="text-xs">
            {filterChadhavaId && (
              <>Showing events for <span className="font-semibold">{availableChadhavas.find((c) => c.id === filterChadhavaId)?.name ?? filterChadhavaId.slice(0, 8)}</span></>
            )}
            {filterPujariId && (
              <>Showing events assigned to <span className="font-semibold">{availablePujaris.find((p) => p.id === filterPujariId)?.name ?? filterPujariId.slice(0, 8)}</span></>
            )}
            <span className="ml-2 text-muted-foreground">· Total: {chadhavaEvents.length}</span>
          </div>
          <button onClick={clearFilter} className="text-xs text-primary hover:underline">Clear filter</button>
        </div>
      )}

      {!filterChadhavaId && !filterPujariId && chadhavaEvents.length > 0 && (
        <div className="text-xs text-muted-foreground mb-2">Total: {chadhavaEvents.length} events</div>
      )}

      {tab === 'List' ? (
        <div>
          {chadhavaEvents.length === 0 ? (
            <div className="border border-dashed border-border rounded-md p-8 text-center text-sm text-muted-foreground">
              No events match these filters.
              {(filterChadhavaId || filterPujariId) && (
                <> <button onClick={clearFilter} className="text-primary hover:underline">Clear filters</button></>
              )}
            </div>
          ) : (
            <DataTable
              columns={eventColumns}
              data={sortRows(chadhavaEvents, sortKey, sortDir)}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={handleSort}
              expandedKey={expandedId}
              renderExpanded={() => (
                <div className="px-4 py-3 border-l-2 border-primary/40 bg-background">
                  {chadhavaBookings.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-2">No bookings yet for this event.</div>
                  ) : (
                    <>
                      <DataTable columns={bookingColumns} data={expandedSlice} />
                      {expandedTotalPages > 1 && (
                        <div className="flex items-center justify-end gap-2 mt-2 text-[11px] text-muted-foreground">
                          <button
                            onClick={() => setExpandedPage((p) => Math.max(1, p - 1))}
                            disabled={expandedPageClamped <= 1}
                            className="h-6 w-6 rounded border border-border bg-accent hover:text-foreground disabled:opacity-40 flex items-center justify-center"
                            title="Previous page"
                          >‹</button>
                          <span>Page {expandedPageClamped}/{expandedTotalPages}</span>
                          <button
                            onClick={() => setExpandedPage((p) => Math.min(expandedTotalPages, p + 1))}
                            disabled={expandedPageClamped >= expandedTotalPages}
                            className="h-6 w-6 rounded border border-border bg-accent hover:text-foreground disabled:opacity-40 flex items-center justify-center"
                            title="Next page"
                          >›</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            />
          )}
        </div>
      ) : (
        <TimelineView
          events={timelineEvents}
          onEventClick={(evt) => { if (evt?.id) fetchEventDetail(evt.id); }}
        />
      )}

      {/* ── Individual Booking Detail Modal ── */}
      <Modal
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title={`Booking <${selectedBooking?.id?.slice(0, 8)}> Details`}
        statusBadge={selectedBooking && <StatusBadge status={selectedBooking.status} />}
      >
        {selectedBooking && (
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-foreground">Chadhava : {selectedBooking.chadhavaName}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Temple: {selectedBooking.temple}</p>
                <p className="text-[11px] text-muted-foreground">Booked at: {selectedBooking.bookedAt}</p>
              </div>
              <span className="text-primary font-bold text-sm">₹{selectedBooking.cost}</span>
            </div>

            <div className="border border-border rounded-lg p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider">Devotee Details</span>
              {(selectedBooking.devotees ?? []).map((d, i) => (
                <div key={i} className="text-[11px] mt-1">
                  <span className="text-foreground">{d.name}</span>
                  <span className="text-muted-foreground ml-2">Gotra: {d.gotra}</span>
                </div>
              ))}
            </div>

            {selectedBooking.sankalp && (
              <div className="border border-border rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1">Sankalp</p>
                <p className="text-[11px] text-muted-foreground">{selectedBooking.sankalp}</p>
              </div>
            )}

            <div className="border border-border rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1">Offerings</p>
              {(selectedBooking.totalOfferings ?? []).map((o: { name: string; quantity: number }, i: number) => (
                <div key={i} className="flex justify-between text-[11px]">
                  <span className="text-foreground">{o.name}</span>
                  <span className="text-primary">{o.quantity}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-muted-foreground">Prasad Delivery Address: {selectedBooking.prasadDeliveryAddress}</p>
            <p className="text-[11px] text-muted-foreground">Pujari: {selectedBooking.pujari}</p>

            {selectedBooking.sankalpVideoTimeStamp && (
              <p className="text-[11px] text-muted-foreground">
                Sankalp Video Time Stamp: {selectedBooking.sankalpVideoTimeStamp} <span className="text-primary cursor-pointer">✏️</span>
              </p>
            )}

            <div className="flex gap-3 mt-4">
              {selectedBooking.status === 'NOT_STARTED' && (
                <OutlineButton className="flex-1" onClick={() => handleCancelBooking(selectedBooking.id)}>Cancel Booking</OutlineButton>
              )}
              <PrimaryButton className="flex-1" onClick={() => setSelectedBooking(null)}>Close</PrimaryButton>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Chadhava Event Detail Modal (timeline click) ── */}
      <Modal
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={`CDVA Evn ${selectedEvent?.id?.slice(0, 8)} Details`}
        statusBadge={selectedEvent && <StatusBadge status={selectedEvent.status} />}
        wide
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-foreground">Chadhava : {selectedEvent.chadhavaName}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Temple: {selectedEvent.temple}</p>
              <p className="text-[11px] text-muted-foreground">Start Time: {selectedEvent.startTime}</p>
            </div>

            {/* Devotee Details */}
            <div className="border border-border rounded-lg p-3">
              <div className="flex justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider">Devotee Details</span>
                <span className="text-[10px] text-muted-foreground">{allDevotees.length}</span>
              </div>
              {allDevotees.length > 0 ? (
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {allDevotees.map((d: any, i: number) => (
                    <div key={i} className="text-[11px]">
                      <span className="text-foreground">{d.name}</span>
                      <span className="text-muted-foreground ml-2">Gotra: {d.gotra}</span>
                      {d.offerings?.length > 0 && (
                        <div className="text-[10px] text-muted-foreground">
                          Offerings: {d.offerings.map((o: any) => `${o.quantity}x ${o.item_name ?? o.name}`).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">No devotees yet</p>
              )}
            </div>

            {/* Total Offerings */}
            {totalOfferings.length > 0 && (
              <div className="border border-border rounded-lg p-3">
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Total Offerings</span>
                  <span className="text-[10px] text-muted-foreground">{totalOfferings.length}</span>
                </div>
                {totalOfferings.map((o, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="text-foreground">{o.name}</span>
                    <span className="text-status-completed">{o.qty}</span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">Pujari: {selectedEvent.pujari} <span className="text-primary cursor-pointer">✏️</span></p>

            {/* Live link indicator */}
            {eventStage && eventStage !== 'YET_TO_START' && (
              <p className="text-[11px] text-muted-foreground">
                Live Link: <span className="text-status-completed">Added</span> <span className="text-primary cursor-pointer">✏️</span>
              </p>
            )}

            {/* Short + sankalp video slots — PDF item 5a: always visible (any
                stage past YET_TO_START) with re-upload button on empty slots.
                Lets admin replace/delete videos even on COMPLETED events. */}
            {eventStage && eventStage !== 'YET_TO_START' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-border rounded-lg p-3">
                  <p className="text-[10px] font-bold mb-2 uppercase tracking-wider text-muted-foreground">Short Video</p>
                  {(selectedEvent as any).short_video_url ? (
                    <VideoPreview
                      value={(selectedEvent as any).short_video_url}
                      onReplace={() => setShowVideoModal(true)}
                      onRemove={() => handleRemoveVideo(selectedEvent.id, 'short_video_url')}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowVideoModal(true)}
                      className="w-full bg-accent rounded-lg h-20 flex items-center justify-center text-xs text-primary hover:bg-accent/80 border border-dashed border-border"
                    >
                      + Upload Short Video
                    </button>
                  )}
                </div>
                <div className="border border-border rounded-lg p-3">
                  <p className="text-[10px] font-bold mb-2 uppercase tracking-wider text-muted-foreground">Sankalp Video</p>
                  {(selectedEvent as any).sankalp_video_url ? (
                    <VideoPreview
                      value={(selectedEvent as any).sankalp_video_url}
                      onReplace={() => setShowSankalpModal(true)}
                      onRemove={() => handleRemoveVideo(selectedEvent.id, 'sankalp_video_url')}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSankalpModal(true)}
                      className="w-full bg-accent rounded-lg h-20 flex items-center justify-center text-xs text-primary hover:bg-accent/80 border border-dashed border-border"
                    >
                      + Upload Sankalp Video
                    </button>
                  )}
                </div>
              </div>
            )}

            {eventStage === 'COMPLETED' && (
              <p className="text-[11px] text-muted-foreground">Rating: ⭐ 5 Star (99)</p>
            )}

            {/* PDF item 1 — row 1: Edit Event Meta + stage action;
                row 2: Delete Event + Cancel All & Refund. Close removed. */}
            {isEventCancelled ? (
              <div className="mt-4 p-3 rounded-md border border-red-200 bg-red-50 text-xs text-red-700">
                This event is <strong>CANCELLED</strong>. Stage progression is locked.
                Refunds for affected bookings have been queued.
              </div>
            ) : (
              <div className="flex gap-3 mt-4">
                <OutlineButton className="flex-1" onClick={() => {
                  setEditEventHasPrasad((selectedEvent as any)?.has_prasad ?? true);
                  setShowEditEventModal(true);
                }}>Edit Event Meta</OutlineButton>
                {eventStage === 'YET_TO_START' && (
                  <PrimaryButton className="flex-1" onClick={() => setShowLiveModal(true)}>Add Live Feed Link</PrimaryButton>
                )}
                {eventStage === 'LIVE_ADDED' && (
                  <PrimaryButton className="flex-1" onClick={() => setShowVideoModal(true)}>Add Short Video</PrimaryButton>
                )}
                {eventStage === 'SHORT_VIDEO_ADDED' && (
                  <PrimaryButton className="flex-1" onClick={() => setShowSankalpModal(true)}>Add Sankalp Video</PrimaryButton>
                )}
                {eventStage === 'SANKALP_VIDEO_ADDED' && (
                  <PrimaryButton className="flex-1" onClick={() => handleAdvanceStage(selectedEvent.id)}>Mark Complete</PrimaryButton>
                )}
              </div>
            )}

            {!isEventCancelled && (
              <div className="flex gap-3 mt-2 pt-3 border-t border-border">
                <OutlineButton
                  className="flex-1 text-red-500 border-red-300 hover:bg-red-50"
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                >
                  Delete Event
                </OutlineButton>
                <OutlineButton
                  className="flex-1 text-red-500 border-red-300 hover:bg-red-50"
                  onClick={() => handleCancelAllBookings(selectedEvent.id)}
                >
                  Cancel All & Refund
                </OutlineButton>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Edit Event Meta Modal ── */}
      <Modal open={showEditEventModal} onClose={() => setShowEditEventModal(false)} title="Edit Event Metadata">
        {selectedEvent && (
          <div className="space-y-3">
            <p className="text-[10px] text-muted-foreground">Editing event {selectedEvent.id.slice(0, 8)}…</p>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block">Pujari</label>
              <select
                value={editEventPujariId}
                onChange={(e) => setEditEventPujariId(e.target.value)}
                className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs"
              >
                <option value="">Unassigned</option>
                {availablePujaris.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block">
                Start Time
                {(selectedEvent.bookingsData?.length ?? 0) > 0 && (
                  <span className="ml-2 text-red-500 font-normal normal-case">— locked (event has bookings)</span>
                )}
              </label>
              <input
                type="datetime-local"
                value={editEventStartTime}
                onChange={(e) => setEditEventStartTime(e.target.value)}
                disabled={(selectedEvent.bookingsData?.length ?? 0) > 0}
                className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block">Max Bookings</label>
              <input
                type="number"
                min={1}
                value={editEventMaxBookings}
                onChange={(e) => setEditEventMaxBookings(Number(e.target.value))}
                className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-foreground select-none cursor-pointer">
              <input
                type="checkbox"
                checked={editEventHasPrasad}
                onChange={(e) => setEditEventHasPrasad(e.target.checked)}
                className="accent-primary"
              />
              Prasad delivery enabled
            </label>
            <div className="flex gap-3 mt-3">
              <OutlineButton className="flex-1" onClick={() => setShowEditEventModal(false)}>Cancel</OutlineButton>
              <PrimaryButton className="flex-1" onClick={async () => {
                if (!selectedEvent) return;
                const data: any = {};
                if (editEventPujariId !== ((selectedEvent as any).pujari_id ?? '')) {
                  data.pujari_id = editEventPujariId || null;
                }
                if ((selectedEvent.bookingsData?.length ?? 0) === 0) {
                  // Treat the datetime-local value as IST wall time (item 2).
                  data.start_time = editEventStartTime
                    ? fromLocalDatetimeInputIST(editEventStartTime)
                    : null;
                }
                if (editEventMaxBookings && editEventMaxBookings !== (selectedEvent as any).max_bookings) {
                  data.max_bookings = editEventMaxBookings;
                }
                if (editEventHasPrasad !== ((selectedEvent as any).has_prasad ?? true)) {
                  data.has_prasad = editEventHasPrasad;
                }
                if (Object.keys(data).length === 0) {
                  alert('No changes to save');
                  return;
                }
                try {
                  await chadhavaEventService.update(selectedEvent.id, data);
                  setShowEditEventModal(false);
                  await fetchEvents();
                  await fetchEventDetail(selectedEvent.id);
                } catch (err: any) {
                  alert(err?.response?.data?.message || 'Save failed');
                }
              }}>Save</PrimaryButton>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Add Live Feed Link Modal ── (Skip is allowed — live link is optional) */}
      <Modal open={showLiveModal} onClose={() => setShowLiveModal(false)} title="Add Live Feed Link" onBack={() => setShowLiveModal(false)}>
        <div className="space-y-4">
          <input
            value={liveLink}
            onChange={e => setLiveLink(e.target.value)}
            placeholder="Paste YouTube Private Link (optional)"
            className="w-full h-10 px-3 bg-accent border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                if (selectedEvent) await handleAdvanceStage(selectedEvent.id, {});
                setLiveLink('');
                setShowLiveModal(false);
              }}
              className="flex-1 h-10 bg-accent border border-border rounded-md text-xs text-foreground hover:bg-accent/80"
            >
              Skip
            </button>
            <PrimaryButton className="flex-1" onClick={async () => {
              if (selectedEvent) {
                const payload = liveLink.trim() ? { live_link: liveLink.trim() } : {};
                await handleAdvanceStage(selectedEvent.id, payload);
              }
              setLiveLink('');
              setShowLiveModal(false);
            }}>Submit</PrimaryButton>
          </div>
        </div>
      </Modal>

      {/* ── Add Short Video Modal ── */}
      <Modal open={showVideoModal} onClose={() => setShowVideoModal(false)} title="Add Chadhava Short Video" onBack={() => setShowVideoModal(false)}>
        <div className="space-y-4">
          <MediaUploadSingle
            value={shortVideoUrl}
            onChange={setShortVideoUrl}
            accept="video/*"
            type="video"
            label="Short Video File"
          />
          <PrimaryButton className="w-full" onClick={async () => {
            if (!shortVideoUrl.trim()) return alert('Please upload a video');
            if (selectedEvent) {
              const currentStage = (selectedEvent as any).stage as string | undefined;
              try {
                if (currentStage === 'LIVE_ADDED') {
                  await handleAdvanceStage(selectedEvent.id, { short_video_url: shortVideoUrl });
                } else {
                  await chadhavaEventService.updateMedia(selectedEvent.id, { short_video_url: shortVideoUrl });
                  await fetchEvents();
                  await fetchEventDetail(selectedEvent.id);
                }
              } catch (err: any) {
                alert(err?.response?.data?.message || err?.message || 'Failed to save short video');
                return;
              }
            }
            setShortVideoUrl('');
            setShowVideoModal(false);
          }}>Submit</PrimaryButton>
        </div>
      </Modal>

      {/* ── Add Sankalp Video Modal ── */}
      <Modal open={showSankalpModal} onClose={() => setShowSankalpModal(false)} title="Add Sankalp Video" onBack={() => setShowSankalpModal(false)} wide>
        <div className="flex flex-col gap-3 max-h-[80vh]">
          {/* Sticky video uploader/player at top — scrubbing source for the
              timestamps list below which scrolls independently. */}
          <div className="sticky top-0 z-10 bg-background pb-2 -mx-4 px-4 border-b border-border/50">
            <MediaUploadSingle
              value={sankalpVideoUrl}
              onChange={setSankalpVideoUrl}
              accept="video/*"
              type="video"
              label="Sankalp Video File"
            />
          </div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider">Devotee Name Timestamp (per booking)</h4>
          <div className="overflow-y-auto pr-1 space-y-3 max-h-[40vh]">
          {sankalpEligibleBookings.map((b: any) => (
            <div key={b.id} className="flex items-center gap-3">
              <div className="min-w-[12rem] flex-1">
                <p className="text-xs text-foreground leading-tight">
                  {b.devotees?.[0]?.name ?? 'Devotee'}
                  {b.devotees?.[0]?.gotra ? ` · ${b.devotees[0].gotra}` : ''}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight">Booking: {b.id?.slice(0, 8)}</p>
              </div>
              <input
                placeholder="Min"
                type="number"
                min="0"
                value={sankalpTimestamps[b.id]?.minute ?? ''}
                onChange={(e) => setSankalpTimestamps((prev) => ({ ...prev, [b.id]: { ...prev[b.id], minute: e.target.value } }))}
                className="w-16 h-8 px-2 bg-accent border border-border rounded-md text-xs text-foreground"
              />
              <span className="text-xs text-muted-foreground">:</span>
              <input
                placeholder="Sec"
                type="number"
                min="0"
                max="59"
                value={sankalpTimestamps[b.id]?.second ?? ''}
                onChange={(e) => setSankalpTimestamps((prev) => ({ ...prev, [b.id]: { ...prev[b.id], second: e.target.value } }))}
                className="w-16 h-8 px-2 bg-accent border border-border rounded-md text-xs text-foreground"
              />
            </div>
          ))}
          </div>
          <PrimaryButton className="w-full" onClick={async () => {
            if (!sankalpVideoUrl.trim()) return alert('Please upload a video');
            if (selectedEvent) {
              // PDF item 5c: only advance when at SHORT_VIDEO_ADDED. For any
              // later stage (including COMPLETED) use the media route so we
              // don't trip the STAGE_TRANSITIONS guard.
              const currentStage = (selectedEvent as any).stage as string | undefined;
              try {
                if (currentStage === 'SHORT_VIDEO_ADDED') {
                  await handleAdvanceStage(selectedEvent.id, { sankalp_video_url: sankalpVideoUrl });
                } else {
                  await chadhavaEventService.updateMedia(selectedEvent.id, { sankalp_video_url: sankalpVideoUrl });
                  await fetchEvents();
                  await fetchEventDetail(selectedEvent.id);
                }
              } catch (err: any) {
                alert(err?.response?.data?.message || err?.message || 'Failed to save sankalp video');
                return;
              }
              await Promise.allSettled(
                Object.entries(sankalpTimestamps).map(([bookingId, ts]) => {
                  const m = parseInt(ts.minute || '0');
                  const s = parseInt(ts.second || '0');
                  if (isNaN(m) && isNaN(s)) return Promise.resolve();
                  const value = `${String(m || 0).padStart(2, '0')}:${String(s || 0).padStart(2, '0')}`;
                  return chadhavaBookingService.setSankalpTimestamp(bookingId, value);
                })
              );
            }
            setSankalpVideoUrl('');
            setSankalpTimestamps({});
            setShowSankalpModal(false);
          }}>Submit</PrimaryButton>
        </div>
      </Modal>

      {/* ── Create Chadhava Event Modal ── */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Chadhava Event">
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider">Chadhava</label>
            <select value={newEventChadhavaId} onChange={(e) => setNewEventChadhavaId(e.target.value)} className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground mt-1">
              <option value="">Select a chadhava</option>
              {availableChadhavas.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.temple_name ? ` — ${c.temple_name}` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider">Pujari (optional)</label>
            <select value={newEventPujariId} onChange={(e) => setNewEventPujariId(e.target.value)} className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground mt-1">
              <option value="">Auto-assign</option>
              {availablePujaris.map((pj) => <option key={pj.id} value={pj.id}>{pj.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider">Date</label>
              <input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground mt-1" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider">Time</label>
              <input type="time" value={newEventTime} onChange={(e) => setNewEventTime(e.target.value)} className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground mt-1" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-foreground select-none cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={newEventHasPrasad}
              onChange={(e) => setNewEventHasPrasad(e.target.checked)}
              className="accent-primary"
            />
            Prasad delivery enabled
          </label>
          <div className="flex gap-3 pt-2">
            <OutlineButton className="flex-1" onClick={() => setShowCreateModal(false)}>Cancel</OutlineButton>
            <PrimaryButton className="flex-1" onClick={handleCreateEvent} disabled={creating}>{creating ? 'Creating…' : 'Create Event'}</PrimaryButton>
          </div>
        </div>
      </Modal>

    </div>
  );
}
