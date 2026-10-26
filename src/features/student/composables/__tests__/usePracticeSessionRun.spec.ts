import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const track = vi.fn()
vi.mock('@/shared/composables/useEventTracking', () => ({
  useEventTracking: () => ({ track }),
}))

const measureExerciseAudio = vi.fn()
vi.mock('@/shared/utils/exerciseAudio', () => ({
  measureExerciseAudio: (exercise: unknown, loadDiagram: unknown) => measureExerciseAudio(exercise, loadDiagram),
}))

const fetchDiagram = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({ useApi: () => ({ coreApi: { name: 'core' }, eventApi: {} }) }))
vi.mock('@/shared/composables/useEmbeddedDiagram', () => ({
  fetchDiagram: (coreApi: unknown, diagramId: string) => fetchDiagram(coreApi, diagramId),
}))

import { EVERY_THIRD_AT_60, guideToneItem } from '@/features/student/testing/guideToneItems'
import { songItem } from '@/features/student/testing/songItems'
import { usePracticeSessionRun } from '@/features/student/composables/usePracticeSessionRun'
import type { ShapeBoard } from '@/features/student/composables/usePracticeSessionRun'
import { plainTextPrompt } from '@/shared/testUtils/promptDocument'
import type { components } from '@/api/generated/core-domain'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'

type Plan = components['schemas']['PracticeSessionPlan']
type Item = components['schemas']['PracticeSessionItem']

const SESSION_ID = '11111111-1111-4111-8111-111111111111'
const GUITAR_ID = '22222222-2222-4222-8222-222222222222'

function playAlong(
  diagramId: string,
  reason: Item['reason'],
  tempos: { start: number; target: number; noteValue?: TempoNoteValue },
): Item {
  return {
    item_key: `play_along:${diagramId}`,
    kind: 'play_along',
    rung: 'play_in_time',
    reason,
    node_id: null,
    level: 'learning',
    estimated_seconds: 60,
    play_along: {
      diagram_id: diagramId,
      start_tempo_bpm: tempos.start,
      start_note_value: tempos.noteValue ?? 'quarters',
      target_tempo_bpm: tempos.target,
      best_clean_tempo_bpm: null,
      best_clean_note_value: null,
    },
  }
}

function exerciseItem(exerciseId: string, reason: Item['reason'], fields: Partial<NonNullable<Item['exercise']>> = {}): Item {
  return {
    item_key: `exercise:${exerciseId}`,
    kind: 'exercise',
    rung: 'know',
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
      updated_at: '2026-10-06T00:00:00Z',
      ...fields,
    },
  }
}

const WARM_UP = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const DUE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function plan(items: Item[], instrumentId: string | null = GUITAR_ID, fields: Partial<Plan> = {}): Plan {
  return { practice_session_id: SESSION_ID, instrument_id: instrumentId, minutes: 10, focus_source: 'suggested', focus_nodes: [], items, felt_questions: [], tap_check_due: false, ...fields }
}

const twoItems = plan([
  playAlong(WARM_UP, 'warm_up', { start: 80, target: 120 }),
  playAlong(DUE, 'due', { start: 60, target: 100 }),
])

const AM = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const C_OPEN = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const BASS_ID = '33333333-3333-4333-8333-333333333333'

function minute(fields: Partial<NonNullable<Item['chord_change']>['minute']> = {}): NonNullable<Item['chord_change']>['minute'] {
  return { start_tempo_bpm: 45, target_changes_per_minute: 60, best_clean_changes_per_minute: null, last_changes_per_minute: null, ...fields }
}

function chordVoicingItem(diagramId: string, symbol: string): Item {
  return {
    item_key: `chord_voicing:${diagramId}`,
    kind: 'chord_voicing',
    rung: 'play_clean',
    reason: 'new',
    node_id: null,
    level: 'new',
    estimated_seconds: 20,
    chord_voicing: { diagram_id: diagramId, chord_symbol: symbol },
  }
}

function chordChangeItem(fields: Partial<NonNullable<Item['chord_change']>['minute']> = {}): Item {
  return {
    item_key: `chord_change:${AM}:${C_OPEN}`,
    kind: 'chord_change',
    rung: 'play_in_time',
    reason: 'new',
    node_id: null,
    level: 'new',
    estimated_seconds: 90,
    chord_change: { from_diagram_id: AM, to_diagram_id: C_OPEN, from_chord_symbol: 'Am', to_chord_symbol: 'C', minute: minute(fields) },
  }
}

function rootFifthItem(): Item {
  return {
    item_key: `root_fifth:${BASS_ID}:Am`,
    kind: 'root_fifth',
    rung: 'play_clean',
    reason: 'new',
    node_id: null,
    level: 'new',
    estimated_seconds: 20,
    root_fifth: { layout_instrument_id: BASS_ID, chord_symbol: 'Am', root: { string: 3, fret: 0 }, fifth: { string: 2, fret: 2 } },
  }
}

function rootChangeItem(): Item {
  return {
    item_key: `root_change:${BASS_ID}:Am:C`,
    kind: 'root_change',
    rung: 'play_in_time',
    reason: 'new',
    node_id: null,
    level: 'new',
    estimated_seconds: 90,
    root_change: {
      layout_instrument_id: BASS_ID,
      from_chord_symbol: 'Am',
      to_chord_symbol: 'C',
      from_root: { string: 3, fret: 0 },
      to_root: { string: 3, fret: 3 },
      minute: minute(),
    },
  }
}

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

    expect(run.handoff.value).toEqual({ done: twoItems.items[0], fastestBpm: 95, fastestNoteValue: 'quarters', next: twoItems.items[1] })
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
        response: { response_type: 'self_rating', rating: 'almost', tempo_bpm: 60, note_value: 'quarters' },
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

  describe('note values', () => {
    const PENTATONIC = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

    /** A session of the play-along "pentatonic-run" with a target of 120 BPM, on its first take. */
    function pentatonicRun(start: number, noteValue: TempoNoteValue = 'quarters') {
      const run = usePracticeSessionRun(plan([playAlong(PENTATONIC, 'due', { start, target: 120, noteValue })]))
      run.start()
      return run
    }

    it('starts a play-along at its start tempo, in its start note value', () => {
      const run = pentatonicRun(50, 'eighths')

      expect(run.tempo.value).toBe(50)
      expect(run.noteValue.value).toBe('eighths')
    })

    it('plays in quarters when the plan says no note value, as one from before note values does', () => {
      const older = playAlong(PENTATONIC, 'due', { start: 90, target: 120 })
      Reflect.deleteProperty(older.play_along!, 'start_note_value')
      const run = usePracticeSessionRun(plan([older]))
      run.start()

      expect(run.noteValue.value).toBe('quarters')
      expect(run.tempo.value).toBe(90)
    })

    it('keeps the effective speed in another note value: 80 BPM is 40 in eighths', () => {
      const run = pentatonicRun(80)

      run.setNoteValue('eighths')

      expect(run.tempo.value).toBe(40)
      expect(run.noteValue.value).toBe('eighths')
    })

    it('rounds the tempo down to the 5 BPM grid in another note value: 155 BPM is 50 in triplets', () => {
      const run = pentatonicRun(90)
      run.setTempo(155)

      run.setNoteValue('triplets')

      expect(run.tempo.value).toBe(50)
    })

    it('sends a rated take with the note value it was played at', () => {
      const run = pentatonicRun(120)
      run.setNoteValue('eighths')

      run.rate('clean')

      expect(tracked('practice.item_answered')[0].response).toEqual({
        response_type: 'self_rating',
        rating: 'clean',
        tempo_bpm: 60,
        note_value: 'eighths',
      })
    })

    it('steps the ladder within the note value of the takes', () => {
      const run = pentatonicRun(50, 'eighths')

      run.rate('clean')
      run.rate('clean')

      expect(run.tempo.value).toBe(55)
      expect(run.noteValue.value).toBe('eighths')
    })

    it('compares the target at effective speed', () => {
      const run = pentatonicRun(60, 'eighths')

      run.rate('clean')
      run.rate('clean')

      expect(run.tempo.value).toBe(60)
    })

    it('keeps a tempo the student sets above the ladder floor in the note value', () => {
      const run = pentatonicRun(50, 'eighths')

      run.setTempo(10)

      // The floor is 70 BPM in quarters: 35 in eighths.
      expect(run.tempo.value).toBe(35)
    })

    it('starts the next item in its own note value, whatever was chosen before', () => {
      const run = usePracticeSessionRun(
        plan([playAlong(WARM_UP, 'due', { start: 80, target: 120 }), playAlong(DUE, 'due', { start: 30, target: 120, noteValue: 'triplets' })]),
      )
      run.start()
      run.setNoteValue('sixteenths')

      run.nextItem()

      expect(run.noteValue.value).toBe('triplets')
      expect(run.tempo.value).toBe(30)
    })

    it('keeps a warm-up in the note value of its last take', () => {
      const run = usePracticeSessionRun(twoItems)
      run.start()
      run.setNoteValue('eighths')
      run.rate('clean')

      expect(run.noteValue.value).toBe('eighths')
      expect(run.tempo.value).toBe(40)
    })
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

    it('measures a sound played from a diagram with the diagram as core has it', async () => {
      const diagram = { diagram_id: 'a-minor' }
      fetchDiagram.mockResolvedValue(diagram)
      usePracticeSessionRun(mixed)

      const loadDiagram = measureExerciseAudio.mock.calls[0]![1] as (id: string) => Promise<unknown>
      await expect(loadDiagram('a-minor')).resolves.toBe(diagram)
      expect(fetchDiagram).toHaveBeenCalledWith({ name: 'core' }, 'a-minor')
    })

    describe('with sound options', () => {
      const SOUNDS = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
      const soundChoice = plan([
        exerciseItem(SOUNDS, 'new', {
          exercise_type: 'audio_selection',
          options: [
            { option_id: 'right', is_correct: true, label: 'A', audio_url: 'https://media.test/a.mp3' },
            { option_id: 'wrong', is_correct: false, label: 'B', audio_url: 'https://media.test/b.mp3' },
          ],
        }),
      ])

      it('times the answer from the end of the last clip played, with no audio length', async () => {
        measureExerciseAudio.mockResolvedValue(1500)
        const run = usePracticeSessionRun(soundChoice)
        await vi.runAllTimersAsync()
        run.start()
        vi.advanceTimersByTime(2000)
        run.clipPlaying(true)
        vi.advanceTimersByTime(6000)
        run.clipPlaying(false)
        vi.advanceTimersByTime(3000)
        run.answer(['right'])

        const [answered] = tracked('practice.item_answered')
        expect(answered.response).toEqual({ response_type: 'option_choice', option_ids: ['right'], latency_ms: 3000 })
      })

      it('times the answer as 0 when a clip is still playing at Check', () => {
        const run = usePracticeSessionRun(soundChoice)
        run.start()
        vi.advanceTimersByTime(2000)
        run.clipPlaying(true)
        vi.advanceTimersByTime(1000)
        run.answer(['right'])

        expect(tracked('practice.item_answered')[0].response).toMatchObject({ latency_ms: 0 })
      })

      it('times the answer from when the exercise was shown when no clip was played', () => {
        const run = usePracticeSessionRun(soundChoice)
        run.start()
        vi.advanceTimersByTime(5000)
        run.answer(['right'])

        expect(tracked('practice.item_answered')[0].response).toMatchObject({ latency_ms: 5000 })
      })
    })

    it('times an exercise without sound options from when it was shown, whatever clips played', () => {
      const run = usePracticeSessionRun(mixed)
      run.start()
      vi.advanceTimersByTime(1000)
      run.clipPlaying(true)
      vi.advanceTimersByTime(1000)
      run.clipPlaying(false)
      vi.advanceTimersByTime(1000)
      run.answer(['right'])

      expect(tracked('practice.item_answered')[0].response).toMatchObject({ latency_ms: 3000 })
    })

    describe('skipping an item that can’t be answered', () => {
      it('sends it as not answered, with why, and moves on', () => {
        const run = usePracticeSessionRun(mixed)
        run.start()
        run.nextItem()
        run.skip('failed_to_load')

        expect(tracked('practice.item_answered')).toEqual([
          {
            event_type: 'practice.item_answered',
            practice_session_id: SESSION_ID,
            item_key: `exercise:${LISTENING}`,
            response: { response_type: 'not_answered', reason: 'failed_to_load' },
          },
        ])
        expect(run.current.value?.item_key).toBe(`play_along:${APPLY}`)
      })

      it('sends an item that can’t be shown here as unavailable', () => {
        const run = usePracticeSessionRun(mixed)
        run.start()
        run.skip('unavailable')

        expect(tracked('practice.item_answered')[0].response).toEqual({ response_type: 'not_answered', reason: 'unavailable' })
      })

      it('leaves it out of the answered count', () => {
        const run = usePracticeSessionRun(mixed)
        run.start()
        run.answer(['right'])
        run.nextItem()
        run.skip('failed_to_load')
        run.rate('clean')
        run.end()

        expect(tracked('practice.session_ended')[0]).toMatchObject({ answered_count: 2 })
      })

      it('takes no skip once the item is answered', () => {
        const run = usePracticeSessionRun(mixed)
        run.start()
        run.answer(['right'])
        run.skip('failed_to_load')

        expect(tracked('practice.item_answered')).toHaveLength(1)
        expect(run.current.value?.item_key).toBe(`exercise:${EXERCISE}`)
      })

      it('finishes the session when the last item is skipped', () => {
        const run = usePracticeSessionRun(plan([exerciseItem(EXERCISE, 'due')]))
        run.start()
        run.skip('unavailable')

        expect(tracked('practice.session_ended')).toEqual([expect.objectContaining({ answered_count: 0, left_early: false })])
      })
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
          response: { response_type: 'self_rating', rating: 'almost', tempo_bpm: 70, note_value: 'quarters' },
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
        rung: 'know',
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

  describe('harmony questions', () => {
    const BLANK = { numeral: null, chord: null, function: null, progression: null, chart: [], drawn_as: 'chord_symbols' as const, voicings: [] }
    const opts = (...values: string[]) => values.map((value) => ({ value, name: null, chart: [] }))

    const numeral: Item = {
      item_key: 'diatonic_chord:G:vi',
      kind: 'diatonic_chord',
      rung: 'know',
      reason: 'new',
      node_id: null,
      level: 'new',
      estimated_seconds: 8,
      generated_choice: { ...BLANK, way: 'numeral_to_chord', music_key: 'G', numeral: 'vi', options: opts('Em', 'D', 'F#dim', 'C') },
    }
    const chart: Item = {
      item_key: 'chart_progression:I-V-vi-IV',
      kind: 'chart_progression',
      rung: 'know',
      reason: 'due',
      node_id: null,
      level: 'learning',
      estimated_seconds: 12,
      generated_choice: { ...BLANK, way: 'chart_to_numbers', music_key: 'C', chart: ['C', 'G', 'Am', 'F'], options: opts('I-V-vi-IV', 'I-vi-IV-V') },
    }
    const CATALOG = { 'I-V-vi-IV': { bars: ['I', 'V', 'vi', 'IV'] }, 'I-vi-IV-V': { bars: ['I', 'vi', 'IV', 'V'] } }
    const numeralGrading = { question: { way: 'numeral_to_chord' as const, key: 'G', numeral: 'vi' }, catalog: {} }
    const chartGrading = { question: { way: 'chart_to_numbers' as const, key: 'C', progression: 'I-V-vi-IV' }, catalog: CATALOG }

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-10-15T10:00:00Z'))
    })
    afterEach(() => vi.useRealTimers())

    it('sends the chord picked with the way it was asked and the options as shown, timed from when it was shown', () => {
      const run = usePracticeSessionRun(plan([numeral, chart], null))
      run.start()
      vi.advanceTimersByTime(3100)
      run.answerGenerated({ way: 'numeral_to_chord', options: ['Em', 'D', 'F#dim', 'C'], choice: 'D' }, numeralGrading)

      expect(tracked('practice.item_answered')).toEqual([
        {
          event_type: 'practice.item_answered',
          practice_session_id: SESSION_ID,
          item_key: 'diatonic_chord:G:vi',
          response: { response_type: 'generated_choice', way: 'numeral_to_chord', options: ['Em', 'D', 'F#dim', 'C'], choice: 'D', latency_ms: 3100 },
        },
      ])
      expect(run.generatedAnswer.value).toEqual({ choice: 'D', right: 'Em', correct: false })
      expect(run.progress.value).toEqual([1, 0])
    })

    it('sends the key a chart was asked in, which its item does not fix', () => {
      const run = usePracticeSessionRun(plan([chart], null))
      run.start()
      run.answerGenerated({ way: 'chart_to_numbers', options: ['I-V-vi-IV', 'I-vi-IV-V'], choice: 'I-V-vi-IV' }, chartGrading)

      expect(tracked('practice.item_answered')[0].response).toEqual({
        response_type: 'generated_choice',
        way: 'chart_to_numbers',
        music_key: 'C',
        options: ['I-V-vi-IV', 'I-vi-IV-V'],
        choice: 'I-V-vi-IV',
        latency_ms: 0,
      })
      expect(run.generatedAnswer.value?.correct).toBe(true)
    })

    it('takes only the first answer, and none asked another way or among options the grader rejects', () => {
      const run = usePracticeSessionRun(plan([numeral], null))
      run.start()
      run.answerGenerated({ way: 'chord_to_numeral', options: ['vi', 'V', 'IV', 'ii'], choice: 'vi' }, numeralGrading)
      run.answerGenerated({ way: 'numeral_to_chord', options: ['Em', 'Em7', 'D', 'C'], choice: 'Em' }, numeralGrading)
      expect(run.generatedAnswer.value).toBeNull()

      run.answerGenerated({ way: 'numeral_to_chord', options: ['Em', 'D', 'F#dim', 'C'], choice: 'Em' }, numeralGrading)
      run.answerGenerated({ way: 'numeral_to_chord', options: ['Em', 'D', 'F#dim', 'C'], choice: 'D' }, numeralGrading)

      expect(tracked('practice.item_answered')).toHaveLength(1)
      expect(run.generatedAnswer.value).toEqual({ choice: 'Em', right: 'Em', correct: true })
    })

    describe('asked by ear', () => {
      const playback = {
        tempo_bpm: 70,
        bass_line: false,
        bass_instrument_id: null,
        bars: [
          { chord: 'G', numeral: 'I' as const },
          { chord: 'Em', numeral: null },
        ],
      }
      const heard: Item = {
        item_key: 'heard_chord:vi',
        kind: 'heard_chord',
        rung: 'hear',
        reason: 'new',
        node_id: null,
        level: 'accurate',
        estimated_seconds: 20,
        generated_choice: { ...BLANK, way: 'cadence_then_chord', music_key: 'G', playback, options: opts('ii', 'IV', 'V', 'vi') },
      }
      const heardGrading = { question: { way: 'cadence_then_chord' as const, key: 'G', numeral: 'vi' }, catalog: {} }
      const answer = { way: 'cadence_then_chord' as const, options: ['ii', 'IV', 'V', 'vi'], choice: 'vi', audioMs: 6000 }

      it('times the answer from when its sound first started, and sends how long it played and the key it was asked in', () => {
        const run = usePracticeSessionRun(plan([heard], null))
        run.start()
        vi.advanceTimersByTime(2000)
        run.clipPlaying(true)
        vi.advanceTimersByTime(6000)
        run.clipPlaying(false)
        vi.advanceTimersByTime(1000)
        // A replay is still listening: the time runs on from the first play.
        run.clipPlaying(true)
        vi.advanceTimersByTime(500)
        run.answerGenerated(answer, heardGrading)

        expect(tracked('practice.item_answered')[0].response).toEqual({
          response_type: 'generated_choice',
          way: 'cadence_then_chord',
          music_key: 'G',
          options: ['ii', 'IV', 'V', 'vi'],
          choice: 'vi',
          latency_ms: 7500,
          audio_ms: 6000,
        })
        expect(run.generatedAnswer.value).toEqual({ choice: 'vi', right: 'vi', correct: true })
      })

      it('times the next heard question from its own sound', () => {
        const run = usePracticeSessionRun(plan([heard, { ...heard, item_key: 'heard_chord:IV' }], null))
        run.start()
        run.clipPlaying(true)
        run.clipPlaying(false)
        run.answerGenerated(answer, heardGrading)
        run.nextItem()
        vi.advanceTimersByTime(3000)
        run.clipPlaying(true)
        vi.advanceTimersByTime(1200)
        run.answerGenerated({ ...answer, choice: 'IV' }, { ...heardGrading, question: { ...heardGrading.question, numeral: 'IV' } })

        expect(tracked('practice.item_answered')[1].response.latency_ms).toBe(1200)
      })

      it('sends the key of a heard chord asked by sight', () => {
        const seen: Item = { ...heard, generated_choice: { ...BLANK, way: 'see_then_name', music_key: 'G', chord: 'Em', options: opts('vi', 'IV', 'iii', 'ii') } }
        const run = usePracticeSessionRun(plan([seen], null))
        run.start()
        vi.advanceTimersByTime(1500)
        run.answerGenerated({ way: 'see_then_name', options: ['vi', 'IV', 'iii', 'ii'], choice: 'vi' }, { question: { way: 'see_then_name', key: 'G', numeral: 'vi' }, catalog: {} })

        expect(tracked('practice.item_answered')[0].response).toEqual({
          response_type: 'generated_choice',
          way: 'see_then_name',
          music_key: 'G',
          options: ['vi', 'IV', 'iii', 'ii'],
          choice: 'vi',
          latency_ms: 1500,
        })
      })

      it('counts an item asked again later as answered each time, each with its own result', () => {
        const run = usePracticeSessionRun(plan([heard, numeral, heard], null))
        run.start()
        run.answerGenerated({ ...answer, choice: 'IV' }, heardGrading)
        run.nextItem()
        run.answerGenerated({ way: 'numeral_to_chord', options: ['Em', 'D', 'F#dim', 'C'], choice: 'Em' }, numeralGrading)
        run.nextItem()
        expect(run.generatedAnswer.value).toBeNull()
        run.answerGenerated(answer, heardGrading)

        expect(run.answeredCount.value).toBe(3)
        expect(run.outcomes.value.get(0)).toEqual({ kind: 'answered', correct: false })
        expect(run.outcomes.value.get(2)).toEqual({ kind: 'answered', correct: true })
      })
    })

    it('asks how each harmony way practised felt, and forgets the answer on the next item', () => {
      const run = usePracticeSessionRun(plan([numeral, chart], null, { felt_questions: ['chart_progression:chart_to_numbers', 'diatonic_chord:numeral_to_chord'] }))
      run.start()
      run.answerGenerated({ way: 'numeral_to_chord', options: ['Em', 'D', 'F#dim', 'C'], choice: 'Em' }, numeralGrading)
      run.nextItem()
      expect(run.generatedAnswer.value).toBeNull()
      run.answerGenerated({ way: 'chart_to_numbers', options: ['I-V-vi-IV', 'I-vi-IV-V'], choice: 'I-vi-IV-V' }, chartGrading)
      run.nextItem()

      expect(run.feltQuestions.value).toEqual(['chart_progression:chart_to_numbers', 'diatonic_chord:numeral_to_chord'])
      expect(run.outcomes.value.get(1)).toEqual({ kind: 'answered', correct: false })
    })
  })

  describe('fretboard cells', () => {
    const LAYOUT = '6ea2d087-ab9c-59dc-9657-8546025414d2'
    const STANDARD = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
    const tuningOf = (instrumentId: string) => (instrumentId === LAYOUT ? STANDARD : undefined)

    type FromFret = NonNullable<Item['fretboard_cell']>['fret_window']['from_fret']

    function cell(string: number, fret: number, drill: 'name_the_note' | 'find_the_note' | 'find_every_instance', fromFret: FromFret = 0): Item {
      return {
        item_key: `fretboard_cell:${LAYOUT}:${string}:${fret}`,
        kind: 'fretboard_cell',
        rung: 'know',
        reason: 'new',
        node_id: null,
        level: 'new',
        estimated_seconds: 8,
        fretboard_cell: { layout_instrument_id: LAYOUT, string, fret, drill, fret_window: { from_fret: fromFret } },
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

    it('sends a named note with the four choices it was picked from, as shown', () => {
      const run = usePracticeSessionRun(inTheHead(), { tuningOf })
      run.start()
      run.answerCell({ response_type: 'name_the_note', note_name: 'C', choices: ['B', 'F', 'C', 'C#'] })

      expect(tracked('practice.item_answered')[0]).toMatchObject({
        response: { response_type: 'name_the_note', note_name: 'C', choices: ['B', 'F', 'C', 'C#'] },
      })
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

    describe('finding every instance', () => {
      // G is at string 1 fret 3, string 4 fret 5 and string 6 fret 3 in frets 3 to 7.
      const everyG = () => plan([cell(6, 3, 'find_every_instance', 3)], null)
      const taps = [
        { string: 6, fret: 3 },
        { string: 1, fret: 3 },
      ]

      it('sends every place tapped as one answer, timed from when the cell was shown', () => {
        const run = usePracticeSessionRun(everyG(), { tuningOf })
        run.start()
        vi.advanceTimersByTime(5200)
        run.answerCell({ response_type: 'multi_tap', fret_window: { from_fret: 3 }, cells: taps })

        expect(tracked('practice.item_answered')).toEqual([
          {
            event_type: 'practice.item_answered',
            practice_session_id: SESSION_ID,
            item_key: `fretboard_cell:${LAYOUT}:6:3`,
            response: { response_type: 'multi_tap', fret_window: { from_fret: 3 }, cells: taps, latency_ms: 5200 },
          },
        ])
      })

      it('is right only when every place is found, and keeps how each cell was graded', () => {
        const run = usePracticeSessionRun(everyG(), { tuningOf })
        run.start()
        run.answerCell({ response_type: 'multi_tap', fret_window: { from_fret: 3 }, cells: taps })

        expect(run.cellAnswer.value?.correct).toBe(false)
        expect(run.cellAnswer.value?.grade).toMatchObject({ note: 'G', found: 2, places: 3, extra: 0 })
        expect(run.outcomes.value.get(0)).toEqual({ kind: 'answered', correct: false })
      })

      it('takes no answer from another window', () => {
        const run = usePracticeSessionRun(everyG(), { tuningOf })
        run.start()
        run.answerCell({ response_type: 'multi_tap', fret_window: { from_fret: 0 }, cells: taps })

        expect(tracked('practice.item_answered')).toEqual([])
      })

      it('is no answer to a cell asked another way', () => {
        const run = usePracticeSessionRun(inTheHead(), { tuningOf })
        run.start()
        run.answerCell({ response_type: 'multi_tap', fret_window: { from_fret: 0 }, cells: [{ string: 5, fret: 3 }] })

        expect(tracked('practice.item_answered')).toEqual([])
      })
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

  describe('chords played in hand', () => {
    it('sends a single chord’s rating with no tempo and no count, then moves on', () => {
      const run = usePracticeSessionRun(plan([chordVoicingItem(AM, 'Am'), exerciseItem('e1', 'due')]))
      run.start()

      run.rateChord('almost')

      expect(tracked('practice.item_answered')).toEqual([
        {
          event_type: 'practice.item_answered',
          practice_session_id: SESSION_ID,
          item_key: `chord_voicing:${AM}`,
          response: { response_type: 'self_rating', rating: 'almost' },
        },
      ])
      expect(run.index.value).toBe(1)
      expect(run.answeredCount.value).toBe(1)
    })

    it('sends a root and fifth on bass the same way', () => {
      const run = usePracticeSessionRun(plan([rootFifthItem()], BASS_ID))
      run.start()

      run.rateChord('clean')

      expect(tracked('practice.item_answered')[0].response).toEqual({ response_type: 'self_rating', rating: 'clean' })
    })

    it('rates only a single chord or a root and fifth this way', () => {
      const run = usePracticeSessionRun(plan([chordChangeItem()]))
      run.start()

      run.rateChord('clean')

      expect(tracked('practice.item_answered')).toEqual([])
      expect(run.index.value).toBe(0)
    })

    it('sends a minute of changes with the tempo played, the count and the rating they give', () => {
      const run = usePracticeSessionRun(plan([chordChangeItem(), exerciseItem('e1', 'due')]))
      run.start()

      run.saveChangeMinute(60, 42)

      expect(tracked('practice.item_answered')).toEqual([
        {
          event_type: 'practice.item_answered',
          practice_session_id: SESSION_ID,
          item_key: `chord_change:${AM}:${C_OPEN}`,
          response: { response_type: 'self_rating', rating: 'almost', tempo_bpm: 60, changes_per_minute: 42 },
        },
      ])
      expect(run.index.value).toBe(1)
    })

    it('sends the tempo the student played at, not the plan’s', () => {
      const run = usePracticeSessionRun(plan([chordChangeItem({ start_tempo_bpm: 45 })]))
      run.start()

      run.saveChangeMinute(50, 48)

      expect(tracked('practice.item_answered')[0].response).toEqual({ response_type: 'self_rating', rating: 'clean', tempo_bpm: 50, changes_per_minute: 48 })
    })

    it('sends a minute of root changes on bass the same way', () => {
      const run = usePracticeSessionRun(plan([rootChangeItem()], BASS_ID))
      run.start()

      run.saveChangeMinute(30, 30)

      expect(tracked('practice.item_answered')[0]).toMatchObject({
        item_key: `root_change:${BASS_ID}:Am:C`,
        response: { response_type: 'self_rating', rating: 'clean', tempo_bpm: 30, changes_per_minute: 30 },
      })
    })

    it('never sends more clean changes than the minute had beats', () => {
      const run = usePracticeSessionRun(plan([chordChangeItem()]))
      run.start()

      run.saveChangeMinute(40, 41)

      expect(tracked('practice.item_answered')).toEqual([])
      expect(run.index.value).toBe(0)
    })

    it('saves a minute only for a chord change or a root change', () => {
      const run = usePracticeSessionRun(plan([chordVoicingItem(AM, 'Am')]))
      run.start()

      run.saveChangeMinute(40, 20)

      expect(tracked('practice.item_answered')).toEqual([])
    })

    it('keeps how a chord went and how many clean changes a minute had, for the summary', () => {
      const run = usePracticeSessionRun(plan([chordVoicingItem(AM, 'Am'), chordChangeItem()]))
      run.start()

      run.rateChord('clean')
      run.saveChangeMinute(60, 42)

      expect(run.outcomes.value.get(0)).toEqual({ kind: 'rated', rating: 'clean' })
      expect(run.outcomes.value.get(1)).toEqual({ kind: 'changes', tempoBpm: 60, cleanChanges: 42, rating: 'almost' })
    })
  })

  describe('what the run did, for its summary', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-10-06T10:00:00Z'))
    })
    afterEach(() => vi.useRealTimers())

    it('keeps whether each answered item was right', () => {
      const run = usePracticeSessionRun(plan([exerciseItem('e1', 'due'), exerciseItem('e2', 'new')]))
      run.start()

      run.answer(['right'])
      run.nextItem()
      run.answer(['wrong'])

      expect(run.outcomes.value.get(0)).toEqual({ kind: 'answered', correct: true })
      expect(run.outcomes.value.get(1)).toEqual({ kind: 'answered', correct: false })
    })

    it('keeps a play-along’s rated takes, a warm-up’s too', () => {
      const run = usePracticeSessionRun(twoItems)
      run.start()

      run.rate('clean')
      run.rate('almost')

      expect(run.outcomes.value.get(0)).toEqual({
        kind: 'played',
        takes: [
          { bpm: 80, rating: 'clean', noteValue: 'quarters' },
          { bpm: 80, rating: 'almost', noteValue: 'quarters' },
        ],
      })
    })

    it('keeps nothing for an item the student never answered', () => {
      const run = usePracticeSessionRun(plan([exerciseItem('e1', 'due'), exerciseItem('e2', 'new')]))
      run.start()

      run.nextItem()
      run.end()

      expect([...run.outcomes.value.keys()]).toEqual([])
    })

    it('counts the minutes from the start to the end, never less than one', () => {
      const run = usePracticeSessionRun(twoItems)
      run.start()
      vi.advanceTimersByTime(10 * 60_000 + 40_000)
      run.end()

      expect(run.elapsedMinutes.value).toBe(11)

      const quick = usePracticeSessionRun(twoItems)
      quick.start()
      vi.advanceTimersByTime(5_000)
      quick.end()

      expect(quick.elapsedMinutes.value).toBe(1)
    })
  })
  describe('progression key tours', () => {
    const TOUR_KEYS = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'F#', 'B', 'E', 'A', 'D', 'G'] as const

    function tourItem(fields: Partial<NonNullable<Item['progression_keys']>> = {}, clean: string[] = []): Item {
      return {
        item_key: `progression_keys:${GUITAR_ID}:I-V-vi-IV`,
        kind: 'progression_keys',
        rung: 'move',
        reason: 'new',
        node_id: null,
        level: 'new',
        estimated_seconds: 234,
        progression_keys: {
          layout_instrument_id: GUITAR_ID,
          progression: { key: 'I-V-vi-IV', name: 'I–V–vi–IV (pop)' },
          times_through: 4,
          takes: 3,
          start_music_key: 'C',
          tour_tempo_bpm: 60,
          start_note_value: 'quarters',
          target_tempo_bpm: 100,
          min_tempo_bpm: 60,
          keys: TOUR_KEYS.map((key) => ({ music_key: key, clean: clean.includes(key), chart: [], voicings: [], chord_tones: [] })),
          ...fields,
        },
      }
    }

    it('plays the takes the plan gives, from the planned key and tempo', () => {
      const run = usePracticeSessionRun(plan([tourItem({ start_music_key: 'Bb', tour_tempo_bpm: 70 }, ['C', 'F'])]))
      run.start()

      expect(run.takesTotal.value).toBe(3)
      expect(run.tour.value).toEqual({ key: 'Bb', speed: 70, clean: ['C', 'F'] })
      expect(run.tempo.value).toBe(70)
      expect(run.noteValue.value).toBe('quarters')
    })

    it('sends each take with its tempo, note value and the key it was played in', () => {
      const run = usePracticeSessionRun(plan([tourItem({ start_music_key: 'A', tour_tempo_bpm: 85 })]))
      run.start()

      run.rate('clean')

      expect(tracked('practice.item_answered')).toEqual([
        {
          event_type: 'practice.item_answered',
          practice_session_id: SESSION_ID,
          item_key: `progression_keys:${GUITAR_ID}:I-V-vi-IV`,
          response: { response_type: 'self_rating', rating: 'clean', tempo_bpm: 85, note_value: 'quarters', music_key: 'A' },
        },
      ])
    })

    it('moves a clean take to the next key not yet clean, at the same tempo', () => {
      const run = usePracticeSessionRun(plan([tourItem({}, ['F', 'Bb'])]))
      run.start()

      run.rate('clean')

      expect(run.tour.value).toEqual({ key: 'Eb', speed: 60, clean: ['C', 'F', 'Bb'] })
      expect(run.tempo.value).toBe(60)
      run.rate('almost')
      expect(tracked('practice.item_answered')[1].response).toMatchObject({ music_key: 'Eb' })
    })

    it('stays in the key 5 BPM slower after a struggle', () => {
      const run = usePracticeSessionRun(plan([tourItem({ tour_tempo_bpm: 70 })]))
      run.start()

      run.rate('struggled')

      expect(run.tour.value?.key).toBe('C')
      expect(run.tempo.value).toBe(65)
    })

    it('keeps a clean take at a slower tempo the student chose in the key', () => {
      const run = usePracticeSessionRun(plan([tourItem({ tour_tempo_bpm: 70 })]))
      run.start()

      run.setTempo(60)
      run.rate('clean')

      expect(tracked('practice.item_answered')[0].response).toMatchObject({ tempo_bpm: 60, music_key: 'C' })
      expect(run.tour.value).toEqual({ key: 'C', speed: 70, clean: [] })
      expect(run.tempo.value).toBe(70)
    })

    it('plays the tour tempo in the note value the student switches to', () => {
      const run = usePracticeSessionRun(plan([tourItem({ tour_tempo_bpm: 70 })]))
      run.start()

      run.setNoteValue('eighths')
      run.rate('clean')

      expect(tracked('practice.item_answered')[0].response).toMatchObject({ tempo_bpm: 35, note_value: 'eighths', music_key: 'C' })
      expect(run.tour.value?.key).toBe('F')
      expect(run.noteValue.value).toBe('eighths')
      expect(run.tempo.value).toBe(35)
    })

    it('hands over to the next item after the last take, with the keys clean', () => {
      const run = usePracticeSessionRun(plan([tourItem(), exerciseItem('e1', 'due')]))
      run.start()

      run.rate('clean')
      run.rate('clean')
      run.rate('struggled')

      expect(run.handoff.value?.done.item_key).toBe(`progression_keys:${GUITAR_ID}:I-V-vi-IV`)
      expect(run.outcomes.value.get(0)).toEqual({
        kind: 'toured',
        takes: [
          { bpm: 60, rating: 'clean', noteValue: 'quarters' },
          { bpm: 60, rating: 'clean', noteValue: 'quarters' },
          { bpm: 60, rating: 'struggled', noteValue: 'quarters' },
        ],
        cleanKeys: 2,
        tourBpm: 60,
      })
    })
  })

  describe('guide tones', () => {
    const GUITAR = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
    const tuningOf = (id: string) => (id === 'guitar' ? GUITAR : undefined)
    const take = (taps = EVERY_THIRD_AT_60) => ({ tempoBpm: 60, noteValue: 'quarters' as const, taps })

    it('gives the takes the plan gives', () => {
      const run = usePracticeSessionRun(plan([guideToneItem()], null), { tuningOf })
      run.start()

      expect(run.takesTotal.value).toBe(3)
      expect(run.takesLeft.value).toBe(3)
    })

    it('sends each take with its key, tone, tempo, note value and taps', () => {
      const run = usePracticeSessionRun(plan([guideToneItem()], null), { tuningOf })
      run.start()

      run.tapGuideTone(take())

      expect(tracked('practice.item_answered')).toEqual([
        {
          event_type: 'practice.item_answered',
          practice_session_id: SESSION_ID,
          item_key: 'guide_tone:guitar:ii-V-I',
          response: { response_type: 'timed_taps', music_key: 'G', tone: '3', tempo_bpm: 60, note_value: 'quarters', taps: EVERY_THIRD_AT_60 },
        },
      ])
      expect(run.takesLeft.value).toBe(2)
    })

    it('keeps the best take’s bars hit as the item’s outcome', () => {
      const run = usePracticeSessionRun(plan([guideToneItem()], null), { tuningOf })
      run.start()

      run.tapGuideTone(take(EVERY_THIRD_AT_60.slice(0, 2)))
      run.tapGuideTone(take(EVERY_THIRD_AT_60.slice(0, 1)))

      expect(run.outcomes.value.get(0)).toEqual({ kind: 'tapped', hits: 2, bars: 4, correct: false })
      run.tapGuideTone(take())
      expect(run.outcomes.value.get(0)).toEqual({ kind: 'tapped', hits: 4, bars: 4, correct: true })
    })

    it('stays on the item after a take until the student moves on', () => {
      const run = usePracticeSessionRun(plan([guideToneItem(), guideToneItem()], null), { tuningOf })
      run.start()

      run.tapGuideTone(take())

      expect(run.index.value).toBe(0)
      run.nextItem()
      expect(run.index.value).toBe(1)
      expect(run.takesLeft.value).toBe(3)
    })

    it('takes no more takes than the plan gives', () => {
      const run = usePracticeSessionRun(plan([guideToneItem()], null), { tuningOf })
      run.start()

      for (let i = 0; i < 4; i++) run.tapGuideTone(take([]))

      expect(tracked('practice.item_answered')).toHaveLength(3)
    })
  })

  describe('a song', () => {
    it('sends the rating alone, with no tempo, note value or key, and stays on the song', () => {
      const run = usePracticeSessionRun(plan([exerciseItem('e1', 'due'), songItem()]))
      run.start()
      run.nextItem()

      run.rateSong('almost')

      expect(tracked('practice.item_answered')).toEqual([
        {
          event_type: 'practice.item_answered',
          practice_session_id: SESSION_ID,
          item_key: 'song:guitar:chart-amazing-grace',
          response: { response_type: 'self_rating', rating: 'almost' },
        },
      ])
      expect(run.songRating.value).toBe('almost')
      expect(run.index.value).toBe(1)
      expect(run.answeredCount.value).toBe(1)
      expect(run.outcomes.value.get(1)).toEqual({ kind: 'rated', rating: 'almost' })
      expect(run.progress.value).toEqual([1, 1])
    })

    it('rates the song once, and is never skipped once rated', () => {
      const run = usePracticeSessionRun(plan([songItem()]))
      run.start()

      run.rateSong('clean')
      run.rateSong('struggled')
      run.skip('unavailable')

      expect(tracked('practice.item_answered')).toHaveLength(1)
      expect(run.songRating.value).toBe('clean')
      expect(run.finished.value).toBe(false)
    })

    it('ends the session once the student moves on from the rated song', () => {
      const run = usePracticeSessionRun(plan([songItem()]))
      run.start()
      run.rateSong('clean')

      run.nextItem()

      expect(run.finished.value).toBe(true)
      expect(run.songRating.value).toBeNull()
    })

    it('rates only a song this way', () => {
      const run = usePracticeSessionRun(plan([exerciseItem('e1', 'due')]))
      run.start()

      run.rateSong('clean')

      expect(tracked('practice.item_answered')).toEqual([])
      expect(run.songRating.value).toBeNull()
    })
  })
})
