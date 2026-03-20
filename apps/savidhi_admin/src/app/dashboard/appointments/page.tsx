'use client';

import { useState } from 'react';
import { MOCK_APPOINTMENTS, MOCK_APPOINTMENT_TIMELINE } from '@/data';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { TimelineView } from '@/components/shared/TimelineView';
import { Modal } from '@/components/shared/Modal';
import { ViewButton, DeleteButton, PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';
import type { Appointment } from '@/types';

export default function AppointmentsPage() {
  const [tab, setTab] = useState('List');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [showSetupMeet, setShowSetupMeet] = useState(false);

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'astrologerName', label: 'Astrologer Name' },
    { key: 'dateTime', label: 'Date & Time' },
    { key: 'cost', label: 'Cost', render: (r: Appointment) => <span className="text-primary">₹{r.cost}</span> },
    { key: 'status', label: 'Status', render: (r: Appointment) => <StatusBadge status={r.status} /> },
    { key: 'action', label: 'Action', render: (r: Appointment) => (
      <div className="flex items-center gap-1">
        <ViewButton onClick={() => setSelected(r)} />
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
        <DataTable columns={columns} data={MOCK_APPOINTMENTS} />
      ) : (
        <TimelineView events={MOCK_APPOINTMENT_TIMELINE} onEventClick={() => setSelected(MOCK_APPOINTMENTS[0])} />
      )}

      {/* Booking Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Booking <${selected?.id}> Details`}
        statusBadge={selected && <StatusBadge status={selected.status} />}
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex justify-between">
              <p className="text-xs font-bold">Astro {selected.astrologerName}</p>
              <span className="text-primary font-bold text-sm">₹{selected.cost}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Meet Time: {selected.dateTime}</p>
            <p className="text-[11px] text-muted-foreground">Booked at: {selected.dateTime.split(' - ')[0]}</p>

            <div className="border border-border rounded-lg p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider">Devotee Details</span>
              <div className="text-[11px] mt-1">
                <span className="text-foreground">{selected.devotee.name}</span>
                {selected.devotee.relation && <span className="text-primary ml-1">({selected.devotee.relation})</span>}
                <div className="text-muted-foreground">Gotra: {selected.devotee.gotra}</div>
              </div>
            </div>

            {selected.meetLink && (
              <div className="border border-border rounded-lg p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider">Meet Link</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-foreground">{selected.meetLink}</span>
                  <span className="text-primary cursor-pointer text-xs">📋 ✏️</span>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <OutlineButton className="flex-1">Cancel Booking</OutlineButton>
              {selected.status === 'LINK_YET_TO_BE_GENERATED' && (
                <PrimaryButton className="flex-1" onClick={() => { setShowSetupMeet(true); setSelected(null); }}>Setup Meet</PrimaryButton>
              )}
              {selected.status === 'INPROGRESS' && (
                <PrimaryButton className="flex-1" onClick={() => setSelected(null)}>Mark Complete</PrimaryButton>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Setup Meet Modal */}
      <Modal open={showSetupMeet} onClose={() => setShowSetupMeet(false)} title="Setup Meet" onBack={() => setShowSetupMeet(false)}>
        <div className="space-y-4">
          <input placeholder="Paste Meeting Link" className="w-full h-10 px-3 bg-accent border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          <p className="text-[10px] text-muted-foreground">Note: Devotee can only see the link prior 30 min of appointment start time</p>
          <PrimaryButton className="w-full" onClick={() => setShowSetupMeet(false)}>Submit</PrimaryButton>
        </div>
      </Modal>
    </div>
  );
}
