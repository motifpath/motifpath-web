import type { components } from '@/api/generated/core-domain'

type Overview = components['schemas']['PracticeOverview']
type Summary = components['schemas']['PracticeSummary']
type NextStep = components['schemas']['PracticeNextStep']

/** The levels a skill shows on the home once the student has started it; new skills aren't counted. */
export type ShownLevel = 'learning' | 'accurate' | 'fluent' | 'retained'

const SHOWN_LEVELS: readonly string[] = ['learning', 'accurate', 'fluent', 'retained'] satisfies ShownLevel[]

function isShownLevel(level: string | null): level is ShownLevel {
  return level !== null && SHOWN_LEVELS.includes(level)
}

/**
 * The home's one suggestion: the top next step across instruments. The overview lists instruments
 * in the order the student's summaries rank them, so it is the first instrument that has a step.
 */
export function todaysPractice(overview: Overview): { instrumentId: string; step: NextStep } | null {
  const card = overview.instruments.find((candidate) => candidate.top_next_step !== null)
  return card?.top_next_step ? { instrumentId: card.instrument_id, step: card.top_next_step } : null
}

/**
 * The instrument Your skills is about: today's practice instrument, or the student's first one when
 * nothing is suggested. Levels never add up across instruments, so it is always exactly one.
 */
export function skillsInstrumentId(overview: Overview): string | null {
  return todaysPractice(overview)?.instrumentId ?? overview.instruments[0]?.instrument_id ?? null
}

/** This week's three numbers, across every instrument. */
export function thisWeek(overview: Overview) {
  return {
    minutes: overview.minutes_practised_last_7,
    minutesChange: overview.minutes_practised_last_7 - overview.minutes_practised_previous_7,
    streak: overview.day_streak_current,
    bestStreak: overview.day_streak_best,
    songs: overview.songs_played_total,
    songsThisWeek: overview.songs_played_last_7,
  }
}

/**
 * How many of an instrument's skills sit at each level, and how many of them are fading. Only
 * skills with a level count: a wide node is shown through its children, and a new skill isn't
 * started yet. A skill listed under two areas counts once.
 */
export function skillLevelCounts(summary: Summary): { counts: Record<ShownLevel, number>; fading: number } {
  const counts: Record<ShownLevel, number> = { learning: 0, accurate: 0, fluent: 0, retained: 0 }
  let fading = 0
  const seen = new Set<string>()

  for (const node of summary.groups.flatMap((group) => group.nodes)) {
    if (seen.has(node.node_id) || !isShownLevel(node.level)) continue
    seen.add(node.node_id)
    counts[node.level] += 1
    if (node.fading) fading += 1
  }

  return { counts, fading }
}
