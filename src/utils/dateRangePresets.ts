import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns';
import { DateRange } from 'react-day-picker';

export type DateRangePresetId =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'custom';

export const DATE_RANGE_PRESET_OPTIONS: Array<{ value: DateRangePresetId; label: string }> = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'this_week', label: 'This week' },
  { value: 'last_week', label: 'Last week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'custom', label: 'Custom range' },
];

export function getDateRangeForPreset(
  preset: DateRangePresetId,
  now = new Date()
): DateRange | undefined {
  const today = startOfDay(now);

  switch (preset) {
    case 'all':
      return undefined;
    case 'today':
      return { from: today, to: endOfDay(today) };
    case 'yesterday': {
      const yesterday = subDays(today, 1);
      return { from: yesterday, to: endOfDay(yesterday) };
    }
    case 'last_7_days':
      return { from: subDays(today, 6), to: endOfDay(today) };
    case 'last_30_days':
      return { from: subDays(today, 29), to: endOfDay(today) };
    case 'this_week':
      return {
        from: startOfWeek(today, { weekStartsOn: 1 }),
        to: endOfWeek(today, { weekStartsOn: 1 }),
      };
    case 'last_week': {
      const previousWeek = subDays(today, 7);
      return {
        from: startOfWeek(previousWeek, { weekStartsOn: 1 }),
        to: endOfWeek(previousWeek, { weekStartsOn: 1 }),
      };
    }
    case 'this_month':
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case 'last_month': {
      const previousMonth = subMonths(today, 1);
      return { from: startOfMonth(previousMonth), to: endOfMonth(previousMonth) };
    }
    case 'custom':
      return undefined;
    default: {
      const _exhaustive: never = preset;
      throw new Error(`Unhandled date preset: ${_exhaustive}`);
    }
  }
}
