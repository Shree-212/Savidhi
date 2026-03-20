'use client';

import { useState } from 'react';
import { MOCK_CHADHAVA_EVENTS, MOCK_CHADHAVA_BOOKINGS, MOCK_CHADHAVA_TIMELINE } from '@/data';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { TimelineView } from '@/components/shared/TimelineView';
import { Modal } from '@/components/shared/Modal';
import { ExpandButton, DeleteButton, PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';
import type { ChadhavaEvent, ChadhavaBooking } from '@/types';

export default function ChadhavaBookingsPage() {
  const [tab, setTab] = useState('List');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<ChadhavaBooking | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ChadhavaEvent | null>(null);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [showSankalpModal, setShowSankalpModal] = useState(false);

  const eventColumns = [
    { key: 'id', label: 'ID' },
    { key: 'chadhavaName', label: 'Chadhava Name' },
    { key: 'temple', label: 'Temple' },
    { key: 'bookings', label: 'Bookings', render: (r: ChadhavaEvent) => (
      <span className={r.bookings.startsWith('9') ? 'text-status-completed' : 'text-status-not-started'}>{r.bookings}</span>
    )},
    { key: 'startTime', label: 'Start Time' },
    { key: 'status', label: 'Status', render: (r: ChadhavaEvent) => <StatusBadge status={r.status} /> },
    { key: 'pujari', label: 'Pujari' },
    { key: 'action', label: 'Action', render: (r: ChadhavaEvent) => (
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
    { key: 'bookingTime', label: 'Booking Time' },
    { key: 'offerings', label: 'Offerings' },
    { key: 'cost', label: 'Cost', render: (r: ChadhavaBooking) => <span className="text-primary">₹{r.cost}</span> },
    { key: 'status', label: 'Status', render: (r: ChadhavaBooking) => <StatusBadge status={r.status} /> },
    { key: 'action', label: 'Action', render: () => (
      <div className="flex items-center gap-1">
        <button onClick={() => setSelectedBooking(MOCK_CHADHAVA_BOOKINGS[0])} className="text-primary text-[10px] hover:underline">View</button>
        <DeleteButton />
      </div>
    )},
  ];

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
          <DataTable columns={eventColumns} data={MOCK_CHADHAVA_EVENTS} />
          {expandedId && (
            <div className="mt-2 ml-4 border-l-2 border-primary/30 pl-4">
              <DataTable columns={bookingColumns} data={MOCK_CHADHAVA_BOOKINGS} />
            </div>
          )}
        </div>
      ) : (
        <TimelineView events={MOCK_CHADHAVA_TIMELINE} onEventClick={() => setSelectedEvent(MOCK_CHADHAVA_EVENTS[0])} />
      )}

      {/* Individual Chadhava Booking Detail */}
      <Modal
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title={`Booking <${selectedBooking?.id}> Details`}
        statusBadge={selectedBooking && <StatusBadge status={selectedBooking.status} />}
      >
        {selectedBooking && (
          <div className="space-y-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs font-bold">Chadhava : {selectedBooking.chadhavaName}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Temple: {selectedBooking.temple}</p>
                <p className="text-[11px] text-muted-foreground">Booked at: {selectedBooking.bookedAt}</p>
              </div>
              <span className="text-primary font-bold text-sm">₹{selectedBooking.cost}</span>
            </div>

            <div className="border border-border rounded-lg p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider">Devotee Details</span>
              {selectedBooking.devotees.map((d, i) => (
                <div key={i} className="text-[11px] mt-1">
                  <span className="text-foreground">{d.name}</span>
                  <span className="text-muted-foreground ml-2">Gotra: {d.gotra}</span>
                </div>
              ))}
            </div>

            <div className="border border-border rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1">Sankalp</p>
              <p className="text-[11px] text-muted-foreground">{selectedBooking.sankalp}</p>
            </div>

            <div className="border border-border rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1">Offerings</p>
              {selectedBooking.totalOfferings.map((o, i) => (
                <div key={i} className="flex justify-between text-[11px]">
                  <span className="text-foreground">{o.name}</span>
                  <span className="text-primary">{o.quantity}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-muted-foreground">Prasad Delivery Address: {selectedBooking.prasadDeliveryAddress}</p>
            <p className="text-[11px] text-muted-foreground">Pujari: {selectedBooking.pujari}</p>

            <div className="flex gap-3 mt-4">
              {selectedBooking.status === 'NOT_STARTED' && (
                <OutlineButton className="flex-1">Cancel Booking</OutlineButton>
              )}
              <PrimaryButton className="flex-1" onClick={() => setSelectedBooking(null)}>Close</PrimaryButton>
            </div>
          </div>
        )}
      </Modal>

      {/* Chadhava Event Detail (timeline) */}
      <Modal
        open={!!selectedEvent && tab === 'Timeline'}
        onClose={() => setSelectedEvent(null)}
        title={`<CDVA Evn ${selectedEvent?.id}> Details`}
        statusBadge={selectedEvent && <StatusBadge status={selectedEvent.status} />}
        wide
      >
        {selectedEvent && (
          <div className="space-y-4">
            <p className="text-xs font-bold">Chadhava : {selectedEvent.chadhavaName}</p>
            <p className="text-[11px] text-muted-foreground">Temple: {selectedEvent.temple}</p>
            <p className="text-[11px] text-muted-foreground">Start Time: {selectedEvent.startTime}</p>

            <div className="border border-border rounded-lg p-3">
              <div className="flex justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider">Devotee Details</span>
                <span className="text-[10px] text-muted-foreground">102</span>
              </div>
              {[1,2,3].map((_, i) => (
                <div key={i} className="text-[11px] mb-2">
                  <div><span className="text-foreground">Rama Prasad</span> <span className="text-muted-foreground">Gotra: Kashyap</span></div>
                  <div className="text-muted-foreground text-[10px]">Offerings: 1x Laddu, 2x 500gm ghee, 1x Lotus</div>
                </div>
              ))}
            </div>

            <div className="border border-border rounded-lg p-3">
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Offerings</span>
                <span className="text-[10px] text-muted-foreground">2</span>
              </div>
              {[{ name: 'Laddu', qty: 122 }, { name: '250ml Milk Abhisekh', qty: 32 }, { name: 'Lotus', qty: 12 }, { name: '500gm Ghee', qty: 98 }].map((o, i) => (
                <div key={i} className="flex justify-between text-[11px]">
                  <span className="text-foreground">{o.name}</span>
                  <span className="text-status-completed">{o.qty}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-muted-foreground">Pujari: Gopal Dash ✏️</p>

            <div className="flex gap-3">
              <OutlineButton className="flex-1" onClick={() => setSelectedEvent(null)}>Cancel Booking</OutlineButton>
              <PrimaryButton className="flex-1" onClick={() => { setShowLiveModal(true); setSelectedEvent(null); }}>Add Live Feed Link</PrimaryButton>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showLiveModal} onClose={() => setShowLiveModal(false)} title="Add Live Feed Link" onBack={() => setShowLiveModal(false)}>
        <div className="space-y-4">
          <input placeholder="Paste You Tube Private Link" className="w-full h-10 px-3 bg-accent border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          <PrimaryButton className="w-full" onClick={() => setShowLiveModal(false)}>Submit</PrimaryButton>
        </div>
      </Modal>

      <Modal open={showSankalpModal} onClose={() => setShowSankalpModal(false)} title="Add Sankalp Video" onBack={() => setShowSankalpModal(false)}>
        <div className="space-y-4">
          <input placeholder="Paste You Tube Private Link" className="w-full h-10 px-3 bg-accent border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          <div className="bg-accent rounded-lg h-40 flex items-center justify-center text-muted-foreground text-xs">▶ Video Preview</div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider">Time Stamp of Devotee Names</h4>
          {['Ram Prasad', 'Ram Prasad', 'Shyam Prasad', 'Shyam Prasad'].map((name, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-foreground w-28">{name}</span>
              <input placeholder="Minute" className="flex-1 h-8 px-2 bg-accent border border-border rounded-md text-xs text-foreground" />
              <input placeholder="Second" className="flex-1 h-8 px-2 bg-accent border border-border rounded-md text-xs text-foreground" />
            </div>
          ))}
          <PrimaryButton className="w-full" onClick={() => setShowSankalpModal(false)}>Submit</PrimaryButton>
        </div>
      </Modal>
    </div>
  );
}
