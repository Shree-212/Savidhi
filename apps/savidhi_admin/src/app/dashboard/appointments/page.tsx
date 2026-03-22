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

/* ── helpers ──────────────────────────────────────────────── */

const STATUS_COLOR: Record<string, TimelineEvent['color']> = {
  LINK_YET_TO_BE_GENERATED: 'orange',
  INPROGRESS:               'teal',
  COMPLETED:                'green',
  CANCELLED:                'red',
};

function toTimelineEvent(a: any): TimelineEvent {
  const d = new Date(a.scheduled_at ?? a.dateTime);
  const durationMap: Record<string, number> = {
    '15min': 0.25, '30min': 0.5, '1hour': 1, '2hour': 2,
  };
  return {
    id:            a.id,
    title:         `ASTRO ${(a.astrologer_name ?? a.astrologerName ?? '').toUpperCase()}`,
    subtitle:      `DEVOTEE: ${a.devotee_display_name ?? a.devotee_name ?? a.devotee ?? ''}`,
    startHour:     d.getHours() + d.getMinutes() / 60,
    durationHours: durationMap[a.duration] ?? 0.5,
    day:           d.getDate(),
    date:          a.scheduled_at ?? a.dateTime,
    color:         STATUS_COLOR[a.status] ?? 'orange',
    status:        a.status,
  };
}

function mapAppointment(a: any): Appointment & { bookedAt: string; devoteeName: string; devoteeGotra: string } {
  const scheduledAt = a.scheduled_at ?? a.scheduledAt;
  const durationMap: Record<string, number> = {
    '15min': 15, '30min': 30, '1hour': 60, '2hour': 120,
  };
  const durationMins = durationMap[a.duration] ?? 30;
  let dateTimeLabel = '';
  if (scheduledAt) {
    const start = new Date(scheduledAt);
    const end   = new Date(start.getTime() + durationMins * 60000);
    const fmt = (d: Date) => d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    dateTimeLabel = `${fmt(start)} – ${fmt(end)}`;
  }

  return {
    ...a,
    astrologerName: a.astrologer_name ?? a.astrologerName ?? '',
    dateTime:       dateTimeLabel || a.dateTime || '',
    cost:           Number(a.cost ?? 0),
    meetLink:       a.meet_link   ?? a.meetLink ?? '',
    status:         a.status,
    // devotee as object for type compat
    devotee: {
      name:     a.devotee_name    ?? a.devotee_display_name ?? '',
      relation: 'Booked By',
      gotra:    a.devotee_gotra   ?? '',
    },
    // extra flat fields for convenience
    bookedAt:     a.created_at
      ? new Date(a.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : '',
    devoteeName:  a.devotee_name  ?? a.devotee_display_name ?? '',
    devoteeGotra: a.devotee_gotra ?? '',
  };
}

/* ══════════════════════════════════════════════════════════ */

export default function AppointmentsPage() {
  const [tab,    setTab]    = useState('List');
  const [search, setSearch] = useState('');
  const [selected,      setSelected]      = useState<(Appointment & { bookedAt: string; devoteeName: string; devoteeGotra: string }) | null>(null);
  const [showSetupMeet, setShowSetupMeet] = useState(false);
  const [meetLinkInput, setMeetLinkInput] = useState('');

  const [appointments,    setAppointments]    = useState<(Appointment & { bookedAt: string; devoteeName: string; devoteeGotra: string })[]>([]);
  const [timelineEvents,  setTimelineEvents]  = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  /* ── Fetch ── */
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await appointmentService.list({ limit: 100 });
      const raw = res.data?.data ?? res.data ?? [];
      const mapped = raw.map(mapAppointment);
      setAppointments(mapped);
      setTimelineEvents(raw.map(toTimelineEvent));
    } catch (err: any) {
      setError(err.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  /* ── View appointment detail ── */
  const handleViewAppointment = async (appt: typeof appointments[number]) => {
    try {
      const res  = await appointmentService.getById(appt.id);
      const data = res.data?.data ?? res.data;
      setSelected(mapAppointment(data));
    } catch {
      setSelected(appt);
    }
  };

  /* ── Generate meet link ── */
  const handleGenerateLink = async (link: string) => {
    if (!selected || !link.trim()) return alert('Please enter a meeting link');
    try {
      await appointmentService.generateMeetLink(selected.id, { meet_link: link });
      setShowSetupMeet(false);
      setMeetLinkInput('');
      fetchAppointments();
      // Re-fetch detail
      const res  = await appointmentService.getById(selected.id);
      setSelected(mapAppointment(res.data?.data ?? res.data));
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to generate meet link');
    }
  };

  /* ── Mark complete ── */
  const handleMarkComplete = async (appointmentId: string) => {
    try {
      await appointmentService.complete(appointmentId);
      setSelected(null);
      fetchAppointments();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to mark as complete');
    }
  };

  /* ── Cancel ── */
  const handleCancel = async (appointmentId: string) => {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await appointmentService.cancel(appointmentId);
      setSelected(null);
      fetchAppointments();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to cancel appointment');
    }
  };

  /* ── Columns ── */
  const columns = [
    { key: 'id',             label: 'ID',             render: (r: any) => <span className="text-[10px] font-mono">{r.id.slice(0, 8)}</span> },
    { key: 'astrologerName', label: 'Astrologer Name' },
    { key: 'dateTime',       label: 'Date & Time' },
    { key: 'cost',           label: 'Cost', render: (r: Appointment) => <span className="text-primary">₹{r.cost}</span> },
    { key: 'status',         label: 'Status', render: (r: Appointment) => <StatusBadge status={r.status} /> },
    { key: 'action',         label: 'Action', render: (r: typeof appointments[number]) => (
      <div className="flex items-center gap-1">
        <ViewButton onClick={() => handleViewAppointment(r)} />
        <DeleteButton onClick={() => handleCancel(r.id)} />
      </div>
    )},
  ];

  if (loading && appointments.length === 0) {
    return <div className="flex items-center justify-center h-64"><div className="text-sm text-muted-foreground">Loading appointments...</div></div>;
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
          }}
        />
      )}

      {/* ── Booking Detail Modal ── */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Booking <${selected?.id?.slice(0, 8)}> Details`}
        statusBadge={selected && <StatusBadge status={selected.status} />}
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-foreground">Astro {selected.astrologerName}</p>
              <span className="text-primary font-bold text-sm">₹{selected.cost}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Meet Time: {selected.dateTime}</p>
            {selected.bookedAt && (
              <p className="text-[11px] text-muted-foreground">Booked at: {selected.bookedAt}</p>
            )}

            <div className="border border-border rounded-lg p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider">Devotee Details</span>
              <div className="text-[11px] mt-1">
                <span className="text-foreground">{selected.devotee.name}</span>
                {selected.devotee.relation && (
                  <span className="text-primary ml-1">({selected.devotee.relation})</span>
                )}
                {selected.devotee.gotra && (
                  <div className="text-muted-foreground">Gotra: {selected.devotee.gotra}</div>
                )}
              </div>
            </div>

            {selected.meetLink && (
              <div className="border border-border rounded-lg p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider">Meet Link</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-foreground break-all">{selected.meetLink}</span>
                  <button
                    onClick={() => navigator.clipboard?.writeText(selected.meetLink!)}
                    className="text-primary text-xs flex-shrink-0"
                  >📋</button>
                  <span className="text-primary cursor-pointer text-xs">✏️</span>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              {selected.status !== 'CANCELLED' && selected.status !== 'COMPLETED' && (
                <OutlineButton className="flex-1" onClick={() => handleCancel(selected.id)}>Cancel Booking</OutlineButton>
              )}
              {selected.status === 'LINK_YET_TO_BE_GENERATED' && (
                <PrimaryButton className="flex-1" onClick={() => setShowSetupMeet(true)}>Setup Meet</PrimaryButton>
              )}
              {selected.status === 'INPROGRESS' && (
                <PrimaryButton className="flex-1" onClick={() => handleMarkComplete(selected.id)}>Mark Complete</PrimaryButton>
              )}
              {(selected.status === 'CANCELLED' || selected.status === 'COMPLETED') && (
                <PrimaryButton className="flex-1" onClick={() => setSelected(null)}>Close</PrimaryButton>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Setup Meet Modal ── */}
      <Modal
        open={showSetupMeet}
        onClose={() => { setShowSetupMeet(false); setMeetLinkInput(''); }}
        title="Setup Meet"
        onBack={() => { setShowSetupMeet(false); setMeetLinkInput(''); }}
      >
        <div className="space-y-4">
          <input
            value={meetLinkInput}
            onChange={e => setMeetLinkInput(e.target.value)}
            placeholder="Paste Meeting Link"
            className="w-full h-10 px-3 bg-accent border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-[10px] text-muted-foreground">Note: Devotee can only see the link prior 30 min of appointment start time</p>
          <PrimaryButton className="w-full" onClick={() => handleGenerateLink(meetLinkInput)}>Submit</PrimaryButton>
        </div>
      </Modal>
    </div>
  );
}
