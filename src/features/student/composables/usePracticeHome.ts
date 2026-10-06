import type { components } from '@/api/generated/core-domain'
import { useApiItem } from '@/shared/composables/useApiItem'

type Overview = components['schemas']['PracticeOverview']
type Summary = components['schemas']['PracticeSummary']

/** The student's own time zone, which decides the calendar day each practice falls on. */
function timeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** The practice home's overview across the student's instruments, loaded on setup. */
export function usePracticeOverview() {
  return useApiItem<Overview>((coreApi) =>
    coreApi.GET('/students/me/practice-overview', { params: { query: { time_zone: timeZone() } } }),
  )
}

/** One instrument's practice summary, loaded on setup. */
export function usePracticeSummary(instrumentId: string) {
  return useApiItem<Summary>((coreApi) =>
    coreApi.GET('/students/me/practice-summary', { params: { query: { instrument_id: instrumentId, time_zone: timeZone() } } }),
  )
}
