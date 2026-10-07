import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const track = vi.fn()
vi.mock('@/shared/composables/useEventTracking', () => ({
  useEventTracking: () => ({ track }),
}))

const measureExerciseAudio = vi.fn()
vi.mock('@/shared/utils/exerciseAudio', () => ({
  measureExerciseAudio: (exercise: unknown) => measureExerciseAudio(exercise),
}))

import { usePracticeSessionRun } from '@/features/student/composables/usePracticeSessionRun'
import type { ShapeBoard } from '@/features/student/composables/usePracticeSessionRun'
import { plainTextPrompt } from '@/shared/testUtils/promptDocument'
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

function exerciseItem(exerciseId: string, reason: Item['reason'], fields: Partial<NonNullable<Item['exercise']>> = {}): Item {
  return {
    item_key: `exercise:${exerciseId}`,
    kind: 'exercise',
    reason,
    node_id: null,
    level: 'new',
    estimated_seconds: 30,
    exercise: {
      exercise_id: exerciseId,
      title: 'Name the interval',
      prompt: plainTextPrompt('Which interval is this?'),
      exercise_type: 'text_response',
      options: [
        { option_id: 'right', is_correct: true, label: 'Minor third' },
        { option_id: 'wrong', is_correct: false, label: 'Major third' },
      ],
      challenge_ids: [],
      content_node_ids: [],
      skills: [],
      concepts: [],
      remediation_targets: [],
      languages: [{ code: 'en', name: 'English' }],
      instrument_ids: [],
      created_at: '2026-10-06T00:00:00Z',
      ...fields,
    },
  }
}

const WARM_UP = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const DUE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function plan(items: Item[], instrumentId: string | null = GUITAR_ID, fields: Partial<Plan> = {}): Plan {
  return { practice_session_id: SESSION_ID, instrument_id: instrumentId, minutes: 10, items, felt_questions: [], tap_check_due: false, ...fields }
}

const twoItems = plan([
  playAlong(WARM_UP, 'warm_up', { start: 80, target: 120 }),
  playAlong(DUE, 'due', { start: 60, target: 100 }),
])

function tracked(eventType: string) {
  return track.mock.calls.map(([event]) => event).filter((event) => event.event_type === eventType)
}

describe('usePracticeSessionRun', () => {
  beforeEach(() => {
    track.mockReset()
    measureExerciseAudio.mockReset().mockResolvedValue(undefined)
  })

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

  it('is not started until start()', () => {
    const run = usePracticeSessionRun(twoItems)
    expect(run.started.value).toBe(false)

    run.start()
    expect(run.started.value).toBe(true)
  })

  it('hands over after a play-along’s last take: what was played, how fast, and what’s next', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()
    run.setTempo(95)
    run.rate('clean')
    run.rate('clean')

    expect(run.handoff.value).toEqual({ done: twoItems.items[0], fastestBpm: 95, next: twoItems.items[1] })
    expect(run.current.value).toBeNull()
    expect(run.index.value).toBe(0)
  })

  it('takes no rating while handing over', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()
    run.rate('clean')
    run.rate('clean')
    run.rate('clean')

    expect(tracked('practice.item_answered')).toEqual([])
  })

  it('never hands over after the last item, nor when an item is skipped', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()
    run.nextItem()
    expect(run.handoff.value).toBeNull()

    for (let i = 0; i < 4; i++) run.rate('clean')
    expect(run.handoff.value).toBeNull()
    expect(run.finished.value).toBe(true)
  })

  it('ends as left early when the student leaves while handing over', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()
    run.rate('clean')
    run.rate('clean')
    run.end()

    expect(tracked('practice.session_ended')).toEqual([expect.objectContaining({ left_early: true })])
  })

  it('moves on after an item’s last take and its handoff, to the next item’s start tempo and takes', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()
    run.rate('clean')
    run.rate('clean')
    run.continueToNext()

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
    run.continueToNext()
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

  it('ends with keepalive when asked, so the end outlives a closing page', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()
    run.end({ keepalive: true })

    const ended = track.mock.calls.filter(([event]) => event.event_type === 'practice.session_ended')
    expect(ended).toEqual([[expect.objectContaining({ left_early: true }), { keepalive: true }]])
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

  it('never lowers a tempo the student chose, after any rating', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()
    run.nextItem()
    run.setTempo(180)

    run.rate('struggled')
    expect(run.tempo.value).toBe(180)
    run.rate('struggled')
    expect(run.tempo.value).toBe(180)
    expect(tracked('practice.item_answered').map((event) => event.response.tempo_bpm)).toEqual([180, 180])
  })

  it('lets the student lower a tempo they chose, which the ladder then keeps', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()
    run.nextItem()
    run.setTempo(180)
    run.rate('clean')

    run.setTempo(150)
    run.rate('struggled')

    expect(run.tempo.value).toBe(150)
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

  it('says how far the session has come, item by item', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()
    expect(run.progress.value).toEqual([0, 0])

    run.rate('clean')
    expect(run.progress.value).toEqual([0.5, 0])

    run.rate('clean')
    expect(run.progress.value).toEqual([1, 0])
    run.continueToNext()
    run.rate('almost')
    expect(run.progress.value).toEqual([1, 0.25])

    run.end()
    expect(run.progress.value).toEqual([1, 0.25])
  })

  it('counts an item moved past as done', () => {
    const run = usePracticeSessionRun(twoItems)
    run.start()
    run.nextItem()

    expect(run.progress.value).toEqual([1, 0])
  })

  it('says how many takes the current item has, in all', () => {
    const run = usePracticeSessionRun(twoItems)
    expect(run.takesTotal.value).toBe(2)

    run.start()
    run.nextItem()
    expect(run.takesTotal.value).toBe(4)
  })

  describe('an exercise item', () => {
    const EXERCISE = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    const LISTENING = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
    const APPLY = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'

    const mixed = plan([
      exerciseItem(EXERCISE, 'due'),
      exerciseItem(LISTENING, 'new', { exercise_type: 'audio_recognition', audio_url: 'https://media.test/third.mp3' }),
      playAlong(APPLY, 'application', { start: 70, target: 90 }),
    ])

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-10-06T10:00:00Z'))
    })
    afterEach(() => vi.useRealTimers())

    it('sends the options chosen as practice.item_answered, timed from when the exercise was shown', () => {
      const run = usePracticeSessionRun(mixed)
      run.start()
      vi.advanceTimersByTime(4200)
      run.answer(['right'])

      expect(tracked('practice.item_answered')).toEqual([
        {
          event_type: 'practice.item_answered',
          practice_session_id: SESSION_ID,
          item_key: `exercise:${EXERCISE}`,
          response: { response_type: 'option_choice', option_ids: ['right'], latency_ms: 4200 },
        },
      ])
    })

    it('times a later exercise from when it was shown, not from the session’s start', () => {
      const run = usePracticeSessionRun(mixed)
      run.start()
      vi.advanceTimersByTime(5000)
      run.answer(['right'])
      vi.advanceTimersByTime(1500)
      run.nextItem()
      vi.advanceTimersByTime(3000)
      run.answer(['right'])

      expect(tracked('practice.item_answered')[1].response.latency_ms).toBe(3000)
    })

    it('says whether the answer was right, and stays on the exercise until the student moves on', () => {
      const run = usePracticeSessionRun(mixed)
      run.start()
      expect(run.exerciseAnswer.value).toBeNull()

      run.answer(['wrong'])
      expect(run.exerciseAnswer.value).toEqual({ optionIds: ['wrong'], correct: false })
      expect(run.index.value).toBe(0)
      expect(run.progress.value).toEqual([1, 0, 0])

      run.nextItem()
      expect(run.index.value).toBe(1)
      expect(run.exerciseAnswer.value).toBeNull()
    })

    it('takes only the first answer to an exercise', () => {
      const run = usePracticeSessionRun(mixed)
      run.start()
      run.answer(['wrong'])
      run.answer(['right'])

      expect(tracked('practice.item_answered')).toHaveLength(1)
      expect(run.exerciseAnswer.value).toEqual({ optionIds: ['wrong'], correct: false })
    })

    it('ignores an answer with no option chosen', () => {
      const run = usePracticeSessionRun(mixed)
      run.start()
      run.answer([])

      expect(tracked('practice.item_answered')).toEqual([])
      expect(run.exerciseAnswer.value).toBeNull()
    })

    it('ignores an answer while a play-along is on', () => {
      const run = usePracticeSessionRun(twoItems)
      run.start()
      run.answer(['right'])

      expect(tracked('practice.item_answered')).toEqual([])
    })

    it('sends the length of the audio to hear with an exercise that has audio', async () => {
      measureExerciseAudio.mockImplementation((exercise: { exercise_id: string }) =>
        Promise.resolve(exercise.exercise_id === LISTENING ? 2600 : undefined),
      )
      const run = usePracticeSessionRun(mixed)
      await vi.runAllTimersAsync()
      run.start()
      run.answer(['right'])
      run.nextItem()
      run.answer(['right'])

      const [first, second] = tracked('practice.item_answered')
      expect(first.response).not.toHaveProperty('audio_ms')
      expect(second.response).toMatchObject({ audio_ms: 2600 })
    })

    it('counts an answered exercise among the answered items', () => {
      const run = usePracticeSessionRun(mixed)
      run.start()
      run.answer(['right'])
      run.nextItem()
      run.answer(['wrong'])
      run.nextItem()
      run.rate('clean')
      run.end()

      expect(tracked('practice.session_ended')[0]).toMatchObject({ answered_count: 3 })
    })

    it('sends the application ending’s rated takes like any other', () => {
      const run = usePracticeSessionRun(mixed)
      run.start()
      run.nextItem()
      run.nextItem()
      run.rate('almost')

      expect(tracked('practice.item_answered')).toEqual([
        expect.objectContaining({
          item_key: `play_along:${APPLY}`,
          response: { response_type: 'self_rating', rating: 'almost', tempo_bpm: 70 },
        }),
      ])
    })

    it('ends as left early when the student leaves on an exercise before the last item', () => {
      const run = usePracticeSessionRun(mixed)
      run.start()
      run.answer(['right'])
      run.nextItem()
      run.end()

      expect(tracked('practice.session_ended')).toEqual([
        expect.objectContaining({ answered_count: 1, left_early: true }),
      ])
    })

    it('ends as finished, not left early, when the student moves past the last item', () => {
      const run = usePracticeSessionRun(mixed)
      run.start()
      run.nextItem()
      run.nextItem()
      run.nextItem()

      expect(tracked('practice.session_ended')).toEqual([expect.objectContaining({ left_early: false })])
    })

    it('has no tempo or takes for an exercise', () => {
      const run = usePracticeSessionRun(mixed)
      run.start()

      expect(run.tempo.value).toBeNull()
      expect(run.takesTotal.value).toBe(0)
    })
  })

  describe('diagram shapes', () => {
    const LAYOUT = '6ea2d087-ab9c-59dc-9657-8546025414d2'
    const CAGED_A = '928330d5-903e-572c-9d41-5fde99d51ed1'
    const MEMBERS = ['C', 'A', 'G', 'E', 'D']
    /** "C major — CAGED A, shift 3" on a six-string guitar. */
    const board: ShapeBoard = {
      stringCount: 6,
      positions: [
        { string: 5, fret: 3, interval: 'R' },
        { string: 4, fret: 5, interval: '5' },
        { string: 3, fret: 5, interval: 'R' },
        { string: 2, fret: 5, interval: '3' },
        { string: 1, fret: 3, interval: '5' },
      ],
    }

    function shape(drill: 'name_the_shape' | 'find_the_degree'): Item {
      const naming = drill === 'name_the_shape'
      return {
        item_key: `diagram_shape:${CAGED_A}`,
        kind: 'diagram_shape',
        reason: 'new',
        node_id: null,
        level: 'new',
        estimated_seconds: 10,
        diagram_shape: {
          diagram_id: CAGED_A,
          layout_instrument_id: LAYOUT,
          drill,
          shape_family: 'caged-grip',
          shape: 'A',
          options: naming ? MEMBERS.map((member) => ({ shape: member, name: `${member} shape` })) : [],
          asked_interval: naming ? null : '3',
        },
      }
    }

    const inTheHead = (fields: Partial<Plan> = {}) => plan([shape('name_the_shape'), shape('find_the_degree')], null, fields)

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-10-07T10:00:00Z'))
    })
    afterEach(() => vi.useRealTimers())

    it('sends the shape named as practice.item_answered, timed from when it was shown', () => {
      const run = usePracticeSessionRun(inTheHead())
      run.start()
      vi.advanceTimersByTime(2600)
      run.answerShape({ response_type: 'name_the_shape', shape: 'E' }, board)

      expect(tracked('practice.item_answered')).toEqual([
        {
          event_type: 'practice.item_answered',
          practice_session_id: SESSION_ID,
          item_key: `diagram_shape:${CAGED_A}`,
          response: { response_type: 'name_the_shape', shape: 'E', latency_ms: 2600 },
        },
      ])
      expect(run.shapeAnswer.value).toEqual({ answer: { response_type: 'name_the_shape', shape: 'E' }, correct: false })
      expect(run.progress.value).toEqual([1, 0])
    })

    it('sends the degree asked and the cell tapped, right on any of the shape’s positions of it', () => {
      const run = usePracticeSessionRun(inTheHead())
      run.start()
      run.answerShape({ response_type: 'name_the_shape', shape: 'A' }, board)
      expect(run.shapeAnswer.value?.correct).toBe(true)
      run.nextItem()
      vi.advanceTimersByTime(2400)
      run.answerShape({ response_type: 'find_the_degree', interval: '3', string: 2, fret: 5 }, board)

      expect(tracked('practice.item_answered')[1].response).toEqual({
        response_type: 'find_the_degree',
        interval: '3',
        string: 2,
        fret: 5,
        latency_ms: 2400,
      })
      expect(run.shapeAnswer.value?.correct).toBe(true)
    })

    it('takes only the first answer to a shape', () => {
      const run = usePracticeSessionRun(inTheHead())
      run.start()
      run.answerShape({ response_type: 'name_the_shape', shape: 'E' }, board)
      run.answerShape({ response_type: 'name_the_shape', shape: 'A' }, board)

      expect(tracked('practice.item_answered')).toHaveLength(1)
      expect(run.shapeAnswer.value?.correct).toBe(false)
    })

    it('takes no answer the shape’s drill doesn’t ask for, nor a degree other than the one asked', () => {
      const run = usePracticeSessionRun(inTheHead())
      run.start()
      run.answerShape({ response_type: 'find_the_degree', interval: '3', string: 2, fret: 5 }, board)
      run.answerShape({ response_type: 'name_the_shape', shape: 'A' }, board)
      run.nextItem()
      run.answerShape({ response_type: 'find_the_degree', interval: '5', string: 4, fret: 5 }, board)

      expect(tracked('practice.item_answered')).toHaveLength(1)
      expect(run.shapeAnswer.value).toBeNull()
    })

    it('takes no answer that isn’t one to the shape: a member its family lacks, or a tap off the instrument', () => {
      const run = usePracticeSessionRun(inTheHead())
      run.start()
      run.answerShape({ response_type: 'name_the_shape', shape: '3' }, board)
      expect(run.shapeAnswer.value).toBeNull()
      run.answerShape({ response_type: 'name_the_shape', shape: 'A' }, board)
      run.nextItem()
      run.answerShape({ response_type: 'find_the_degree', interval: '3', string: 7, fret: 5 }, board)

      expect(tracked('practice.item_answered')).toHaveLength(1)
      expect(run.shapeAnswer.value).toBeNull()
    })

    it('asks how each shape drill practised felt', () => {
      const run = usePracticeSessionRun(
        inTheHead({ felt_questions: ['diagram_shape:name_the_shape', 'diagram_shape:find_the_degree', 'fretboard_cell:name_the_note'] }),
      )
      run.start()
      run.answerShape({ response_type: 'name_the_shape', shape: 'A' }, board)
      run.nextItem()
      run.answerShape({ response_type: 'find_the_degree', interval: '3', string: 2, fret: 5 }, board)
      run.nextItem()

      expect(run.feltQuestions.value).toEqual(['diagram_shape:name_the_shape', 'diagram_shape:find_the_degree'])
    })
  })

  describe('fretboard cells', () => {
    const LAYOUT = '6ea2d087-ab9c-59dc-9657-8546025414d2'
    const STANDARD = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
    const tuningOf = (instrumentId: string) => (instrumentId === LAYOUT ? STANDARD : undefined)

    function cell(string: number, fret: number, drill: 'name_the_note' | 'find_the_note'): Item {
      return {
        item_key: `fretboard_cell:${LAYOUT}:${string}:${fret}`,
        kind: 'fretboard_cell',
        reason: 'new',
        node_id: null,
        level: 'new',
        estimated_seconds: 8,
        fretboard_cell: { layout_instrument_id: LAYOUT, string, fret, drill },
      }
    }

    const inTheHead = (fields: Partial<Plan> = {}) => plan([cell(5, 3, 'name_the_note'), cell(6, 1, 'find_the_note')], null, fields)

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-10-06T10:00:00Z'))
    })
    afterEach(() => vi.useRealTimers())

    it('sends the note named as practice.item_answered, timed from when the cell was shown', () => {
      const run = usePracticeSessionRun(inTheHead(), { tuningOf })
      run.start()
      vi.advanceTimersByTime(1800)
      run.answerCell({ response_type: 'name_the_note', note_name: 'C' })

      expect(tracked('practice.item_answered')).toEqual([
        {
          event_type: 'practice.item_answered',
          practice_session_id: SESSION_ID,
          item_key: `fretboard_cell:${LAYOUT}:5:3`,
          response: { response_type: 'name_the_note', note_name: 'C', latency_ms: 1800 },
        },
      ])
      expect(run.cellAnswer.value).toEqual({ answer: { response_type: 'name_the_note', note_name: 'C' }, correct: true })
      expect(run.progress.value).toEqual([1, 0])
    })

    it('sends the cell tapped to find the note, and says when it is wrong', () => {
      const run = usePracticeSessionRun(inTheHead(), { tuningOf })
      run.start()
      run.answerCell({ response_type: 'name_the_note', note_name: 'C' })
      run.nextItem()
      vi.advanceTimersByTime(1500)
      run.answerCell({ response_type: 'find_the_note', string: 6, fret: 2 })

      expect(tracked('practice.item_answered')[1].response).toEqual({ response_type: 'find_the_note', string: 6, fret: 2, latency_ms: 1500 })
      expect(run.cellAnswer.value?.correct).toBe(false)
    })

    it('takes only the first answer to a cell', () => {
      const run = usePracticeSessionRun(inTheHead(), { tuningOf })
      run.start()
      run.answerCell({ response_type: 'name_the_note', note_name: 'D' })
      run.answerCell({ response_type: 'name_the_note', note_name: 'C' })

      expect(tracked('practice.item_answered')).toHaveLength(1)
      expect(run.cellAnswer.value?.correct).toBe(false)
    })

    it('takes no answer the cell’s drill doesn’t ask for', () => {
      const run = usePracticeSessionRun(inTheHead(), { tuningOf })
      run.start()
      run.answerCell({ response_type: 'find_the_note', string: 5, fret: 3 })

      expect(tracked('practice.item_answered')).toEqual([])
      expect(run.cellAnswer.value).toBeNull()
    })

    it('takes no answer to a cell whose instrument’s tuning isn’t known', () => {
      const run = usePracticeSessionRun(inTheHead())
      run.start()
      run.answerCell({ response_type: 'name_the_note', note_name: 'C' })

      expect(tracked('practice.item_answered')).toEqual([])
    })

    describe('tap check', () => {
      it('is pending before the first item when the plan asks for one', () => {
        expect(usePracticeSessionRun(inTheHead({ tap_check_due: true }), { tuningOf }).tapCheckPending.value).toBe(true)
        expect(usePracticeSessionRun(inTheHead(), { tuningOf }).tapCheckPending.value).toBe(false)
      })

      it('sends a completed tap check with its median and its number of taps', () => {
        const run = usePracticeSessionRun(inTheHead({ tap_check_due: true }), { tuningOf })
        run.start()
        run.completeTapCheck({ medianMs: 320, count: 24 })

        expect(tracked('practice.tap_check_completed')).toEqual([
          { event_type: 'practice.tap_check_completed', median_tap_ms: 320, tap_count: 24 },
        ])
        expect(run.tapCheckPending.value).toBe(false)
      })

      it('sends nothing for a skipped tap check, and goes on to the first item', () => {
        const run = usePracticeSessionRun(inTheHead({ tap_check_due: true }), { tuningOf })
        run.start()
        run.skipTapCheck()

        expect(tracked('practice.tap_check_completed')).toEqual([])
        expect(run.tapCheckPending.value).toBe(false)
        expect(run.current.value?.item_key).toBe(`fretboard_cell:${LAYOUT}:5:3`)
      })

      it('times the first item from the end of the tap check', () => {
        const run = usePracticeSessionRun(inTheHead({ tap_check_due: true }), { tuningOf })
        run.start()
        vi.advanceTimersByTime(20000)
        run.completeTapCheck({ medianMs: 320, count: 24 })
        vi.advanceTimersByTime(1200)
        run.answerCell({ response_type: 'name_the_note', note_name: 'C' })

        expect(tracked('practice.item_answered')[0].response.latency_ms).toBe(1200)
      })

      it('takes no answer while the tap check is pending', () => {
        const run = usePracticeSessionRun(inTheHead({ tap_check_due: true }), { tuningOf })
        run.start()
        run.answerCell({ response_type: 'name_the_note', note_name: 'C' })

        expect(tracked('practice.item_answered')).toEqual([])
      })
    })

    describe('felt questions', () => {
      const asking = { felt_questions: ['fretboard_cell:find_the_note', 'fretboard_cell:name_the_note'] }

      function practiseBoth(run: ReturnType<typeof usePracticeSessionRun>) {
        run.start()
        run.answerCell({ response_type: 'name_the_note', note_name: 'C' })
        run.nextItem()
        run.answerCell({ response_type: 'find_the_note', string: 6, fret: 1 })
        run.nextItem()
      }

      it('asks after the last item how the drills practised felt, before the session ends', () => {
        const run = usePracticeSessionRun(inTheHead(asking), { tuningOf })
        practiseBoth(run)

        expect(run.askingFelt.value).toBe(true)
        expect(run.feltQuestions.value).toEqual(['fretboard_cell:find_the_note', 'fretboard_cell:name_the_note'])
        expect(run.finished.value).toBe(false)
        expect(run.current.value).toBeNull()
        expect(tracked('practice.session_ended')).toEqual([])
      })

      it('asks only about the drills the student practised', () => {
        const run = usePracticeSessionRun(inTheHead(asking), { tuningOf })
        run.start()
        run.answerCell({ response_type: 'name_the_note', note_name: 'C' })
        run.nextItem()
        run.nextItem()

        expect(run.feltQuestions.value).toEqual(['fretboard_cell:name_the_note'])
      })

      it('asks about an exercise’s type once one was answered', () => {
        const withExercise = plan([exerciseItem('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'due')], null, { felt_questions: ['exercise:text_response'] })
        const run = usePracticeSessionRun(withExercise)
        run.start()
        run.answer(['right'])
        run.nextItem()

        expect(run.feltQuestions.value).toEqual(['exercise:text_response'])
      })

      it('ends as finished with no question when no drill asked about was practised', () => {
        const run = usePracticeSessionRun(inTheHead(asking), { tuningOf })
        run.start()
        run.nextItem()
        run.nextItem()

        expect(run.askingFelt.value).toBe(false)
        expect(tracked('practice.session_ended')).toEqual([expect.objectContaining({ left_early: false, felt_ratings: [] })])
      })

      it('ends the session with the ratings once every question is answered', () => {
        const run = usePracticeSessionRun(inTheHead(asking), { tuningOf })
        practiseBoth(run)
        run.rateFelt('fretboard_cell:find_the_note', 'hard')
        expect(tracked('practice.session_ended')).toEqual([])

        run.rateFelt('fretboard_cell:name_the_note', 'easy')

        expect(run.finished.value).toBe(true)
        expect(tracked('practice.session_ended')).toEqual([
          {
            event_type: 'practice.session_ended',
            practice_session_id: SESSION_ID,
            answered_count: 2,
            left_early: false,
            felt_ratings: [
              { drill_template_key: 'fretboard_cell:find_the_note', felt: 'hard' },
              { drill_template_key: 'fretboard_cell:name_the_note', felt: 'easy' },
            ],
          },
        ])
      })

      it('ends the session as soon as its only question is answered', () => {
        const run = usePracticeSessionRun(inTheHead({ felt_questions: ['fretboard_cell:name_the_note'] }), { tuningOf })
        run.start()
        run.answerCell({ response_type: 'name_the_note', note_name: 'C' })
        run.nextItem()
        run.nextItem()
        run.rateFelt('fretboard_cell:name_the_note', 'about_right')

        expect(tracked('practice.session_ended')[0].felt_ratings).toEqual([{ drill_template_key: 'fretboard_cell:name_the_note', felt: 'about_right' }])
      })

      it('ignores a rating for a drill it didn’t ask about', () => {
        const run = usePracticeSessionRun(inTheHead(asking), { tuningOf })
        practiseBoth(run)
        run.rateFelt('exercise:text_response', 'easy')

        expect(run.finished.value).toBe(false)
      })

      it('ends the session with the ratings given so far when the questions are skipped', () => {
        const run = usePracticeSessionRun(inTheHead(asking), { tuningOf })
        practiseBoth(run)
        run.rateFelt('fretboard_cell:find_the_note', 'hard')
        run.skipFelt()

        expect(tracked('practice.session_ended')).toEqual([
          expect.objectContaining({ left_early: false, felt_ratings: [{ drill_template_key: 'fretboard_cell:find_the_note', felt: 'hard' }] }),
        ])
      })

      it('ends as finished, not left early, when the student leaves during the questions', () => {
        const run = usePracticeSessionRun(inTheHead(asking), { tuningOf })
        practiseBoth(run)
        run.end({ keepalive: true })

        expect(tracked('practice.session_ended')).toEqual([expect.objectContaining({ left_early: false, felt_ratings: [] })])
        expect(track.mock.calls.at(-1)?.[1]).toEqual({ keepalive: true })
      })

      it('never asks when the session is left early', () => {
        const run = usePracticeSessionRun(inTheHead(asking), { tuningOf })
        run.start()
        run.answerCell({ response_type: 'name_the_note', note_name: 'C' })
        run.end()

        expect(run.askingFelt.value).toBe(false)
        expect(tracked('practice.session_ended')).toEqual([expect.objectContaining({ left_early: true, felt_ratings: [] })])
      })
    })
  })
})
