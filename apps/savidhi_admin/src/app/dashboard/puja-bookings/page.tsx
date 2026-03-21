'use client';

import { useState, useEffect, useCallback } from 'react';
import { pujaEventService, pujaBookingService } from '@/lib/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { TimelineView } from '@/components/shared/TimelineView';
import { Modal } from '@/components/shared/Modal';
import { ExpandButton, DeleteButton, PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';
import type { PujaEvent, PujaBooking, TimelineEvent } from '@/types';

export default function PujaBookingsPage() {
  const [tab, setTab] = useState('List');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<PujaBooking | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<PujaEvent | null>(null);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showSankalpModal, setShowSankalpModal] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);

  // Data state
  const [pujaEvents, setPujaEvents] = useState<PujaEvent[]>([]);
  const [pujaBookings, setPujaBookings] = useState<PujaBooking[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch puja events
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await pujaEventService.list({ search: search || undefined });
      setPujaEvents(res.data?.data ?? res.data ?? []);
    } catch (err: any) {
      setError(err.message || 'Failed to load puja events');
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Fetch bookings for expanded event
  const fetchBookings = useCallback(async (eventId: string) => {
    try {
      const res = await pujaBookingService.list({ eventId });
      setPujaBookings(res.data?.data ?? res.data ?? []);
    } catch {
      setPujaBookings([]);
    }
  }, []);

  // Fetch timeline
  const fetchTimeline = useCallback(async () => {
    try {
      const res = await pujaEventService.list({ view: 'timeline' });
      const data = res.data?.data ?? res.data ?? [];
      // Map events to timeline format if needed
      setTimelineEvents(data);
    } catch {
      setTimelineEvents([]);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (tab === 'Timeline') {
      fetchTimeline();
    }
  }, [tab, fetchTimeline]);

  useEffect(() => {
    if (expandedId) {
      fetchBookings(expandedId);
    } else {
      setPujaBookings([]);
    }
  }, [expandedId, fetchBookings]);

  // Stage advance handler
  const handleAdvanceStage = async (eventId: string, stage: string, data?: Record<string, any>) => {
    try {
      await pujaEventService.advanceStage(eventId, { stage, ...data });
      fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to advance stage');
    }
  };

  const eventColumns = [
    { key: 'id', label: 'ID' },
    { key: 'pujaName', label: 'Puja Name' },
    { key: 'temple', label: 'Temple' },
    { key: 'bookings', label: 'Bookings', render: (r: PujaEvent) => (
      <span className={r.bookings.startsWith('9') ? 'text-status-completed' : r.bookings.includes('/') ? 'text-status-not-started' : ''}>
        {r.bookings}
      </span>
    )},
    { key: 'devoteeCount', label: 'Devotee' },
    { key: 'startTime', label: 'Start Time' },
    { key: 'status', label: 'Status', render: (r: PujaEvent) => <StatusBadge status={r.status} /> },
    { key: 'pujari', label: 'Pujari' },
    { key: 'action', label: 'Action', render: (r: PujaEvent) => (
      <div className="flex items-center gap-1">
        <ExpandButton expanded={expandedId === r.id} onClick={() => {
          setExpandedId(expandedId === r.id ? null : r.id);
          setSelectedEvent(r);
        }} />
        <DeleteButton />
      </div>
    )},
  ];

  const bookingColumns = [
    { key: 'id', label: 'ID' },
    { key: 'bookedBy', label: 'Booked By' },
    { key: 'devoteeCount', label: 'Devotee' },
    { key: 'bookingTime', label: 'Booking Time' },
    { key: 'cost', label: 'Cost', render: (r: PujaBooking) => <span className="text-primary">₹{r.cost}</span> },
    { key: 'status', label: 'Status', render: (r: PujaBooking) => <StatusBadge status={r.status} /> },
    { key: 'action', label: 'Action', render: (r: PujaBooking) => (
      <div className="flex items-center gap-1">
        <button onClick={() => handleViewBooking(r.id)} className="text-primary text-[10px] hover:underline">View</button>
        <DeleteButton />
      </div>
    )},
  ];

  const handleViewBooking = async (bookingId: string) => {
    try {
      const res = await pujaBookingService.getById(bookingId);
      setSelectedBooking(res.data?.data ?? res.data);
    } catch {
      alert('Failed to load booking details');
    }
  };

  // Event detail modal (timeline view click)
  const eventDetailStatus = selectedEvent?.status || 'NOT_STARTED';
  const isNotStarted = eventDetailStatus === 'NOT_STARTED';
  const isInProgress = eventDetailStatus === 'INPROGRESS';
  const isCompleted = eventDetailStatus === 'COMPLETED';

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
        showDateNav={tab === 'Timeline'}
        onAdd={() => {}}
      />

      {tab === 'List' ? (
        <div>
          <DataTable columns={eventColumns} data={pujaEvents} />

          {/* Expanded booking rows */}
          {expandedId && (
            <div className="mt-2 ml-4 border-l-2 border-primary/30 pl-4">
              <DataTable columns={bookingColumns} data={pujaBookings} />
              <div className="flex justify-end mt-2">
                <span className="text-[10px] text-muted-foreground">&lt; Page 1/5 &gt;</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <TimelineView
          events={timelineEvents}
          onEventClick={(evt) => {
            // Find the corresponding puja event by ID
            const found = pujaEvents.find(e => e.id === evt?.id);
            if (found) setSelectedEvent(found);
            else if (pujaEvents.length > 0) setSelectedEvent(pujaEvents[0]);
          }}
        />
      )}

      {/* Individual Booking Detail Modal */}
      <Modal
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title={`Booking <${selectedBooking?.id}> Details`}
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
              {selectedBooking.devotees.map((d, i) => (
                <div key={i} className="flex gap-6 text-[11px] mb-1">
                  <span className="text-foreground">{d.name} {d.relation && <span className="text-primary">({d.relation})</span>}</span>
                  <span className="text-muted-foreground">Gotra: {d.gotra}</span>
                </div>
              ))}
            </div>

            <div className="border border-border rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1">Sankalp</p>
              <p className="text-[11px] text-muted-foreground">{selectedBooking.sankalp}</p>
            </div>

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
                <OutlineButton className="flex-1">Cancel Booking</OutlineButton>
              )}
              {selectedBooking.status === 'INPROGRESS' && (
                <PrimaryButton className="flex-1" onClick={() => setSelectedBooking(null)}>Close</PrimaryButton>
              )}
              {selectedBooking.status === 'COMPLETED' && (
                <PrimaryButton className="flex-1">Ship Prashad</PrimaryButton>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Puja Event Detail Modal (from timeline) */}
      <Modal
        open={!!selectedEvent && tab === 'Timeline'}
        onClose={() => setSelectedEvent(null)}
        title={`<Puja Evn ${selectedEvent?.id}> Details`}
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

            <div className="border border-border rounded-lg p-3">
              <div className="flex justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider">Devotee Details</span>
                <span className="text-[10px] text-muted-foreground">{selectedEvent.devoteeCount}</span>
              </div>
              {[1,2,3,4].map((_, i) => (
                <div key={i} className="grid grid-cols-2 gap-4 text-[11px] mb-1.5">
                  <div>
                    <span className="text-foreground">Rama Prasad</span>
                    <div className="text-muted-foreground">Gotra: Kashyap</div>
                  </div>
                  <div>
                    <span className="text-foreground">Rama Prasad</span>
                    <div className="text-muted-foreground">Gotra: Kashyap</div>
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground text-center mt-2">&lt; Page 1/5 &gt;</p>
            </div>

            <p className="text-[11px] text-muted-foreground">Pujari: {selectedEvent.pujari} <span className="text-primary cursor-pointer">✏️</span></p>

            {(isInProgress || isCompleted) && (
              <p className="text-[11px] text-muted-foreground">
                Live Link: <span className="text-status-completed">Added</span> <span className="text-primary cursor-pointer">✏️</span>
              </p>
            )}

            {isCompleted && (
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-border rounded-lg p-3">
                  <p className="text-[10px] font-bold mb-2">Short Video <span className="text-primary cursor-pointer">✏️</span></p>
                  <div className="bg-accent rounded-lg h-24 flex items-center justify-center text-muted-foreground text-xs">▶ Video</div>
                </div>
                <div className="border border-border rounded-lg p-3">
                  <p className="text-[10px] font-bold mb-2">Sankalp Video <span className="text-primary cursor-pointer">✏️</span></p>
                  <div className="bg-accent rounded-lg h-24 flex items-center justify-center text-muted-foreground text-xs">▶ Video</div>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              {isNotStarted && (
                <>
                  <OutlineButton className="flex-1" onClick={() => setSelectedEvent(null)}>Cancel Booking</OutlineButton>
                  <PrimaryButton className="flex-1" onClick={() => { setShowLiveModal(true); setSelectedEvent(null); }}>Add Live Feed Link</PrimaryButton>
                </>
              )}
              {isInProgress && (
                <PrimaryButton className="flex-1" onClick={() => { setShowVideoModal(true); setSelectedEvent(null); }}>Add Short Video</PrimaryButton>
              )}
              {isCompleted && (
                <PrimaryButton className="flex-1" onClick={() => { setShowShipModal(true); setSelectedEvent(null); }}>Ship Prashad</PrimaryButton>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add Live Feed Link Modal */}
      <Modal open={showLiveModal} onClose={() => setShowLiveModal(false)} title="Add Live Feed Link" onBack={() => setShowLiveModal(false)}>
        <div className="space-y-4">
          <input
            placeholder="Paste You Tube Private Link"
            className="w-full h-10 px-3 bg-accent border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <PrimaryButton className="w-full" onClick={() => setShowLiveModal(false)}>Submit</PrimaryButton>
        </div>
      </Modal>

      {/* Add Short Video Modal */}
      <Modal open={showVideoModal} onClose={() => setShowVideoModal(false)} title="Add Puja Short Video" onBack={() => setShowVideoModal(false)}>
        <div className="space-y-4">
          <input
            placeholder="Paste You Tube Private Link"
            className="w-full h-10 px-3 bg-accent border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="bg-accent rounded-lg h-40 flex items-center justify-center text-muted-foreground text-xs">
            ▶ Video Preview
          </div>
          <PrimaryButton className="w-full" onClick={() => setShowVideoModal(false)}>Submit</PrimaryButton>
        </div>
      </Modal>

      {/* Add Sankalp Video Modal */}
      <Modal open={showSankalpModal} onClose={() => setShowSankalpModal(false)} title="Add Sankalp Video" onBack={() => setShowSankalpModal(false)}>
        <div className="space-y-4">
          <input
            placeholder="Paste You Tube Private Link"
            className="w-full h-10 px-3 bg-accent border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="bg-accent rounded-lg h-40 flex items-center justify-center text-muted-foreground text-xs">
            ▶ Video Preview
          </div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider">Time Stamp of Devotee Names</h4>
          {['Ram Prasad', 'Ram Prasad', 'Shyam Prasad', 'Shyam Prasad'].map((name, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-foreground w-28">{name}</span>
              <input placeholder="Minute" className="flex-1 h-8 px-2 bg-accent border border-border rounded-md text-xs text-foreground" />
              <input placeholder="Second" className="flex-1 h-8 px-2 bg-accent border border-border rounded-md text-xs text-foreground" />
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground text-center">&lt; Page 1/5 &gt;</p>
          <PrimaryButton className="w-full" onClick={() => setShowSankalpModal(false)}>Submit</PrimaryButton>
        </div>
      </Modal>

      {/* Ship Package Modal */}
      <Modal open={showShipModal} onClose={() => setShowShipModal(false)} title="Ship Package" onBack={() => setShowShipModal(false)}>
        <div className="space-y-3">
          {[
            { name: 'Shyam Prasad', address: 'mysore, 244-aaa, jungle road, Karnataka 566578' },
            { name: 'Shyam Prasad', address: 'mysore, 244-aaa, jungle road, Karnataka 566578' },
            { name: 'Vraj Rao Kumar', address: 'siliguri, 655-gg, himasu road, west bengal 77 55' },
          ].map((addr, i) => (
            <div key={i} className="border border-border rounded-lg p-3">
              <p className="text-xs font-bold text-foreground">{addr.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{addr.address}</p>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground text-center">&lt; Page 1/5 &gt;</p>
          <PrimaryButton className="w-full" onClick={() => setShowShipModal(false)}>
            Create Bulk Pickup in Ship Rocket
          </PrimaryButton>
        </div>
      </Modal>
    </div>
  );
}
