import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  NOT_STARTED: 'text-status-not-started',
  INPROGRESS: 'text-status-inprogress',
  COMPLETED: 'text-status-completed',
  COMPLETE: 'text-status-completed',
  SHIPPED: 'text-status-shipped',
  CANCELLED: 'text-status-cancelled',
  SETTLED: 'text-status-completed',
  UNSETTLED: 'text-status-not-started',
  LINK_YET_TO_BE_GENERATED: 'text-status-not-started',
  YET_TO_START: 'text-status-not-started',
  TO_BE_SHIPPED: 'text-status-inprogress',
  LIVE_ADDED: 'text-status-inprogress',
  ONE_TIME: 'text-primary',
  SUBSCRIPTION: 'text-status-completed',
  BOTH: 'text-status-shipped',
  ADMIN: 'text-status-not-started',
  BOOKING_MANAGER: 'text-status-inprogress',
  VIEW_ONLY: 'text-muted-foreground',
  PUJA: 'text-primary',
  CHADHAVA: 'text-status-shipped',
  APPOINTMENT: 'text-status-completed',
  PUJARI: 'text-primary',
  ASTROLOGER: 'text-status-shipped',
  'NOT STARTED': 'text-status-not-started',
  'LINK PENDING': 'text-status-not-started',
  'NOT GENERATED': 'text-status-not-started',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = status.toUpperCase().replace(/\s+/g, '_');
  const style = STATUS_STYLES[key] || STATUS_STYLES[status] || 'text-muted-foreground';

  return (
    <span className={cn('text-xs font-semibold uppercase tracking-wider', style, className)}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
