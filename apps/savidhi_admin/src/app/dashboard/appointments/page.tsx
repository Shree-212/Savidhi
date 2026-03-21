'use client';

import { useState, useEffect, useCallback } from 'react';
import { appointmentService } from '@/lib/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { TimelineView } from '@/components/shared/TimelineView';
import { Modal } from '@/components/shared/Modal';
import { ViewButton, DeleteButton, PrimaryButton, OutlineButton } from '@/components/shared/ActionButtons';
import type { Appointment, TimelineEvent } from '@/types';

export default function AppointmentsPage() {
  const [tab, setTab] = useState('List');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [showSetupMeet, setShowSetupMeet] = useState(false);

  // Data state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await appointmentService.list({ search: search || undefined });
      setAppointments(res.data?.data ?? res.data ?? []);
    } catch (err: any) {
      setError(err.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Fetch timeline
  const fetchTimeline = useCallback(async () => {
    try {
      const res = await appointmentService.list({ view: 'timeline' });
      setTimelineEvents(res.data?.data ?? res.data ?? []);
    } catch {
      setTimelineEvents([]);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    if (tab === 'Timeline') {
      fetchTimeline();
    }
  }, [tab, fetchTimeline]);

  const handleViewAppointment = async (appointment: Appointment) => {
    try {
      const res = await appointmentService.getById(appointment.id);
      setSelected(res.data?.data ?? res.data);
    } catch {
      // Fallback to the row data if detail fetch fails
      setSelected(appointment);
    }
  };

  const handleGenerateLink = async (appointmentId: string, meetLink: string) => {
    try {
      await appointmentService.generateMeetLink(appointmentId, { meet_link: meetLink });
      setShowSetupMeet(false);
      fetchAppointments();
    } catch (err: any) {
      alert(err.message || 'Failed to generate meet link');
    }
  };

  const handleMarkComplete = async (appointmentId: string) => {
    try {
      await appointmentService.complete(appointmentId);
      setSelected(null);
      fetchAppointments();
    } catch (err: any) {
      alert(err.message || 'Failed to mark as complete');
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'astrologerName', label: 'Astrologer Name' },
    { key: 'dateTime', label: 'Date & Time' },
    { key: 'cost', label: 'Cost', render: (r: Appointment) => <span className="text-primary">₹{r.cost}</span> },
    { key: 'status', label: 'Status', render: (r: Appointment) => <StatusBadge status={r.status} /> },
    { key: 'action', label: 'Action', render: (r: Appointment) => (
      <div className="flex items-center gap-1">
        <ViewButton onClick={() => handleViewAppointment(r)} />
        <DeleteButton />
      </div>
    )},
  ];

  if (loading && appointments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-muted-foreground">Loading appointments...</div>
      </div>
    );
  }

  if (error && appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-sm text-red-500">{error}</div>
        <OutlineButton onClick={fetchAppointments}>Retry</OutlineButton>
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
        <DataTable columns={columns} data={appointments} />
      ) : (
        <TimelineView
          events={timelineEvents}
          onEventClick={(evt) => {
            const found = appointments.find(a => a.id === evt?.id);
            if (found) setSelected(found);
            else if (appointments.length > 0) setSelected(appointments[0]);
          }}
        />
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
                <PrimaryButton className="flex-1" onClick={() => handleMarkComplete(selected.id)}>Mark Complete</PrimaryButton>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Setup Meet Modal */}
      <Modal open={showSetupMeet} onClose={() => setShowSetupMeet(false)} title="Setup Meet" onBack={() => setShowSetupMeet(false)}>
        <div className="space-y-4">
          <input
            id="meetLinkInput"
            placeholder="Paste Meeting Link"
            className="w-full h-10 px-3 bg-accent border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-[10px] text-muted-foreground">Note: Devotee can only see the link prior 30 min of appointment start time</p>
          <PrimaryButton className="w-full" onClick={() => {
            const input = document.getElementById('meetLinkInput') as HTMLInputElement;
            if (selected && input?.value) {
              handleGenerateLink(selected.id, input.value);
            } else {
              setShowSetupMeet(false);
            }
          }}>Submit</PrimaryButton>
        </div>
      </Modal>
    </div>
  );
}
