import { cn } from '@/lib/utils';
import type {
  PujaBookingStatus,
  ChadhavaBookingStatus,
  AppointmentBookingStatus,
} from '@/data/models';

type BadgeStatus = PujaBookingStatus | ChadhavaBookingStatus | AppointmentBookingStatus;

const STATUS_CONFIG: Record<BadgeStatus, { label: string; className: string }> = {
  PRASAD_SHIPPED: { label: 'Prasad Shipped', className: 'bg-green-100 text-green-700' },
  YET_TO_START: { label: 'Yet To Start', className: 'bg-yellow-100 text-yellow-700' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
  ONGOING: { label: 'Ongoing', className: 'bg-blue-100 text-blue-700' },
  VIDEO_PROCESSING: { label: 'Video Processing', className: 'bg-purple-100 text-purple-700' },
  COMPLETE: { label: 'Complete', className: 'bg-green-100 text-green-700' },
  MEET_IN_PROGRESS: { label: 'Meet In Progress', className: 'bg-blue-100 text-blue-700' },
};

interface StatusBadgeProps {
  status: BadgeStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={cn('inline-block px-3 py-1 rounded-full text-xs font-semibold', config.className)}>
      {config.label}
    </span>
  );
}
