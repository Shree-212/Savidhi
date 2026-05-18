'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { pujaEventService, pujaBookingService, pujaService, pujariService } from '@/lib/services';
import { sortRows, type SortDir } from '@/lib/sort';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { TimelineView } from '@/components/shared/TimelineView';
import { Modal } from '@/components/shared/Modal';
import { ExpandButton, DeleteButton, PrimaryButton, OutlineButton, ViewButton } from '@/components/shared/ActionButtons';
import { MediaUploadSingle } from '@/components/shared/MediaUpload';
import { VideoPreview } from '@/components/shared/VideoPreview';
import type { PujaEvent, PujaBooking, PujaEventStage, TimelineEvent } from '@/types';

/* ── helpers ──────────────────────────────────────────────── */

const STATUS_COLOR: Record<string, TimelineEvent['color']> = {
  NOT_STARTED: 'orange',
  INPROGRESS: 'teal',
  COMPLETED: 'green',
};

/** Map a raw API puja-event row into the TimelineEvent shape the calendar needs. */
function toTimelineEvent(e: any): TimelineEvent {
  const d = new Date(e.start_time);
  return {
    id: e.id,
    title: `${(e.puja_name ?? e.pujaName ?? '').toUpperCase()} -${(e.temple_name ?? e.temple ?? '').split(' ')[0]?.toUpperCase() ?? ''}`,
    subtitle: `DEVOTEES: ${e.total_bookings ?? 0}/${e.max_bookings ?? 200}`,
    startHour: d.getHours() + d.getMinutes() / 60,
    durationHours: 2, // default event duration
    day: d.getDate(),
    date: e.start_time,
    color: STATUS_COLOR[e.status] ?? 'orange',
    status: e.status,
    stage: e.stage,
  };
}

/** Map a raw API puja-event row into the list-table shape. */
function mapEvent(e: any): PujaEvent & { stage: PujaEventStage; rawStartTime: string } {
  return {
    ...e,
    pujaName: e.puja_name ?? e.pujaName ?? '',
    temple: e.temple_name ?? e.temple ?? '',
    bookings: `${e.total_bookings ?? 0}/${e.max_bookings ?? 200}`,
    devoteeCount: e.total_devotees ?? e.devoteeCount ?? 0,
    startTime: e.start_time
      ? new Date(e.start_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : e.startTime ?? '',
    pujari: e.pujari_name ?? e.pujari ?? 'Not Assigned',
    stage: e.stage ?? 'YET_TO_START',
    rawStartTime: e.start_time,
  };
}

/** Map a raw API puja-booking row into the nested-table shape. */
function mapBooking(b: any): PujaBooking {
  return {
    id: b.id,
    bookedBy: b.devotee_name ?? b.bookedBy ?? '',
    bookedByPhone: b.devotee_phone ?? b.bookedByPhone ?? '',
    devoteeCount: b.devotee_count ?? b.devoteeCount ?? 0,
    bookingTime: b.created_at
      ? new Date(b.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : b.bookingTime ?? '',
    cost: Number(b.cost ?? 0),
    status: b.status,
    pujaName: b.puja_name ?? b.pujaName ?? '',
    temple: b.temple_name ?? b.temple ?? '',
    bookedAt: b.created_at
      ? new Date(b.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : b.bookedAt ?? '',
    devotees: b.devotees ?? [],
    sankalp: b.sankalp ?? '',
    prasadDeliveryAddress: b.prasad_delivery_address ?? b.prasadDeliveryAddress ?? '',
    pujari: b.pujari_name ?? b.pujari ?? '',
    sankalpVideoTimeStamp: b.sankalp_video_timestamp ?? b.sankalpVideoTimeStamp,
  };
}

/* ── stage labels ──────────────────────────────────────────── */
const STAGE_ACTIONS: Record<string, { label: string; next?: string }> = {
  YET_TO_START: { label: 'Add Live Feed Link', next: 'LIVE_ADDED' },
  LIVE_ADDED: { label: 'Add Short Video', next: 'SHORT_VIDEO_ADDED' },
  SHORT_VIDEO_ADDED: { label: 'Add Sankalp Video', next: 'SANKALP_VIDEO_ADDED' },
  SANKALP_VIDEO_ADDED: { label: 'Mark Ready to Ship', next: 'TO_BE_SHIPPED' },
  TO_BE_SHIPPED: { label: 'Ship Prashad', next: 'SHIPPED' },
  SHIPPED: { label: 'Track Bulk Packages' },
};

/* ══════════════════════════════════════════════════════════ */

export default function PujaBookingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading puja events…</div>}>
      <PujaBookingsPageInner />
    </Suspense>
  );
}

function PujaBookingsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const filterPujaId = searchParams.get('puja_id') ?? '';
  const filterPujariId = searchParams.get('pujari_id') ?? '';

  const [tab, setTab] = useState('List');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedPage, setExpandedPage] = useState(1);
  const EXPANDED_PAGE_SIZE = 5;
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };
  const [selectedBooking, setSelectedBooking] = useState<PujaBooking | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<(PujaEvent & { stage: PujaEventStage; bookingsData?: any[] }) | null>(null);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showSankalpModal, setShowSankalpModal] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editEventPujariId, setEditEventPujariId] = useState('');
  const [editEventStartTime, setEditEventStartTime] = useState('');
  const [editEventMaxBookings, setEditEventMaxBookings] = useState<number>(0);
  const [editEventHasPrasad, setEditEventHasPrasad] = useState(true);

  // Input state for modals
  const [liveLink, setLiveLink] = useState('');
  const [shortVideoUrl, setShortVideoUrl] = useState('');
  const [sankalpVideoUrl, setSankalpVideoUrl] = useState('');
  // bookingId → "MM:SS" timestamp string
  const [sankalpTimestamps, setSankalpTimestamps] = useState<Record<string, { minute: string; second: string }>>({});

  // Create-event modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [availablePujas, setAvailablePujas] = useState<Array<{ id: string; name: string; temple_name?: string }>>([]);
  const [availablePujaris, setAvailablePujaris] = useState<Array<{ id: string; name: string }>>([]);
  const [newEventPujaId, setNewEventPujaId] = useState('');
  const [newEventPujariId, setNewEventPujariId] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventHasPrasad, setNewEventHasPrasad] = useState(true);
  const [creating, setCreating] = useState(false);

  // Data state
  const [pujaEvents, setPujaEvents] = useState<(PujaEvent & { stage: PujaEventStage })[]>([]);
  const [pujaBookings, setPujaBookings] = useState<PujaBooking[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch puja events ────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { limit: 100 };
      if (filterPujaId) params.puja_id = filterPujaId;
      if (filterPujariId) params.pujari_id = filterPujariId;
      const res = await pujaEventService.list(params);
      const raw = res.data?.data ?? res.data ?? [];
      setPujaEvents(raw.map(mapEvent));
      // Calendar can only place events that have a real start_time.
      setTimelineEvents(raw.filter((e: any) => e.start_time).map(toTimelineEvent));
    } catch (err: any) {
      setError(err.message || 'Failed to load puja events');
    } finally {
      setLoading(false);
    }
  }, [filterPujaId, filterPujariId]);

  // ── Fetch bookings for expanded event ────────────────────
  const fetchBookings = useCallback(async (eventId: string) => {
    try {
      const res = await pujaBookingService.list({ puja_event_id: eventId });
      const raw = res.data?.data ?? res.data ?? [];
      setPujaBookings(raw.map(mapBooking));
    } catch {
      setPujaBookings([]);
    }
  }, []);

  // ── Fetch full event detail (for modal) ──────────────────
  const fetchEventDetail = useCallback(async (eventId: string) => {
    try {
      const res = await pujaEventService.getById(eventId);
      const data = res.data?.data ?? res.data;
      const mapped = mapEvent(data);
      (mapped as any).bookingsData = (data.bookings ?? []).map((b: any) => ({
        ...b,
        devotees: b.devotees ?? [],
      }));
      (mapped as any).pujari_id = data.pujari_id ?? '';
      (mapped as any).max_bookings = data.max_bookings ?? 100;
      setSelectedEvent(mapped as any);
      // Seed the edit-event form state
      setEditEventPujariId(data.pujari_id ?? '');
      setEditEventStartTime(data.start_time ? new Date(data.start_time).toISOString().slice(0, 16) : '');
      setEditEventMaxBookings(data.max_bookings ?? 100);
      setEditEventHasPrasad(data.has_prasad ?? true);
    } catch {
      // Fallback to the event from the list
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Load dropdowns for Create Event modal
  useEffect(() => {
    (async () => {
      try {
        const [pRes, pjRes] = await Promise.all([
          pujaService.list({ limit: 200 }),
          pujariService.list({ limit: 200 }),
        ]);
        setAvailablePujas(pRes.data?.data ?? []);
        setAvailablePujaris(pjRes.data?.data ?? []);
      } catch {
        /* no-op */
      }
    })();
  }, []);

  const openCreateModal = () => {
    setNewEventPujaId('');
    setNewEventPujariId('');
    setNewEventDate('');
    setNewEventTime('');
    setNewEventHasPrasad(true);
    setShowCreateModal(true);
  };

  const handleCreateEvent = async () => {
    if (!newEventPujaId) {
      alert('Please select a puja');
      return;
    }
    // Both date and time are required together; either both filled or both
    // left blank (null start_time persisted — reports render it as empty).
    if ((newEventDate && !newEventTime) || (!newEventDate && newEventTime)) {
      alert('Please provide both date and time, or leave both empty');
      return;
    }
    try {
      setCreating(true);
      const start_time = newEventDate && newEventTime
        ? new Date(`${newEventDate}T${newEventTime}`).toISOString()
        : null;
      await pujaEventService.create({
        puja_id: newEventPujaId,
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
      setPujaBookings([]);
    }
  }, [expandedId, fetchBookings]);

  // ── Stage advance handler ────────────────────────────────
  const handleAdvanceStage = async (eventId: string, data?: Record<string, any>) => {
    try {
      await pujaEventService.advanceStage(eventId, { stage: 'advance', ...data });
      await fetchEvents();
      // Refresh event detail if open
      if (selectedEvent?.id === eventId) await fetchEventDetail(eventId);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to advance stage');
    }
  };

  // Clears the chosen video URL on the event row. Used by the Remove button
  // inside the event-detail modal. We don't delete the underlying GCS file.
  const handleRemoveVideo = async (eventId: string, field: 'short_video_url' | 'sankalp_video_url') => {
    const fieldLabel = field === 'short_video_url' ? 'short video' : 'sankalp video';
    if (!confirm(`Remove the ${fieldLabel} from this event?`)) return;
    try {
      await pujaEventService.update(eventId, { [field]: null });
      if (selectedEvent?.id === eventId) await fetchEventDetail(eventId);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to remove video');
    }
  };

  const handleViewBooking = async (bookingId: string) => {
    try {
      const res = await pujaBookingService.getById(bookingId);
      const data = res.data?.data ?? res.data;
      setSelectedBooking(mapBooking(data));
    } catch {
      alert('Failed to load booking details');
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await pujaBookingService.cancel(bookingId);
      setSelectedBooking(null);
      if (expandedId) fetchBookings(expandedId);
      fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking');
    }
  };

  // ── Delete event handler (wired to real DELETE) ───────────
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    try {
      await pujaEventService.delete(eventId);
      await fetchEvents();
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message
        || (status === 409
          ? 'Event has active bookings; cancel them first. (If only historical/cancelled bookings exist, the FK still prevents deletion — historical records are preserved.)'
          : err?.message || 'Failed to delete event');
      alert(msg);
    }
  };

  // ── Cancel-all-bookings handler (with confirm-by-id) ─────
  const handleCancelAllBookings = async (eventId: string) => {
    const confirmId = prompt(`To cancel all bookings on this event and trigger refunds, type the event id (${eventId.slice(0, 8)}…) to confirm:`);
    if (!confirmId || !eventId.startsWith(confirmId.trim())) {
      alert('Confirmation did not match. Aborted.');
      return;
    }
    try {
      const res = await pujaEventService.cancelAllBookings(eventId, { reason: 'Admin bulk cancel', refund: true });
      const data = res.data?.data ?? res.data;
      alert(`Cancelled ${data?.cancelled_count ?? 0} bookings. Refund initiated for ${data?.refund_initiated_count ?? 0}.`);
      await fetchEvents();
      if (selectedEvent?.id === eventId) await fetchEventDetail(eventId);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to cancel bookings');
    }
  };

  const clearFilter = () => router.push('/dashboard/puja-bookings');

  // ── Column definitions ───────────────────────────────────
  const eventColumns = [
    { key: 'id', label: 'ID', render: (r: any) => <span className="text-[10px] font-mono">{r.id.slice(0, 8)}</span> },
    { key: 'pujaName', label: 'Puja Name' },
    { key: 'temple', label: 'Temple' },
    { key: 'bookings', label: 'Bookings', render: (r: any) => {
      const [cur, max] = (r.bookings as string).split('/').map(Number);
      const pct = max > 0 ? cur / max : 0;
      return <span className={pct >= 0.9 ? 'text-status-completed font-bold' : ''}>{r.bookings}</span>;
    }},
    { key: 'devoteeCount', label: 'Devotee' },
    { key: 'startTime', label: 'Start Time' },
    { key: 'status', label: 'Status', render: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'pujari', label: 'Pujari' },
    { key: 'action', label: 'Action', render: (r: any) => (
      <div className="flex items-center gap-1">
        <ViewButton onClick={() => fetchEventDetail(r.id)} />
        <ExpandButton expanded={expandedId === r.id} onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} />
        <DeleteButton onClick={() => handleDeleteEvent(r.id)} />
      </div>
    )},
  ];

  const bookingColumns = [
    { key: 'id', label: 'ID', render: (r: any) => <span className="text-[10px] font-mono">{r.id.slice(0, 8)}</span> },
    { key: 'bookedBy', label: 'Booked By', render: (r: PujaBooking & { devotee_id?: string }) => (
      r.devotee_id
        ? <button onClick={() => router.push(`/dashboard/devotees?id=${(r as any).devotee_id}`)} className="text-primary hover:underline">{r.bookedBy}</button>
        : <span>{r.bookedBy}</span>
    ) },
    { key: 'bookedByPhone', label: 'Phone', render: (r: PujaBooking) => (
      r.bookedByPhone ? <span className="font-mono text-[11px]">+91 {r.bookedByPhone}</span> : <span className="text-muted-foreground">—</span>
    ) },
    { key: 'devoteeCount', label: 'Devotee' },
    { key: 'bookingTime', label: 'Booking Time' },
    { key: 'cost', label: 'Cost', render: (r: PujaBooking) => <span className="text-primary">₹{r.cost}</span> },
    { key: 'status', label: 'Status', render: (r: PujaBooking) => <StatusBadge status={r.status} /> },
    { key: 'action', label: 'Action', render: (r: PujaBooking) => (
      <div className="flex items-center gap-1">
        <button onClick={() => handleViewBooking(r.id)} className="text-primary text-[10px] hover:underline">View</button>
        <DeleteButton onClick={() => handleCancelBooking(r.id)} title="Cancel this booking" />
      </div>
    )},
  ];

  // Paginated slice of bookings for the inline expanded panel.
  const expandedTotalPages = Math.max(1, Math.ceil(pujaBookings.length / EXPANDED_PAGE_SIZE));
  const expandedPageClamped = Math.min(expandedPage, expandedTotalPages);
  const expandedSlice = pujaBookings.slice(
    (expandedPageClamped - 1) * EXPANDED_PAGE_SIZE,
    expandedPageClamped * EXPANDED_PAGE_SIZE,
  );

  // Filter banner shown when scoped by puja_id or pujari_id query
  const filteredPuja = useMemo(
    () => availablePujas.find((p) => p.id === filterPujaId),
    [availablePujas, filterPujaId],
  );
  const filteredPujari = useMemo(
    () => availablePujaris.find((p) => p.id === filterPujariId),
    [availablePujaris, filterPujariId],
  );

  // ── Derived state for event detail modal ─────────────────
  const eventStage = (selectedEvent as any)?.stage as PujaEventStage | undefined;
  const eventStatus = (selectedEvent as any)?.status as string | undefined;
  const isEventCancelled = eventStatus === 'CANCELLED';
  const stageAction = eventStage ? STAGE_ACTIONS[eventStage] : undefined;
  const allDevotees = ((selectedEvent as any)?.bookingsData ?? []).flatMap((b: any) =>
    (b.devotees ?? []).map((d: any) => ({ name: d.name, gotra: d.gotra, relation: d.relation }))
  );
  const shipAddresses = ((selectedEvent as any)?.bookingsData ?? []).filter((b: any) => b.prasad_delivery_address).map((b: any) => ({
    name: b.devotee_name ?? 'Devotee',
    address: b.prasad_delivery_address,
  }));

  // ── Loading / Error states ───────────────────────────────
  if (loading && pujaEvents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-muted-foreground">Loading puja events...</div>
      </div>
    );
  }

  if (error && pujaEvents.length === 0) {
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
      />

      {(filterPujaId || filterPujariId) && (
        <div className="bg-primary/10 border border-primary/30 rounded-md px-4 py-2 mb-3 flex items-center justify-between">
          <div className="text-xs">
            {filterPujaId && (
              <>Showing events for <span className="font-semibold">{filteredPuja?.name ?? filterPujaId.slice(0, 8)}</span></>
            )}
            {filterPujariId && (
              <>Showing events assigned to <span className="font-semibold">{filteredPujari?.name ?? filterPujariId.slice(0, 8)}</span></>
            )}
            <span className="ml-2 text-muted-foreground">· Total: {pujaEvents.length}</span>
          </div>
          <button onClick={clearFilter} className="text-xs text-primary hover:underline">Clear filter</button>
        </div>
      )}

      {!filterPujaId && !filterPujariId && pujaEvents.length > 0 && (
        <div className="text-xs text-muted-foreground mb-2">Total: {pujaEvents.length} events</div>
      )}

      {tab === 'List' ? (
        <div>
          {pujaEvents.length === 0 ? (
            <div className="border border-dashed border-border rounded-md p-8 text-center text-sm text-muted-foreground">
              No events match these filters.
              {(filterPujaId || filterPujariId) && (
                <> <button onClick={clearFilter} className="text-primary hover:underline">Clear filters</button></>
              )}
            </div>
          ) : (
            <DataTable
              columns={eventColumns}
              data={sortRows(pujaEvents, sortKey, sortDir)}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={handleSort}
              expandedKey={expandedId}
              renderExpanded={() => (
                <div className="px-4 py-3 border-l-2 border-primary/40 bg-background">
                  {pujaBookings.length === 0 ? (
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
          onEventClick={(evt) => {
            if (evt?.id) fetchEventDetail(evt.id);
          }}
        />
      )}

      {/* ── Individual Booking Detail Modal ──────────────── */}
      <Modal
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title={`Booking ${selectedBooking?.id?.slice(0, 8)} Details`}
        statusBadge={selectedBooking && <StatusBadge status={selectedBooking.status} />}
      >
        {selectedBooking && (
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-foreground">Puja : {selectedBooking.pujaName}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Temple: {selectedBooking.temple}</p>
                <p className="text-[11px] text-muted-foreground">Booked at: {selectedBooking.bookedAt}</p>
              </div>
              <span className="text-primary font-bold text-sm">₹{selectedBooking.cost}</span>
            </div>

            <div className="border border-border rounded-lg p-3">
              <div className="flex justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider">Devotee Details</span>
                <span className="text-[10px] text-muted-foreground">{selectedBooking.devoteeCount}</span>
              </div>
              {(selectedBooking.devotees ?? []).map((d, i) => (
                <div key={i} className="flex gap-6 text-[11px] mb-1">
                  <span className="text-foreground">{d.name} {d.relation && <span className="text-primary">({d.relation})</span>}</span>
                  <span className="text-muted-foreground">Gotra: {d.gotra}</span>
                </div>
              ))}
            </div>

            {selectedBooking.sankalp && (
              <div className="border border-border rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1">Sankalp</p>
                <p className="text-[11px] text-muted-foreground">{selectedBooking.sankalp}</p>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              Prasad Delivery Address: {selectedBooking.prasadDeliveryAddress}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Pujari: {selectedBooking.pujari}
            </p>

            {selectedBooking.sankalpVideoTimeStamp && (
              <p className="text-[11px] text-muted-foreground">
                Sankalp Video Time Stamp: {selectedBooking.sankalpVideoTimeStamp} <span className="text-primary cursor-pointer">✏️</span>
              </p>
            )}

            <div className="flex gap-3 mt-4">
              {selectedBooking.status === 'NOT_STARTED' && (
                <OutlineButton className="flex-1" onClick={() => handleCancelBooking(selectedBooking.id)}>Cancel Booking</OutlineButton>
              )}
              {selectedBooking.status === 'INPROGRESS' && (
                <PrimaryButton className="flex-1" onClick={() => setSelectedBooking(null)}>Close</PrimaryButton>
              )}
              {selectedBooking.status === 'COMPLETED' && (
                <PrimaryButton className="flex-1">Ship Prashad</PrimaryButton>
              )}
              {selectedBooking.status === 'CANCELLED' && (
                <OutlineButton className="flex-1" onClick={() => setSelectedBooking(null)}>Close</OutlineButton>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Puja Event Detail Modal (from timeline click) ── */}
      <Modal
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={`Puja Evn ${selectedEvent?.id?.slice(0, 8)} Details`}
        statusBadge={selectedEvent && <StatusBadge status={selectedEvent.status} />}
        wide
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-foreground">Puja : {selectedEvent.pujaName}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Temple: {selectedEvent.temple}</p>
              <p className="text-[11px] text-muted-foreground">Start Time: {selectedEvent.startTime}</p>
            </div>

            {/* Devotee Details from real data */}
            <div className="border border-border rounded-lg p-3">
              <div className="flex justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider">Devotee Details</span>
                <span className="text-[10px] text-muted-foreground">{allDevotees.length}</span>
              </div>
              {allDevotees.length > 0 ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {allDevotees.map((d: any, i: number) => (
                    <div key={i} className="text-[11px]">
                      <span className="text-foreground">{d.name}</span>
                      <div className="text-muted-foreground">Gotra: {d.gotra}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">No devotees yet</p>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground">Pujari: {selectedEvent.pujari} <span className="text-primary cursor-pointer">✏️</span></p>

            {/* Show live link if added */}
            {eventStage && eventStage !== 'YET_TO_START' && (
              <p className="text-[11px] text-muted-foreground">
                Live Link: <span className="text-status-completed">Added</span> <span className="text-primary cursor-pointer">✏️</span>
              </p>
            )}

            {/* Videos: real player with replace + remove. Visible from
                SHORT_VIDEO_ADDED onwards (matches the stage gate above). */}
            {eventStage && ['SHORT_VIDEO_ADDED', 'SANKALP_VIDEO_ADDED', 'TO_BE_SHIPPED', 'SHIPPED'].includes(eventStage) && (
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
                    <div className="bg-accent rounded-lg h-20 flex items-center justify-center text-muted-foreground text-xs">Not uploaded</div>
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
                    <div className="bg-accent rounded-lg h-20 flex items-center justify-center text-muted-foreground text-xs">Yet to be uploaded</div>
                  )}
                </div>
              </div>
            )}

            {/* Rating for shipped events */}
            {eventStage === 'SHIPPED' && (
              <p className="text-[11px] text-muted-foreground">Rating: ⭐ 5 Star (99)</p>
            )}

            {/* Stage-based action buttons (hidden when event is cancelled) */}
            {isEventCancelled ? (
              <div className="mt-4 p-3 rounded-md border border-red-200 bg-red-50 text-xs text-red-700">
                This event is <strong>CANCELLED</strong>. Stage progression is locked.
                Refunds for affected bookings have been queued (payment_status = PENDING_REFUND).
              </div>
            ) : (
              <div className="flex gap-3 mt-4">
                {eventStage === 'YET_TO_START' && (
                  <>
                    <OutlineButton className="flex-1" onClick={() => setSelectedEvent(null)}>Close</OutlineButton>
                    <PrimaryButton className="flex-1" onClick={() => { setShowLiveModal(true); }}>Add Live Feed Link</PrimaryButton>
                  </>
                )}
                {eventStage === 'LIVE_ADDED' && (
                  <PrimaryButton className="flex-1" onClick={() => { setShowVideoModal(true); }}>Add Short Video</PrimaryButton>
                )}
                {eventStage === 'SHORT_VIDEO_ADDED' && (
                  <PrimaryButton className="flex-1" onClick={() => { setShowSankalpModal(true); }}>Add Sankalp Video</PrimaryButton>
                )}
                {eventStage === 'SANKALP_VIDEO_ADDED' && (
                  <PrimaryButton className="flex-1" onClick={() => handleAdvanceStage(selectedEvent.id)}>Mark Ready to Ship</PrimaryButton>
                )}
                {eventStage === 'TO_BE_SHIPPED' && (
                  <PrimaryButton className="flex-1" onClick={() => { setShowShipModal(true); }}>Ship Prashad</PrimaryButton>
                )}
                {eventStage === 'SHIPPED' && (
                  <PrimaryButton className="flex-1">Track Bulk Packages</PrimaryButton>
                )}
              </div>
            )}

            {/* Admin meta tools — only Edit Meta + Cancel-All remain when not cancelled */}
            {!isEventCancelled && (
              <div className="flex gap-3 mt-2 pt-3 border-t border-border">
                <OutlineButton className="flex-1" onClick={() => setShowEditEventModal(true)}>Edit Event Meta</OutlineButton>
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

      {/* ── Edit Event Meta Modal ────────────────────────── */}
      <Modal
        open={showEditEventModal}
        onClose={() => setShowEditEventModal(false)}
        title="Edit Event Metadata"
      >
        {selectedEvent && (
          <div className="space-y-3">
            <p className="text-[10px] text-muted-foreground">
              Editing event {selectedEvent.id.slice(0, 8)}…
            </p>
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
                  // Admin can either set a new start time or clear it (null).
                  data.start_time = editEventStartTime
                    ? new Date(editEventStartTime).toISOString()
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
                  await pujaEventService.update(selectedEvent.id, data);
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
            onChange={(e) => setLiveLink(e.target.value)}
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

      {/* ── Add Short Video Modal ───────────────────────── */}
      <Modal open={showVideoModal} onClose={() => setShowVideoModal(false)} title="Add Puja Short Video" onBack={() => setShowVideoModal(false)}>
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
            if (selectedEvent) await handleAdvanceStage(selectedEvent.id, { short_video_url: shortVideoUrl });
            setShortVideoUrl('');
            setShowVideoModal(false);
          }}>Submit</PrimaryButton>
        </div>
      </Modal>

      {/* ── Add Sankalp Video Modal ─────────────────────── */}
      <Modal open={showSankalpModal} onClose={() => setShowSankalpModal(false)} title="Add Sankalp Video" onBack={() => setShowSankalpModal(false)} wide>
        <div className="flex flex-col gap-3 max-h-[80vh]">
          {/* Sticky video uploader / player at top — admins scrub through and
              jot down per-devotee timestamps in the scrollable list below. */}
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
          {((selectedEvent as any)?.bookingsData ?? []).map((b: any) => (
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
              await handleAdvanceStage(selectedEvent.id, { sankalp_video_url: sankalpVideoUrl });
              // Save per-booking timestamps
              await Promise.allSettled(
                Object.entries(sankalpTimestamps).map(([bookingId, ts]) => {
                  const m = parseInt(ts.minute || '0');
                  const s = parseInt(ts.second || '0');
                  if (isNaN(m) && isNaN(s)) return Promise.resolve();
                  const value = `${String(m || 0).padStart(2, '0')}:${String(s || 0).padStart(2, '0')}`;
                  return pujaBookingService.setSankalpTimestamp(bookingId, value);
                })
              );
            }
            setSankalpVideoUrl('');
            setSankalpTimestamps({});
            setShowSankalpModal(false);
          }}>Submit</PrimaryButton>
        </div>
      </Modal>

      {/* ── Create Puja Event Modal ─────────────────────── */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Puja Event">
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider">Puja</label>
            <select
              value={newEventPujaId}
              onChange={(e) => setNewEventPujaId(e.target.value)}
              className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground mt-1"
            >
              <option value="">Select a puja</option>
              {availablePujas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.temple_name ? ` — ${p.temple_name}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider">Pujari (optional)</label>
            <select
              value={newEventPujariId}
              onChange={(e) => setNewEventPujariId(e.target.value)}
              className="w-full h-9 bg-accent border border-border rounded-md px-3 text-xs text-foreground mt-1"
            >
              <option value="">Auto-assign</option>
              {availablePujaris.map((pj) => (
                <option key={pj.id} value={pj.id}>{pj.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider">Date</label>
              <input
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider">Time</label>
              <input
                type="time"
                value={newEventTime}
                onChange={(e) => setNewEventTime(e.target.value)}
                className="w-full h-9 px-3 bg-accent border border-border rounded-md text-xs text-foreground mt-1"
              />
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
            <PrimaryButton className="flex-1" onClick={handleCreateEvent} disabled={creating}>
              {creating ? 'Creating…' : 'Create Event'}
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      {/* ── Ship Package Modal ──────────────────────────── */}
      <Modal open={showShipModal} onClose={() => setShowShipModal(false)} title="Ship Package" onBack={() => setShowShipModal(false)}>
        <div className="space-y-3">
          {shipAddresses.length > 0 ? shipAddresses.map((addr: any, i: number) => (
            <div key={i} className="border border-border rounded-lg p-3">
              <p className="text-xs font-bold text-foreground">{addr.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{addr.address}</p>
            </div>
          )) : (
            <p className="text-[11px] text-muted-foreground">No delivery addresses found</p>
          )}
          <PrimaryButton className="w-full" onClick={async () => {
            if (selectedEvent) await handleAdvanceStage(selectedEvent.id);
            setShowShipModal(false);
          }}>
            Create Bulk Pickup in Ship Rocket
          </PrimaryButton>
        </div>
      </Modal>
    </div>
  );
}
