import { beforeEach, describe, expect, it, vi } from 'vitest'

const track = vi.fn()
vi.mock('@/shared/composables/useEventTracking', () => ({
  useEventTracking: () => ({ track }),
}))

import { usePracticeSessionRun } from '@/features/student/composables/usePracticeSessionRun'
import type { components } from '@/api/generated/core-domain'

type Plan = components['schemas']['PracticeSessionPlan']
type Item = components['schemas']['PracticeSessionItem']

const SESSION_ID = '11111111-1111-4111-8111-111111111111'
const GUITAR_ID = '22222222-2222-4222-8222-222222222222'

function playAlong(diagramId: string, reason: Item['reason'], tempos: { start: number; target: number }): Item {
  return {
    item_key: `play_along:${diagramId}`,
    kind: 'play_along',
    reason,
    node_id: null,
    level: 'learning',
    estimated_seconds: 60,
    play_along: {
      diagram_id: diagramId,
      start_tempo_bpm: tempos.start,
      target_tempo_bpm: tempos.target,
      best_clean_tempo_bpm: null,
    },
  }
}

const WARM_UP = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const DUE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function plan(items: Item[], instrumentId: string | null = GUITAR_ID): Plan {
  return { practice_session_id: SESSION_ID, instrument_id: instrumentId, minutes: 10, items }
}

const twoItems = plan([
  playAlong(WARM_UP, 'warm_up', { start: 80, target: 120 }),
  playAlong(DUE, 'due', { start: 60, target: 100 }),
])

function tracked(eventType: string) {
  return track.mock.calls.map(([event]) => event).filter((event) => event.event_type === eventType)
}

describe('usePracticeSessionRun', () => {
  beforeEach(() => track.mockReset())

  it('sends the plan as practice.session_started when the session starts', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()

    expect(tracked('practice.session_started')).toEqual([
      {
        event_type: 'practice.session_started',
        practice_session_id: SESSION_ID,
        instrument_id: GUITAR_ID,
        minutes: 10,
        planned_items: [
          { item_key: `play_along:${WARM_UP}`, reason: 'warm_up' },
          { item_key: `play_along:${DUE}`, reason: 'due' },
        ],
      },
    ])
  })

  it('leaves the instrument out of practice.session_started for a session in the head', () => {
    const run = usePracticeSessionRun(plan([playAlong(DUE, 'due', { start: 60, target: 100 })], null))
    run.start()

    expect(tracked('practice.session_started')[0]).not.toHaveProperty('instrument_id')
  })

  it('starts on the first item, at its start tempo, with its takes', () => {
    const run = usePracticeSessionRun(twoItems)

    expect(run.index.value).toBe(0)
    expect(run.current.value?.item_key).toBe(`play_along:${WARM_UP}`)
    expect(run.tempo.value).toBe(80)
    expect(run.takesLeft.value).toBe(2)
  })

  it('sends no practice.item_answered for a warm-up take and keeps its tempo', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()
    run.rate('struggled')

    expect(tracked('practice.item_answered')).toEqual([])
    expect(run.tempo.value).toBe(80)
    expect(run.takesLeft.value).toBe(1)
  })

  it('moves on after an item’s last take, to the next item’s start tempo and takes', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()
    run.rate('clean')
    run.rate('clean')

    expect(run.index.value).toBe(1)
    expect(run.tempo.value).toBe(60)
    expect(run.takesLeft.value).toBe(4)
  })

  it('sends a rated take as practice.item_answered at the take’s tempo', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()
    run.nextItem()
    run.rate('almost')

    expect(tracked('practice.item_answered')).toEqual([
      {
        event_type: 'practice.item_answered',
        practice_session_id: SESSION_ID,
        item_key: `play_along:${DUE}`,
        response: { response_type: 'self_rating', rating: 'almost', tempo_bpm: 60 },
      },
    ])
  })

  it('sets the next take’s tempo with the tempo ladder', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()
    run.nextItem()
    run.rate('clean')
    run.rate('clean')
    expect(run.tempo.value).toBe(65)

    run.rate('struggled')
    expect(run.tempo.value).toBe(60)
  })

  it('ends the session after the last item’s last take, as finished', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()
    run.nextItem()
    for (let i = 0; i < 4; i++) run.rate('clean')

    expect(run.finished.value).toBe(true)
    expect(run.current.value).toBeNull()
    expect(tracked('practice.session_ended')).toEqual([
      {
        event_type: 'practice.session_ended',
        practice_session_id: SESSION_ID,
        answered_count: 1,
        left_early: false,
        felt_ratings: [],
      },
    ])
  })

  it('counts answered items, not takes, and never a warm-up', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()
    run.rate('clean')
    run.rate('clean')
    run.rate('clean')
    run.end()

    expect(tracked('practice.session_ended')[0]).toMatchObject({ answered_count: 1 })
  })

  it('ends early as left early, once however often it is ended', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()
    run.end()
    run.end()

    expect(run.finished.value).toBe(true)
    expect(tracked('practice.session_ended')).toEqual([
      expect.objectContaining({ answered_count: 0, left_early: true }),
    ])
  })

  it('ends as finished when the student moves past the last item', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()
    run.nextItem()
    run.rate('clean')
    run.nextItem()

    expect(run.finished.value).toBe(true)
    expect(tracked('practice.session_ended')).toEqual([
      expect.objectContaining({ answered_count: 1, left_early: false }),
    ])
  })

  it('sends nothing before the session starts or after it ends', () => {
    const run = usePracticeSessionRun(twoItems)
    run.rate('clean')
    run.end()
    expect(track).not.toHaveBeenCalled()

    run.start()
    run.end()
    track.mockReset()
    run.rate('clean')
    run.nextItem()
    expect(track).not.toHaveBeenCalled()
  })

  it('plays the next take at a tempo the student sets, beyond the target too', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()
    run.nextItem()
    run.setTempo(130)

    expect(run.tempo.value).toBe(130)
    run.rate('clean')
    expect(tracked('practice.item_answered')[0].response.tempo_bpm).toBe(130)
    expect(run.tempo.value).toBe(130)
  })

  it('keeps a tempo the student sets between the ladder floor and the fastest playable tempo', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()
    run.nextItem()

    run.setTempo(10)
    expect(run.tempo.value).toBe(60)
    run.setTempo(999)
    expect(run.tempo.value).toBe(300)
  })

  it('lets a warm-up be played at another tempo too', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()
    run.setTempo(90)

    expect(run.tempo.value).toBe(90)
    run.rate('clean')
    expect(run.tempo.value).toBe(90)
  })

  it('starts the next item at its own start tempo, whatever was set before', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()
    run.setTempo(100)
    run.nextItem()

    expect(run.tempo.value).toBe(60)
  })
})

