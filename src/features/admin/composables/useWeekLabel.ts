import type { components } from '@/api/generated/core-domain'
import { runningWeekStart, shiftWeek, weekRange } from '@/features/admin/utils/alphaObservation'
import { useTypedT } from '@/shared/composables/useTypedT'

type AlphaWeekRange = components['schemas']['AlphaWeekRange']

/** "This week · 12–18 Oct", "Last week · 5–11 Oct", or just the dates for an earlier week. */
export function useWeekLabel() {
  const { t, locale } = useTypedT()

  return (week: AlphaWeekRange, datesOnly = false): string => {
    const range = weekRange(week, locale.value)
    if (datesOnly) return range
    if (week.running) return t('engagement.week.thisWeek', { range })
    if (week.week_start === shiftWeek(runningWeekStart(new Date()), -1)) return t('engagement.week.lastWeek', { range })
    return range
  }
}
