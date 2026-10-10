import type { components } from '@/api/generated/core-domain'
import { useApiItem } from '@/shared/composables/useApiItem'

type Overview = components['schemas']['PracticeOverview']
type Summary = components['schemas']['PracticeSummary']
type FretboardMap = components['schemas']['FretboardMap']

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

/**
 * One instrument's practice summary, loaded on setup. With no instrument, the summary of the
 * skills that suit any instrument.
 */
export function usePracticeSummary(instrumentId: string | null) {
  const query = instrumentId ? { instrument_id: instrumentId, time_zone: timeZone() } : { time_zone: timeZone() }
  return useApiItem<Summary>((coreApi) => coreApi.GET('/students/me/practice-summary', { params: { query } }))
}

/** How well the student knows each cell of an instrument's fretboard, loaded on setup. */
export function useFretboardMap(instrumentId: string) {
  return useApiItem<FretboardMap>((coreApi) => coreApi.GET('/students/me/fretboard-map', { params: { query: { instrument_id: instrumentId } } }))
}
