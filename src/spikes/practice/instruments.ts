/**
 * Which instruments a student practises and which items suit an instrument.
 * An item for every instrument (no instruments listed) suits any of them.
 */

export function fits(item: { instrument_ids: string[] }, instrumentId: string): boolean {
  return item.instrument_ids.length === 0 || item.instrument_ids.includes(instrumentId)
}

export interface InstrumentSources {
  /** The paths and courses the student is enrolled in. */
  enrolments: { instrument_ids: string[] }[]
  /** Instruments the student added in their profile, e.g. one they practise outside any path. */
  profile_instrument_ids: string[]
}

/** A student's instruments: from enrolments (one for every instrument adds none) plus the profile, once each. */
export function studentInstruments(sources: InstrumentSources): string[] {
  return [
    ...new Set([
      ...sources.enrolments.flatMap((e) => e.instrument_ids),
      ...sources.profile_instrument_ids,
    ]),
  ]
}
