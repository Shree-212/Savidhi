'use client';

import type { ReactNode } from 'react';

export interface TimelineStep {
  label: string;
  subtitle?: string;
  completed: boolean;
  isPrasadStep?: boolean;
  extra?: ReactNode;
}

interface Props {
  steps: TimelineStep[];
  /** When false, prasad-related steps (isPrasadStep) are hidden. Defaults to true. */
  hasPrasad?: boolean;
  className?: string;
}

/** Vertical timeline. Filters out steps marked isPrasadStep when hasPrasad=false. */
export function BookingTimeline({ steps, hasPrasad = true, className }: Props) {
  const visible = hasPrasad ? steps : steps.filter((s) => !s.isPrasadStep);
  return (
    <div className={className ?? 'relative pl-6'}>
      {visible.map((step, idx) => {
        const isLast = idx === visible.length - 1;
        return (
          <div key={idx} className="relative pb-6 last:pb-0">
            {!isLast && (
              <div
                className={`absolute left-[-17px] top-3 w-0.5 h-full ${
                  step.completed ? 'bg-primary-500' : 'bg-border-DEFAULT'
                }`}
              />
            )}
            <div
              className={`absolute left-[-21px] top-1 w-2.5 h-2.5 rounded-full border-2 ${
                step.completed
                  ? 'bg-primary-500 border-primary-500'
                  : 'bg-white border-border-DEFAULT'
              }`}
            />
            <p className={`font-semibold text-sm ${step.completed ? 'text-text-primary' : 'text-text-muted'}`}>
              {step.label}
            </p>
            {step.subtitle && (
              <p className="text-xs text-text-secondary mt-0.5 whitespace-pre-line">{step.subtitle}</p>
            )}
            {step.extra && <div className="mt-2">{step.extra}</div>}
          </div>
        );
      })}
    </div>
  );
}
