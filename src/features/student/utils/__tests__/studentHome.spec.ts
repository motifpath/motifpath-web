import { describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import { skillLevelCounts, skillsInstrumentId, thisWeek, todaysPractice } from '@/features/student/utils/studentHome'

type Overview = components['schemas']['PracticeOverview']
type Summary = components['schemas']['PracticeSummary']
type NodeProgress = components['schemas']['PracticeNodeProgress']

const GUITAR = 'guitar-id'
const BASS = 'bass-id'

function overview(overrides: Partial<Overview> = {}): Overview {
  return {
    practice_days_last_7: 0,
    learning_days_last_7: 0,
    minutes_practised_last_7: 0,
    minutes_practised_previous_7: 0,
    day_streak_current: 0,
    day_streak_best: 0,
    skills_up_last_7: 0,
    songs_played_total: 0,
    songs_played_last_7: 0,
    last_7_days: [],
    instruments: [],
    ...overrides,
  }
}

function node(nodeId: string, level: NodeProgress['level'], fading = false): NodeProgress {
  return {
    node_id: nodeId,
    names: { en: nodeId },
    level,
    fading,
    coverage: { met_count: 0, item_count: 0 },
    child_node_ids: [],
    readiness: { met_count: 0, required_count: 0 },
  }
}

function summary(nodes: NodeProgress[][]): Summary {
  return {
    instrument_id: GUITAR,
    student_instrument_ids: [GUITAR],
    practice_days_last_7: 0,
    last_7_days: [],
    progress_this_week: [],
    next_steps: [],
    next_steps_total: 0,
    groups: nodes.map((groupNodes, index) => ({
      area_node_id: `area-${index}`,
      any_instrument: false,
      names: { en: `Area ${index}` },
      nodes: groupNodes,
    })),
  }
}

const refreshTriads = { kind: 'refresh' as const, node_id: 'major-triads', names: { en: 'Major triads' } }

describe('todaysPractice', () => {
  it('is the top next step across instruments: the first instrument that has one', () => {
    const today = todaysPractice(
      overview({
        instruments: [
          { instrument_id: BASS, practice_days_last_7: 0, top_next_step: null },
          { instrument_id: GUITAR, practice_days_last_7: 2, top_next_step: refreshTriads },
        ],
      }),
    )

    expect(today).toEqual({ instrumentId: GUITAR, step: refreshTriads })
  })

  it('is nothing when no instrument has a next step', () => {
    expect(todaysPractice(overview({ instruments: [{ instrument_id: GUITAR, practice_days_last_7: 0, top_next_step: null }] }))).toBeNull()
  })
})

describe('skillsInstrumentId', () => {
  it("is today's practice instrument", () => {
    const value = skillsInstrumentId(
      overview({
        instruments: [
          { instrument_id: BASS, practice_days_last_7: 0, top_next_step: null },
          { instrument_id: GUITAR, practice_days_last_7: 0, top_next_step: refreshTriads },
        ],
      }),
    )

    expect(value).toBe(GUITAR)
  })

  it("falls back to the student's first instrument when nothing is suggested", () => {
    const value = skillsInstrumentId(overview({ instruments: [{ instrument_id: BASS, practice_days_last_7: 0, top_next_step: null }] }))

    expect(value).toBe(BASS)
  })

  it('is nothing for a student with no instruments', () => {
    expect(skillsInstrumentId(overview())).toBeNull()
  })
})

describe('thisWeek', () => {
  it('reads minutes against the week before, the day streak with the best, and songs played', () => {
    const week = thisWeek(
      overview({
        minutes_practised_last_7: 48,
        minutes_practised_previous_7: 33,
        day_streak_current: 3,
        day_streak_best: 9,
        songs_played_total: 5,
        songs_played_last_7: 1,
      }),
    )

    expect(week).toEqual({ minutes: 48, minutesChange: 15, streak: 3, bestStreak: 9, songs: 5, songsThisWeek: 1 })
  })

  it('keeps a lower week as a negative change, for the tile to show without alarm', () => {
    const week = thisWeek(overview({ minutes_practised_last_7: 20, minutes_practised_previous_7: 45 }))

    expect(week.minutesChange).toBe(-25)
  })
})

describe('skillLevelCounts', () => {
  it('counts the skills at each level and how many are fading', () => {
    const counts = skillLevelCounts(
      summary([
        [node('a', 'learning'), node('b', 'learning', true), node('c', 'accurate'), node('d', 'fluent', true)],
        [node('e', 'retained'), node('f', 'accurate')],
      ]),
    )

    expect(counts).toEqual({ counts: { learning: 2, accurate: 2, fluent: 1, retained: 1 }, fading: 2 })
  })

  it('leaves out new skills and wide nodes, which have no level to show', () => {
    const counts = skillLevelCounts(summary([[node('a', 'new'), node('wide', null), node('b', 'fluent')]]))

    expect(counts).toEqual({ counts: { learning: 0, accurate: 0, fluent: 1, retained: 0 }, fading: 0 })
  })

  it('counts a skill listed in two groups once', () => {
    const counts = skillLevelCounts(summary([[node('a', 'accurate', true)], [node('a', 'accurate', true)]]))

    expect(counts).toEqual({ counts: { learning: 0, accurate: 1, fluent: 0, retained: 0 }, fading: 1 })
  })
})
