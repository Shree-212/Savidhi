import type { RepeatDuration } from '@/data/models';

type TFn = (key: string, vars?: Record<string, string | number>) => string;

interface RepeatableEvent {
  eventRepeats?: boolean;
  repeatDuration?: RepeatDuration;
  repeatsOn?: string[];
}

export function getRepeatLabel(t: TFn, e: RepeatableEvent): string | null {
  if (!e.eventRepeats) return null;
  switch (e.repeatDuration) {
    case 'WEEK_DAYS':
      return t('event.repeat.weekly');
    case 'MONTH_DATE':
      return t('event.repeat.monthly');
    case 'LUNAR_PHASE': {
      const tithi = (e.repeatsOn ?? []).filter(Boolean).join(', ');
      if (!tithi) return null;
      return t('event.repeat.eachTithi', { tithi });
    }
    default:
      return null;
  }
}
