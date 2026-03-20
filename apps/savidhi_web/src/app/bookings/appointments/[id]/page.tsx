'use client';

import { use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Phone, Video } from 'lucide-react';
import { MOCK_APPOINTMENT_STATUS } from '@/data';

export default function AppointmentStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const status = MOCK_APPOINTMENT_STATUS; // In real app, fetch by id

  return (
    <div className="section-container py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/bookings/appointments">
          <ArrowLeft className="w-5 h-5 text-text-primary" />
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Appointment Status</h1>
      </div>

      {/* Astrologer Card */}
      <div className="card p-4 mb-6 flex items-center gap-4">
        <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
          <Image
            src={status.astrologerImage}
            alt={status.astrologerName}
            fill
            className="object-cover"
          />
        </div>
        <div>
          <h2 className="font-bold text-text-primary">{status.astrologerName}</h2>
          <p className="text-xs text-text-muted mt-1">Booking ID: {status.bookingId}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative pl-8">
        {status.steps.map((step, idx) => {
          const isLast = idx === status.steps.length - 1;
          return (
            <div key={idx} className="relative pb-8 last:pb-0">
              {/* Vertical Line */}
              {!isLast && (
                <div
                  className={`absolute left-[-20px] top-3 w-0.5 h-full ${
                    step.completed ? 'bg-primary-500' : 'bg-border-DEFAULT'
                  }`}
                />
              )}

              {/* Dot */}
              <div
                className={`absolute left-[-24px] top-1 w-2.5 h-2.5 rounded-full border-2 ${
                  step.completed
                    ? 'bg-primary-500 border-primary-500'
                    : 'bg-white border-border-DEFAULT'
                }`}
              />

              {/* Content */}
              <div>
                <p className={`font-semibold text-sm ${step.completed ? 'text-text-primary' : 'text-text-muted'}`}>
                  {step.label}
                </p>

                {step.subtitle && (
                  <p className="text-xs text-text-secondary mt-1">{step.subtitle}</p>
                )}

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

      {/* Action Button */}
      <div className="mt-8">
        <button className="w-full btn-outline flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium">
          <Phone className="w-4 h-4" />
          Call Support
        </button>
      </div>
    </div>
  );
}
