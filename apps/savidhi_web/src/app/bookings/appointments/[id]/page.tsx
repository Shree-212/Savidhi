'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Phone, Video, Loader2 } from 'lucide-react';
import { appointmentService } from '@/lib/services';
import { MOCK_APPOINTMENT_STATUS } from '@/data';
import { normaliseMediaUrl } from '@/lib/utils';
import type { AppointmentStatusDetail, AppointmentStatusStep } from '@/data';

function buildSteps(a: any): AppointmentStatusStep[] {
  const s = a.status ?? 'LINK_YET_TO_BE_GENERATED';
  return [
    {
      label: 'Booking Confirmed',
      subtitle: a.created_at ? `Booked on ${new Date(a.created_at).toLocaleDateString('en-IN')}` : undefined,
      completed: true,
    },
    {
      label: 'Meet Link Shared',
      subtitle: a.meet_link ? 'Meeting link is ready' : 'Link will be sent 30 min before appointment',
      completed: ['INPROGRESS', 'COMPLETED'].includes(s),
      actionLabel: s === 'INPROGRESS' && a.meet_link ? 'Join Meeting' : undefined,
    },
    {
      label: 'Consultation in Progress',
      subtitle: a.scheduled_at ? `Scheduled: ${new Date(a.scheduled_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : undefined,
      completed: ['INPROGRESS', 'COMPLETED'].includes(s),
    },
    {
      label: 'Completed',
      completed: s === 'COMPLETED',
    },
  ];
}

export default function AppointmentStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [status, setStatus] = useState<AppointmentStatusDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    appointmentService.getById(id)
      .then((res) => {
        const a = res.data?.data ?? res.data;
        if (a) {
          setStatus({
            bookingId: a.id,
            astrologerName: a.astrologer_name ?? '',
            astrologerImage: normaliseMediaUrl(a.astrologer_pic ?? ''),
            pujaId: a.astrologer_id ?? '',
            steps: buildSteps(a),
          });
        } else {
          setStatus(MOCK_APPOINTMENT_STATUS);
        }
      })
      .catch(() => setStatus(MOCK_APPOINTMENT_STATUS))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="section-container py-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/bookings/appointments">
          <ArrowLeft className="w-5 h-5 text-text-primary" />
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Appointment Status</h1>
      </div>

      <div className="card p-4 mb-6 flex items-center gap-4">
        {status.astrologerImage && (
          <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
            <Image src={status.astrologerImage} alt={status.astrologerName} fill className="object-cover" unoptimized />
          </div>
        )}
        <div>
          <h2 className="font-bold text-text-primary">{status.astrologerName}</h2>
          <p className="text-xs text-text-muted mt-1">Booking ID: {status.bookingId.slice(0, 8)}</p>
        </div>
      </div>

      <div className="relative pl-8">
        {status.steps.map((step, idx) => {
          const isLast = idx === status.steps.length - 1;
          return (
            <div key={idx} className="relative pb-8 last:pb-0">
              {!isLast && (
                <div className={`absolute left-[-20px] top-3 w-0.5 h-full ${step.completed ? 'bg-primary-500' : 'bg-border-DEFAULT'}`} />
              )}
              <div className={`absolute left-[-24px] top-1 w-2.5 h-2.5 rounded-full border-2 ${step.completed ? 'bg-primary-500 border-primary-500' : 'bg-white border-border-DEFAULT'}`} />
              <div>
                <p className={`font-semibold text-sm ${step.completed ? 'text-text-primary' : 'text-text-muted'}`}>{step.label}</p>
                {step.subtitle && <p className="text-xs text-text-secondary mt-1">{step.subtitle}</p>}
                {step.actionLabel && (
                  <button className="mt-2 btn-primary px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    {step.actionLabel}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <button className="w-full btn-outline flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium">
          <Phone className="w-4 h-4" />
          Call Support
        </button>
      </div>
    </div>
  );
}
