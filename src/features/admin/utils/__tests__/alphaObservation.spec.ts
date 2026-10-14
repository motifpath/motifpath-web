import { describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import type { components as eventComponents } from '@/api/generated/event-ingestion'
import {
  eventDetails,
  eventTypesOf,
  filterCounts,
  lastActive,
  matchesStudentSearch,
  passesFilter,
  shiftWeek,
  weekChip,
  weekRange,
} from '@/features/admin/utils/alphaObservation'

type AlphaStudent = components['schemas']['AlphaStudent']
type TrackingEvent = eventComponents['schemas']['TrackingEvent']

function student(overrides: Partial<AlphaStudent>): AlphaStudent {
  return {
    student_id: 's-1',
    display_name: 'Camila Duarte',
    registered_at: '2026-09-21T12:00:00Z',
    finished_sessions_in_week: 2,
    at_target_in_week: false,
    weeks_so_far: [],
    weeks_so_far_count: 0,
    weeks_at_target_count: 0,
    at_target_every_week: false,
    last_active_at: null,
    quiet: false,
    first_path: {
      student_path_id: 'p-1',
      title: 'Guitar foundations',
      given_at: '2026-09-21T12:00:00Z',
      completed_nodes: 11,
      total_nodes: 18,
      completed_percent: 61,
      over_target: false,
    },
    ...overrides,
  }
}

describe('weekChip', () => {
  it.each([
    [0, { kind: 'none' }],
    [1, { kind: 'toGo', remaining: 2 }],
    [2, { kind: 'toGo', remaining: 1 }],
    [3, { kind: 'onTarget' }],
    [4, { kind: 'onTarget' }],
  ])('says how far %i counted sessions are from 3', (count, chip) => {
    expect(weekChip(count)).toEqual(chip)
  })
})

describe('shiftWeek', () => {
  it('steps a week back and forward by calendar days', () => {
    expect(shiftWeek('2026-10-12', -1)).toBe('2026-10-05')
    expect(shiftWeek('2026-10-05', 1)).toBe('2026-10-12')
  })

  it('crosses month and year ends', () => {
    expect(shiftWeek('2026-10-05', -2)).toBe('2026-09-21')
    expect(shiftWeek('2026-12-28', 1)).toBe('2027-01-04')
  })

  it('does not drift across a daylight-saving change', () => {
    expect(shiftWeek('2026-11-02', 1)).toBe('2026-11-09')
    expect(shiftWeek('2026-03-30', -1)).toBe('2026-03-23')
  })
})

describe('weekRange', () => {
  it('names the month once when the week stays in one month', () => {
    expect(weekRange({ week_start: '2026-10-12', week_end: '2026-10-18' }, 'en')).toBe('12–18 Oct')
  })

  it('names both months when the week crosses into the next', () => {
    expect(weekRange({ week_start: '2026-09-28', week_end: '2026-10-04' }, 'en')).toBe('28 Sep – 4 Oct')
  })

  it('uses the language’s own month names', () => {
    expect(weekRange({ week_start: '2026-10-12', week_end: '2026-10-18' }, 'pt-BR')).toBe('12–18 out.')
  })
})

describe('lastActive', () => {
  const now = new Date('2026-10-14T15:00:00Z') // 12:00 in São Paulo

  it('says when today, in São Paulo time', () => {
    expect(lastActive('2026-10-14T10:51:00Z', now)).toEqual({ kind: 'today', time: '07:51' })
  })

  it('counts whole São Paulo days for anything before today', () => {
    expect(lastActive('2026-10-13T23:00:00Z', now)).toEqual({ kind: 'daysAgo', days: 1 })
    expect(lastActive('2026-10-05T12:00:00Z', now)).toEqual({ kind: 'daysAgo', days: 9 })
  })

  it('says so when the student has no activity at all', () => {
    expect(lastActive(null, now)).toEqual({ kind: 'none' })
  })
})

describe('matchesStudentSearch', () => {
  it('matches part of a name, ignoring case and accents', () => {
    expect(matchesStudentSearch('Beatriz Rocha', 'rocha')).toBe(true)
    expect(matchesStudentSearch('Beatriz Rocha', 'ROC')).toBe(true)
    expect(matchesStudentSearch('João Araújo', 'joao araujo')).toBe(true)
    expect(matchesStudentSearch('Camila Duarte', 'rocha')).toBe(false)
  })

  it('matches everyone on an empty or blank query', () => {
    expect(matchesStudentSearch('Camila Duarte', '')).toBe(true)
    expect(matchesStudentSearch('Camila Duarte', '   ')).toBe(true)
  })
})

describe('filters', () => {
  const students = [
    student({ student_id: 'a', finished_sessions_in_week: 0, quiet: true }),
    student({ student_id: 'b', finished_sessions_in_week: 2 }),
    student({ student_id: 'c', finished_sessions_in_week: 3, at_target_in_week: true }),
  ]

  it('counts each filter over every student', () => {
    expect(filterCounts(students)).toEqual({ all: 3, belowTarget: 2, quiet: 1 })
  })

  it('keeps the students a filter names', () => {
    expect(students.filter((s) => passesFilter(s, 'all')).map((s) => s.student_id)).toEqual(['a', 'b', 'c'])
    expect(students.filter((s) => passesFilter(s, 'belowTarget')).map((s) => s.student_id)).toEqual(['a', 'b'])
    expect(students.filter((s) => passesFilter(s, 'quiet')).map((s) => s.student_id)).toEqual(['a'])
  })
})

describe('eventTypesOf', () => {
  it('lists the exact event types behind each group', () => {
    expect(eventTypesOf('practice_sessions')).toEqual(['practice.session_started', 'practice.session_ended'])
    expect(eventTypesOf('answers')).toEqual(['practice.item_answered', 'practice.tap_check_completed'])
    expect(eventTypesOf('lessons')).toEqual(['lesson.started', 'lesson.resumed', 'lesson.completed'])
    expect(eventTypesOf('exercises')).toEqual(['exercise.started', 'exercise.progress', 'exercise.ended'])
    expect(eventTypesOf('song_charts')).toEqual(['song_chart.opened', 'song_chart.chord_viewed', 'song_chart.completed'])
  })
})

describe('eventDetails', () => {
  const envelope = {
    event_id: 'e-1',
    student_id: 's-1',
    session_id: 'sess-1',
    occurred_at: '2026-10-14T10:51:12Z',
  }

  it('describes a started session by its short id and planned minutes', () => {
    const event: TrackingEvent = {
      ...envelope,
      event_type: 'practice.session_started',
      practice_session_id: '7f3c9a10-0000-4000-8000-000000000001',
      minutes: 10,
      planned_items: [],
    }

    expect(eventDetails(event)).toEqual([
      { key: 'session', params: { id: '7f3c9a10' } },
      { key: 'minutesPlanned', params: { minutes: 10 } },
    ])
  })

  it('describes an ended session by whether it was left early and how many items were answered', () => {
    const event: TrackingEvent = {
      ...envelope,
      event_type: 'practice.session_ended',
      practice_session_id: '2a91bb00-0000-4000-8000-000000000002',
      answered_count: 3,
      left_early: true,
      felt_ratings: [],
    }

    expect(eventDetails(event)).toEqual([
      { key: 'session', params: { id: '2a91bb00' } },
      { key: 'leftEarly', params: {} },
      { key: 'itemsAnswered', params: { count: 3 } },
    ])
  })

  it('describes an answer by its response type and how long it took', () => {
    const event: TrackingEvent = {
      ...envelope,
      event_type: 'practice.item_answered',
      item_key: 'drill:name-the-note',
      response: { response_type: 'name_the_note', note_name: 'G', latency_ms: 2100 },
    }

    expect(eventDetails(event)).toEqual([
      { key: 'responseType', params: { type: 'name_the_note' } },
      { key: 'seconds', params: { seconds: '2.1' } },
    ])
  })

  it('describes a tap check by its median and tap count', () => {
    const event: TrackingEvent = {
      ...envelope,
      event_type: 'practice.tap_check_completed',
      median_tap_ms: 42,
      tap_count: 12,
    }

    expect(eventDetails(event)).toEqual([
      { key: 'medianTap', params: { ms: 42 } },
      { key: 'taps', params: { count: 12 } },
    ])
  })

  it('describes a completed lesson by its node and how long it was watched', () => {
    const event: TrackingEvent = {
      ...envelope,
      event_type: 'lesson.completed',
      content_context: { content_node_id: 'c04e1200-0000-4000-8000-000000000003', content_type: 'video' },
      duration_seconds: 400,
    }

    expect(eventDetails(event)).toEqual([
      { key: 'node', params: { id: 'c04e1200' } },
      { key: 'contentType', params: { type: 'video' } },
      { key: 'duration', params: { minutes: 6, seconds: 40 } },
    ])
  })
})
