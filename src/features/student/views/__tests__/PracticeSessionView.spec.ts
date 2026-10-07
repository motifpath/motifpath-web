import { enableAutoUnmount, flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref, type Ref } from 'vue'

import type { components } from '@/api/generated/core-domain'

type Item = components['schemas']['PracticeSessionItem']
type Plan = components['schemas']['PracticeSessionPlan']

const POST = vi.fn()
// Diagrams load to name the plan's play-alongs.
const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST, GET } }),
}))

const track = vi.fn()
vi.mock('@/shared/composables/useEventTracking', () => ({
  useEventTracking: () => ({ track }),
}))

const router = { back: vi.fn(), push: vi.fn() }
const route = { query: {} as Record<string, string> }
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useRouter: () => router,
  useRoute: () => route,
}))

let wakeLockActive: Ref<boolean> | null = null
vi.mock('@/shared/composables/useWakeLock', () => ({
  useWakeLock: (active: Ref<boolean>) => {
    wakeLockActive = active
  },
}))

const GUITAR = '22222222-2222-4222-8222-222222222222'
const BASS = '33333333-3333-4333-8333-333333333333'
const PIANO = '44444444-4444-4444-8444-444444444444'

const STANDARD = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
const allInstruments = [
  { instrument_id: GUITAR, names: { en: 'Guitar' }, family: 'fretted', icon: 'acoustic_guitar', languages: ['en'], string_count: 6, tuning: STANDARD },
  { instrument_id: PIANO, names: { en: 'Piano' }, family: 'keyboard', icon: 'piano', languages: ['en'] },
  { instrument_id: BASS, names: { en: 'Electric bass' }, family: 'fretted', icon: 'electric_bass', languages: ['en'], string_count: 4, tuning: ['E1', 'A1', 'D2', 'G2'] },
]
const instruments = {
  instruments: ref(allInstruments),
  isLoading: ref(false),
  error: ref(false),
  retry: vi.fn(),
}
vi.mock('@/shared/composables/useListInstruments', () => ({
  useListInstruments: () => instruments,
}))

// The take itself is PlayAlongTake's: here it only reports what it was given and emits.
const PlayAlongTakeStub = defineComponent({
  name: 'PlayAlongTake',
  props: { item: { type: Object, required: true }, tempo: Number, takesLeft: Number, takesTotal: Number },
  emits: ['rate', 'skip', 'tempo'],
  setup(props) {
    return () => h('div', { 'data-test': 'take' }, `${props.tempo} BPM · ${props.takesLeft} of ${props.takesTotal} left`)
  },
})

// The exercise itself is SessionExercise's: here it only reports what it was given and emits.
const SessionExerciseStub = defineComponent({
  name: 'SessionExercise',
  props: { item: { type: Object, required: true }, answer: { type: Object, default: null } },
  emits: ['answer', 'next'],
  setup(props) {
    return () => h('div', { 'data-test': 'exercise' }, props.answer ? `answered ${props.answer.correct ? 'right' : 'wrong'}` : 'unanswered')
  },
})

// The drill, the tap check and the felt questions are their own components': here they only
// report what they were given and emit.
const SessionFretboardCellStub = defineComponent({
  name: 'SessionFretboardCell',
  props: { item: { type: Object, required: true }, tuning: { type: Array, required: true }, answer: { type: Object, default: null }, instrumentName: { type: String, default: undefined } },
  emits: ['answer', 'next'],
  setup(props) {
    return () => h('div', { 'data-test': 'cell' }, props.answer ? `answered ${props.answer.correct ? 'right' : 'wrong'}` : 'unanswered')
  },
})

const SessionDiagramShapeStub = defineComponent({
  name: 'SessionDiagramShape',
  props: { item: { type: Object, required: true }, answer: { type: Object, default: null }, instrumentName: { type: String, default: undefined } },
  emits: ['answer', 'next'],
  setup(props) {
    return () => h('div', { 'data-test': 'shape' }, props.answer ? `answered ${props.answer.correct ? 'right' : 'wrong'}` : 'unanswered')
  },
})

const TapCheckStub = defineComponent({
  name: 'TapCheck',
  props: { tuning: { type: Array, required: true } },
  emits: ['complete', 'skip'],
  setup() {
    return () => h('div', { 'data-test': 'tap-check' })
  },
})

const FeltQuestionsStub = defineComponent({
  name: 'FeltQuestions',
  props: { questions: { type: Array, required: true }, ratings: { type: Array, required: true } },
  emits: ['rate', 'skip'],
  setup(props) {
    return () => h('div', { 'data-test': 'felt' }, props.questions.join(','))
  },
})

const TodaysPlanStub = defineComponent({
  name: 'TodaysPlan',
  props: { items: { type: Array, required: true }, minutes: { type: Number, required: true }, labelOf: { type: Function, required: true } },
  emits: ['start'],
  setup(props) {
    return () => h('div', { 'data-test': 'plan' }, `${props.minutes} min: ${props.items.length} items`)
  },
})

const NextUpCardStub = defineComponent({
  name: 'NextUpCard',
  props: { doneLabel: String, fastestBpm: Number, nextLabel: String, nextReason: String },
  emits: ['continue'],
  setup(props) {
    return () => h('div', { 'data-test': 'next-up' }, `${props.doneLabel} up to ${props.fastestBpm} → ${props.nextLabel} (${props.nextReason})`)
  },
})

import PracticeSessionView from '@/features/student/views/PracticeSessionView.vue'
import { clearEmbeddedDiagramCache } from '@/shared/composables/useEmbeddedDiagram'

const SESSION_ID = '11111111-1111-4111-8111-111111111111'
const WARM_UP = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const DUE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function playAlong(diagramId: string, reason: Item['reason'], start: number): Item {
  return {
    item_key: `play_along:${diagramId}`,
    kind: 'play_along',
    reason,
    node_id: null,
    level: 'learning',
    estimated_seconds: 60,
    play_along: { diagram_id: diagramId, start_tempo_bpm: start, target_tempo_bpm: 100, best_clean_tempo_bpm: null },
  }
}

const EXERCISE = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const APPLY = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'

function exerciseItem(exerciseId: string): Item {
  return {
    item_key: `exercise:${exerciseId}`,
    kind: 'exercise',
    reason: 'new',
    node_id: null,
    level: 'new',
    estimated_seconds: 30,
    exercise: {
      exercise_id: exerciseId,
      title: 'Name the interval',
      prompt: { type: 'doc', content: [] },
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
    },
  }
}

function plan(items: Item[] = [playAlong(WARM_UP, 'warm_up', 80), playAlong(DUE, 'due', 60)], fields: Partial<Plan> = {}): Plan {
  return { practice_session_id: SESSION_ID, instrument_id: GUITAR, minutes: 10, items, felt_questions: [], tap_check_due: false, ...fields }
}

function cellItem(string: number, fret: number, drill: 'name_the_note' | 'find_the_note', layout = GUITAR): Item {
  return {
    item_key: `fretboard_cell:${layout}:${string}:${fret}`,
    kind: 'fretboard_cell',
    reason: 'new',
    node_id: null,
    level: 'new',
    estimated_seconds: 8,
    fretboard_cell: { layout_instrument_id: layout, string, fret, drill },
  }
}

const SHAPE = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'

function shapeItem(layout = GUITAR): Item {
  return {
    item_key: `diagram_shape:${SHAPE}`,
    kind: 'diagram_shape',
    reason: 'new',
    node_id: null,
    level: 'new',
    estimated_seconds: 10,
    diagram_shape: {
      diagram_id: SHAPE,
      layout_instrument_id: layout,
      drill: 'name_the_shape',
      shape_family: 'caged-grip',
      shape: 'A',
      options: ['C', 'A', 'G', 'E', 'D'].map((member) => ({ shape: member, name: `${member} shape` })),
      asked_interval: null,
    },
  }
}

const SHAPE_BOARD = { stringCount: 6, positions: [{ string: 5, fret: 3, interval: 'R' }] }

function mountView() {
  return mount(PracticeSessionView, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        PlayAlongTake: PlayAlongTakeStub,
        SessionExercise: SessionExerciseStub,
        SessionFretboardCell: SessionFretboardCellStub,
        SessionDiagramShape: SessionDiagramShapeStub,
        TapCheck: TapCheckStub,
        FeltQuestions: FeltQuestionsStub,
        TodaysPlan: TodaysPlanStub,
        NextUpCard: NextUpCardStub,
      },
    },
  })
}

/** Composes a session, which shows today's plan. */
async function composeSession(wrapper: ReturnType<typeof mountView>, composed: Plan = plan()) {
  POST.mockResolvedValueOnce({ data: composed, response: { status: 200 } })
  await wrapper.get('[data-test="start-session"]').trigger('click')
  await flushPromises()
}

/** Composes a session and starts it from today's plan. */
async function startSession(wrapper: ReturnType<typeof mountView>, composed: Plan = plan()) {
  await composeSession(wrapper, composed)
  wrapper.getComponent(TodaysPlanStub).vm.$emit('start')
  await flushPromises()
}

/** How full each item's segment of the session bar is, in percent. */
function segments(wrapper: ReturnType<typeof mountView>) {
  return wrapper.findAll('[data-test="session-segment"]').map((segment) => Number(segment.attributes('data-filled')))
}

function events(eventType: string) {
  return track.mock.calls.map(([event]) => event).filter((event) => event.event_type === eventType)
}

// Every view listens on window for the page closing; unmount each so none outlives its test.
enableAutoUnmount(afterEach)

describe('PracticeSessionView', () => {
  beforeEach(() => {
    POST.mockReset()
    track.mockReset()
    router.back.mockReset()
    router.push.mockReset()
    window.history.replaceState({}, '')
    route.query = {}
    instruments.isLoading.value = false
    instruments.error.value = false
    instruments.instruments.value = allInstruments
    clearEmbeddedDiagramCache()
    GET.mockReset().mockImplementation((_path: string, init: { params: { path: { diagram_id: string } } }) =>
      Promise.resolve({ data: { diagram_id: init.params.path.diagram_id, names: { en: `Diagram ${init.params.path.diagram_id.slice(0, 4)}` } } }),
    )
  })

  describe('today’s plan', () => {
    it('shows today’s plan once the session is composed, before anything is sent', async () => {
      const wrapper = mountView()
      await composeSession(wrapper)

      expect(wrapper.get('[data-test="plan"]').text()).toBe('10 min: 2 items')
      expect(wrapper.find('[data-test="take"]').exists()).toBe(false)
      expect(track).not.toHaveBeenCalled()
      expect(wakeLockActive!.value).toBe(false)
    })

    it('names the plan’s play-alongs by their diagrams', async () => {
      const wrapper = mountView()
      await composeSession(wrapper)

      const labelOf = wrapper.getComponent(TodaysPlanStub).props('labelOf') as (item: Item) => string
      expect(labelOf(playAlong(DUE, 'due', 60))).toBe('Diagram bbbb')
    })

    it('starts the session from today’s plan', async () => {
      const wrapper = mountView()
      await composeSession(wrapper)

      wrapper.getComponent(TodaysPlanStub).vm.$emit('start')
      await flushPromises()

      expect(events('practice.session_started')).toHaveLength(1)
      expect(wrapper.find('[data-test="take"]').exists()).toBe(true)
      expect(wakeLockActive!.value).toBe(true)
    })

    it('leaves from today’s plan on × without starting anything', async () => {
      const wrapper = mountView()
      await composeSession(wrapper)

      await wrapper.get('[data-test="shell-exit"]').trigger('click')
      wrapper.unmount()

      expect(router.push).toHaveBeenCalledWith({ name: 'home' })
      expect(track).not.toHaveBeenCalled()
    })
  })

  describe('next up', () => {
    it('hands over after a play-along’s last take, then shows the next item on Continue', async () => {
      const wrapper = mountView()
      await startSession(wrapper)
      wrapper.getComponent(PlayAlongTakeStub).vm.$emit('rate', 'clean')
      wrapper.getComponent(PlayAlongTakeStub).vm.$emit('rate', 'clean')
      await flushPromises()

      expect(wrapper.find('[data-test="take"]').exists()).toBe(false)
      expect(wrapper.get('[data-test="next-up"]').text()).toBe('Diagram aaaa up to 80 → Diagram bbbb (due)')

      wrapper.getComponent(NextUpCardStub).vm.$emit('continue')
      await flushPromises()

      expect(wrapper.find('[data-test="next-up"]').exists()).toBe(false)
      expect(wrapper.get('[data-test="take"]').text()).toBe('60 BPM · 4 of 4 left')
    })
  })

  describe('in the head', () => {
    const headTile = (wrapper: ReturnType<typeof mountView>) => wrapper.get('[data-test="no-instrument-tile"]')

    it('offers to practise in the head, after the instruments', () => {
      const wrapper = mountView()

      expect(headTile(wrapper).text()).toBe('In my head')
      expect(headTile(wrapper).get<HTMLInputElement>('input').element.checked).toBe(false)
    })

    it('composes a session with no instrument', async () => {
      const wrapper = mountView()
      await headTile(wrapper).get('input').setValue()

      await startSession(wrapper, plan([cellItem(5, 3, 'name_the_note')], { instrument_id: null }))

      expect(POST).toHaveBeenCalledWith('/students/me/practice-sessions', { body: { instrument_id: null, minutes: 10 } })
    })

    it('chooses the head when no instrument can play along', () => {
      instruments.instruments.value = allInstruments.filter((instrument) => instrument.family === 'keyboard')
      const wrapper = mountView()

      expect(wrapper.findAll('[data-test="instrument-tile"]')).toHaveLength(0)
      expect(headTile(wrapper).get<HTMLInputElement>('input').element.checked).toBe(true)
      expect(wrapper.get('[data-test="start-session"]').attributes('disabled')).toBeUndefined()
    })

    it('says when there is nothing to practise in the head', async () => {
      const wrapper = mountView()
      await headTile(wrapper).get('input').setValue()
      POST.mockResolvedValueOnce({ error: { message: 'not found' }, response: { status: 404 } })
      await wrapper.get('[data-test="start-session"]').trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('There’s nothing to practise in your head yet. Pick an instrument.')
      expect(wrapper.find('[data-test="practise-in-head"]').exists()).toBe(false)
    })
  })

  describe('with diagram shapes', () => {
    it('shows a shape, and records its answer graded on the board it was drawn on', async () => {
      const wrapper = mountView()
      await startSession(wrapper, plan([shapeItem(), cellItem(5, 3, 'name_the_note')]))
      const shape = () => wrapper.getComponent(SessionDiagramShapeStub)

      expect(shape().props('item')).toMatchObject({ item_key: `diagram_shape:${SHAPE}` })

      shape().vm.$emit('answer', { response_type: 'name_the_shape', shape: 'E' }, SHAPE_BOARD)
      await flushPromises()

      expect(events('practice.item_answered')).toEqual([expect.objectContaining({ response: expect.objectContaining({ shape: 'E' }) })])
      expect(wrapper.get('[data-test="shape"]').text()).toBe('answered wrong')

      shape().vm.$emit('next')
      await flushPromises()
      expect(wrapper.find('[data-test="cell"]').exists()).toBe(true)
    })

    it('asks for the tap check first on the shape’s instrument when the plan has no fretboard cell', async () => {
      const wrapper = mountView()
      await startSession(wrapper, plan([shapeItem(BASS)], { tap_check_due: true }))

      expect(wrapper.getComponent(TapCheckStub).props('tuning')).toEqual(['E1', 'A1', 'D2', 'G2'])
      expect(wrapper.find('[data-test="shape"]').exists()).toBe(false)
    })

    it('takes the tap check on the first fretboard cell’s instrument when there is one', async () => {
      const wrapper = mountView()
      await startSession(wrapper, plan([shapeItem(GUITAR), cellItem(4, 2, 'name_the_note', BASS)], { tap_check_due: true }))

      expect(wrapper.getComponent(TapCheckStub).props('tuning')).toEqual(['E1', 'A1', 'D2', 'G2'])
    })
  })

  describe('with fretboard cells', () => {
    it('shows a cell with its instrument’s tuning, and records its answer', async () => {
      const wrapper = mountView()
      await startSession(wrapper, plan([cellItem(5, 3, 'name_the_note'), cellItem(6, 1, 'find_the_note')]))
      const cell = () => wrapper.getComponent(SessionFretboardCellStub)

      expect(cell().props('item')).toMatchObject({ item_key: `fretboard_cell:${GUITAR}:5:3` })
      expect(cell().props('tuning')).toEqual(STANDARD)

      cell().vm.$emit('answer', { response_type: 'name_the_note', note_name: 'C' })
      await flushPromises()

      expect(events('practice.item_answered')).toEqual([expect.objectContaining({ response: expect.objectContaining({ note_name: 'C' }) })])
      expect(wrapper.get('[data-test="cell"]').text()).toBe('answered right')

      cell().vm.$emit('next')
      await flushPromises()
      expect(cell().props('item')).toMatchObject({ item_key: `fretboard_cell:${GUITAR}:6:1` })
    })

    it('names each fretboard question’s instrument in a session mixing layouts', async () => {
      const wrapper = mountView()
      await startSession(wrapper, plan([cellItem(5, 3, 'name_the_note', GUITAR), shapeItem(BASS)]))

      expect(wrapper.getComponent(SessionFretboardCellStub).props('instrumentName')).toBe('Guitar')

      wrapper.getComponent(SessionFretboardCellStub).vm.$emit('answer', { response_type: 'name_the_note', note_name: 'C' })
      await flushPromises()
      wrapper.getComponent(SessionFretboardCellStub).vm.$emit('next')
      await flushPromises()

      expect(wrapper.getComponent(SessionDiagramShapeStub).props('instrumentName')).toBe('Electric bass')
    })

    it('names no instrument when every fretboard question is on the same one', async () => {
      const wrapper = mountView()
      await startSession(wrapper, plan([cellItem(5, 3, 'name_the_note', GUITAR), shapeItem(GUITAR)]))

      expect(wrapper.getComponent(SessionFretboardCellStub).props('instrumentName')).toBeUndefined()
    })

    it('offers to skip a cell of an instrument it doesn’t know', async () => {
      const wrapper = mountView()
      await startSession(wrapper, plan([cellItem(5, 3, 'name_the_note', '99999999-9999-4999-8999-999999999999')]))

      expect(wrapper.find('[data-test="cell"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="skip-unsupported"]').exists()).toBe(true)
    })

    it('asks for the tap check first when the plan does, on the first cell’s instrument', async () => {
      const wrapper = mountView()
      await startSession(wrapper, plan([cellItem(4, 2, 'name_the_note', BASS)], { tap_check_due: true }))

      expect(wrapper.getComponent(TapCheckStub).props('tuning')).toEqual(['E1', 'A1', 'D2', 'G2'])
      expect(wrapper.find('[data-test="cell"]').exists()).toBe(false)

      wrapper.getComponent(TapCheckStub).vm.$emit('complete', { medianMs: 320, count: 24 })
      await flushPromises()

      expect(events('practice.tap_check_completed')).toEqual([{ event_type: 'practice.tap_check_completed', median_tap_ms: 320, tap_count: 24 }])
      expect(wrapper.find('[data-test="tap-check"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="cell"]').exists()).toBe(true)
    })

    it('passes over a tap check it has no board for', async () => {
      const wrapper = mountView()
      await startSession(wrapper, plan([cellItem(5, 3, 'name_the_note', '99999999-9999-4999-8999-999999999999')], { tap_check_due: true }))

      expect(wrapper.find('[data-test="tap-check"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="skip-unsupported"]').exists()).toBe(true)
    })

    it('goes on to the first item when the tap check is skipped', async () => {
      const wrapper = mountView()
      await startSession(wrapper, plan([cellItem(5, 3, 'name_the_note')], { tap_check_due: true }))

      wrapper.getComponent(TapCheckStub).vm.$emit('skip')
      await flushPromises()

      expect(events('practice.tap_check_completed')).toEqual([])
      expect(wrapper.find('[data-test="cell"]').exists()).toBe(true)
    })

    it('asks how the drills felt after the last item, then shows the session done', async () => {
      const wrapper = mountView()
      await startSession(wrapper, plan([cellItem(5, 3, 'name_the_note')], { felt_questions: ['fretboard_cell:name_the_note'] }))
      wrapper.getComponent(SessionFretboardCellStub).vm.$emit('answer', { response_type: 'name_the_note', note_name: 'C' })
      await flushPromises()
      wrapper.getComponent(SessionFretboardCellStub).vm.$emit('next')
      await flushPromises()

      expect(wrapper.get('[data-test="felt"]').text()).toBe('fretboard_cell:name_the_note')
      expect(events('practice.session_ended')).toEqual([])

      wrapper.getComponent(FeltQuestionsStub).vm.$emit('rate', 'fretboard_cell:name_the_note', 'easy')
      await flushPromises()

      expect(events('practice.session_ended')).toEqual([
        expect.objectContaining({ left_early: false, felt_ratings: [{ drill_template_key: 'fretboard_cell:name_the_note', felt: 'easy' }] }),
      ])
      expect(wrapper.find('[data-test="session-done"]').exists()).toBe(true)
    })

    it('shows the session done when the felt questions are skipped', async () => {
      const wrapper = mountView()
      await startSession(wrapper, plan([cellItem(5, 3, 'name_the_note')], { felt_questions: ['fretboard_cell:name_the_note'] }))
      wrapper.getComponent(SessionFretboardCellStub).vm.$emit('answer', { response_type: 'name_the_note', note_name: 'C' })
      await flushPromises()
      wrapper.getComponent(SessionFretboardCellStub).vm.$emit('next')
      await flushPromises()

      wrapper.getComponent(FeltQuestionsStub).vm.$emit('skip')
      await flushPromises()

      expect(events('practice.session_ended')).toEqual([expect.objectContaining({ felt_ratings: [] })])
      expect(wrapper.find('[data-test="session-done"]').exists()).toBe(true)
    })
  })

  it('offers the instruments a take can be played on as tiles, the first chosen', () => {
    const wrapper = mountView()

    const tiles = wrapper.findAll('[data-test="instrument-tile"]')
    expect(tiles.map((tile) => tile.text())).toEqual(['Guitar', 'Electric bass'])
    expect(tiles.map((tile) => tile.get<HTMLInputElement>('input').element.checked)).toEqual([true, false])
  })

  it('chooses the instrument the practice home was showing', () => {
    route.query = { instrument: BASS }
    const wrapper = mountView()

    const tiles = wrapper.findAll('[data-test="instrument-tile"]')
    expect(tiles.map((tile) => tile.get<HTMLInputElement>('input').element.checked)).toEqual([false, true])
  })

  it('chooses the first instrument when the one asked for can’t play along', () => {
    route.query = { instrument: PIANO }
    const wrapper = mountView()

    expect(wrapper.findAll('[data-test="instrument-tile"]').map((tile) => tile.get<HTMLInputElement>('input').element.checked)).toEqual([true, false])
  })

  it('goes to the home on × when the session was opened directly', async () => {
    const wrapper = mountView()

    await wrapper.get('[data-test="shell-exit"]').trigger('click')

    expect(router.push).toHaveBeenCalledWith({ name: 'home' })
  })

  it('composes a session for the instrument and minutes chosen', async () => {
    const wrapper = mountView()
    await wrapper.findAll('[data-test="instrument-tile"]')[1]!.get('input').setValue()
    await wrapper.get('[data-test="minutes-15"]').setValue()

    await startSession(wrapper)

    expect(POST).toHaveBeenCalledWith('/students/me/practice-sessions', { body: { instrument_id: BASS, minutes: 15 } })
  })

  it('composes for 10 minutes unless another time is chosen', async () => {
    const wrapper = mountView()
    await startSession(wrapper)

    expect(POST).toHaveBeenCalledWith('/students/me/practice-sessions', { body: { instrument_id: GUITAR, minutes: 10 } })
  })

  it('starts the session: sends the plan and shows its first item with why it was picked', async () => {
    const wrapper = mountView()
    await startSession(wrapper)

    expect(events('practice.session_started')).toHaveLength(1)
    expect(segments(wrapper)).toEqual([0, 0])
    expect(wrapper.get('[data-test="take"]').text()).toBe('80 BPM · 2 of 2 left')
  })

  it('records the take’s rating and moves through the items', async () => {
    const wrapper = mountView()
    await startSession(wrapper)
    const take = () => wrapper.getComponent(PlayAlongTakeStub)

    take().vm.$emit('rate', 'clean')
    take().vm.$emit('rate', 'clean')
    await flushPromises()
    expect(segments(wrapper)).toEqual([100, 0])

    wrapper.getComponent(NextUpCardStub).vm.$emit('continue')
    await flushPromises()
    take().vm.$emit('rate', 'almost')
    await flushPromises()
    expect(events('practice.item_answered')).toHaveLength(1)
  })

  it('skips an item the take can’t play', async () => {
    const wrapper = mountView()
    await startSession(wrapper)

    wrapper.getComponent(PlayAlongTakeStub).vm.$emit('skip')
    await flushPromises()

    expect(segments(wrapper)[0]).toBe(100)
  })

  it('offers to skip an item it can’t present', async () => {
    const cell = { ...playAlong(DUE, 'new', 60), kind: 'fretboard_cell' as const, play_along: undefined }
    const wrapper = mountView()
    await startSession(wrapper, plan([cell, playAlong(WARM_UP, 'due', 60)]))

    expect(wrapper.text()).toContain("This kind of practice isn't available here yet.")
    await wrapper.get('[data-test="skip-unsupported"]').trigger('click')
    expect(segments(wrapper)[0]).toBe(100)
  })

  it('runs in the Practice Shell: the start is its primary action', () => {
    const wrapper = mountView()

    expect(wrapper.find('[data-test="practice-shell"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="start-session"]').attributes()).toHaveProperty('data-primary-action')
  })

  it('shows where the run is', async () => {
    const wrapper = mountView()
    await startSession(wrapper)

    expect(wrapper.get('[data-test="shell-position"]').text()).toBe('1 / 2')
  })

  it('goes back where the student came from on × before starting', async () => {
    window.history.replaceState({ back: '/practice' }, '')
    const wrapper = mountView()

    await wrapper.get('[data-test="shell-exit"]').trigger('click')

    expect(router.back).toHaveBeenCalledOnce()
    expect(events('practice.session_ended')).toEqual([])
  })

  it('leaves on × once the session is done', async () => {
    const wrapper = mountView()
    await startSession(wrapper)
    await wrapper.get('[data-test="shell-exit"]').trigger('click')

    await wrapper.get('[data-test="shell-exit"]').trigger('click')

    expect(router.push).toHaveBeenCalledWith({ name: 'home' })
    expect(events('practice.session_ended')).toHaveLength(1)
  })

  it('keeps the screen on while the session runs, and only then', async () => {
    const wrapper = mountView()
    expect(wakeLockActive!.value).toBe(false)

    await startSession(wrapper)
    expect(wakeLockActive!.value).toBe(true)

    await wrapper.get('[data-test="shell-exit"]').trigger('click')
    expect(wakeLockActive!.value).toBe(false)
  })

  it('ends the session early and shows how it went', async () => {
    const wrapper = mountView()
    await startSession(wrapper)

    await wrapper.get('[data-test="shell-exit"]').trigger('click')

    expect(events('practice.session_ended')).toEqual([expect.objectContaining({ left_early: true, answered_count: 0 })])
    expect(wrapper.text()).toContain('Session done')
    expect(wrapper.text()).toContain('Nothing answered or rated this time.')
  })

  it('shows the session done after its last take', async () => {
    const wrapper = mountView()
    await startSession(wrapper, plan([playAlong(DUE, 'due', 60)]))
    for (let i = 0; i < 4; i++) wrapper.getComponent(PlayAlongTakeStub).vm.$emit('rate', 'clean')
    await flushPromises()

    expect(events('practice.session_ended')).toEqual([expect.objectContaining({ left_early: false, answered_count: 1 })])
    expect(wrapper.text()).toContain('You answered or rated 1 item.')
  })

  it('goes back to the choice for another session', async () => {
    const wrapper = mountView()
    await startSession(wrapper)
    await wrapper.get('[data-test="shell-exit"]').trigger('click')

    await wrapper.get('[data-test="practise-again"]').trigger('click')

    expect(wrapper.find('[data-test="start-session"]').exists()).toBe(true)
  })

  it('ends a session left mid-way, once', async () => {
    const wrapper = mountView()
    await startSession(wrapper)

    wrapper.unmount()

    expect(events('practice.session_ended')).toEqual([expect.objectContaining({ left_early: true })])
  })

  it('ends a session as left early when the page closes, with keepalive, once', async () => {
    const wrapper = mountView()
    await startSession(wrapper)

    window.dispatchEvent(new Event('pagehide'))
    wrapper.unmount()

    const ended = track.mock.calls.filter(([event]) => event.event_type === 'practice.session_ended')
    expect(ended).toEqual([[expect.objectContaining({ left_early: true }), { keepalive: true }]])
  })

  it('sends nothing when the page closes before a session starts or after it is done', async () => {
    const wrapper = mountView()
    window.dispatchEvent(new Event('pagehide'))
    await startSession(wrapper, plan([playAlong(DUE, 'due', 60)]))
    for (let i = 0; i < 4; i++) wrapper.getComponent(PlayAlongTakeStub).vm.$emit('rate', 'clean')
    await flushPromises()

    window.dispatchEvent(new Event('pagehide'))

    expect(events('practice.session_ended')).toEqual([expect.objectContaining({ left_early: false })])
  })

  it('stops listening for the page closing once it is left', async () => {
    const wrapper = mountView()
    await startSession(wrapper)
    wrapper.unmount()
    track.mockReset()

    window.dispatchEvent(new Event('pagehide'))

    expect(track).not.toHaveBeenCalled()
  })

  it('says when the session can’t be put together, and tries again', async () => {
    const wrapper = mountView()
    POST.mockResolvedValueOnce({ error: { message: 'boom' }, response: { status: 500 } })
    await wrapper.get('[data-test="start-session"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain("We couldn't put your session together.")
    await startSession(wrapper)
    expect(segments(wrapper)).toEqual([0, 0])
  })

  it('offers a session in the head when there is nothing to play on the chosen instrument', async () => {
    const wrapper = mountView()
    POST.mockResolvedValueOnce({ error: { message: 'not found' }, response: { status: 404 } })
    await wrapper.get('[data-test="start-session"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('There’s nothing to play on this instrument yet. You can practise in your head instead.')
    expect(wrapper.findAll('[data-test="instrument-tile"]')).toHaveLength(2)

    POST.mockResolvedValueOnce({ data: plan([cellItem(5, 3, 'name_the_note')], { instrument_id: null }), response: { status: 200 } })
    await wrapper.get('[data-test="practise-in-head"]').trigger('click')
    await flushPromises()

    expect(POST).toHaveBeenLastCalledWith('/students/me/practice-sessions', { body: { instrument_id: null, minutes: 10 } })
    expect(wrapper.find('[data-test="plan"]').exists()).toBe(true)
  })

  it('says when the instruments can’t be loaded', () => {
    instruments.error.value = true

    expect(mountView().text()).toContain("We couldn't load the instruments.")
  })

  it('plays the next take at the tempo the student picks', async () => {
    const wrapper = mountView()
    await startSession(wrapper)

    wrapper.getComponent(PlayAlongTakeStub).vm.$emit('tempo', 95)
    await flushPromises()

    expect(wrapper.get('[data-test="take"]').text()).toBe('95 BPM · 2 of 2 left')
  })

  describe('with exercises', () => {
    const mixed = () => plan([exerciseItem(EXERCISE), playAlong(APPLY, 'application', 70)])

    it('shows an exercise item as an exercise, unanswered', async () => {
      const wrapper = mountView()
      await startSession(wrapper, mixed())

      expect(wrapper.getComponent(SessionExerciseStub).props('item')).toMatchObject({ item_key: `exercise:${EXERCISE}` })
      expect(wrapper.get('[data-test="exercise"]').text()).toBe('unanswered')
      expect(wrapper.find('[data-test="take"]').exists()).toBe(false)
    })

    it('sends the answer, shows whether it was right, and fills the item’s segment', async () => {
      const wrapper = mountView()
      await startSession(wrapper, mixed())

      wrapper.getComponent(SessionExerciseStub).vm.$emit('answer', ['wrong'])
      await flushPromises()

      expect(events('practice.item_answered')).toEqual([
        expect.objectContaining({
          item_key: `exercise:${EXERCISE}`,
          response: expect.objectContaining({ response_type: 'option_choice', option_ids: ['wrong'] }),
        }),
      ])
      expect(wrapper.get('[data-test="exercise"]').text()).toBe('answered wrong')
      expect(segments(wrapper)).toEqual([100, 0])
    })

    it('moves on to the next item when the student asks', async () => {
      const wrapper = mountView()
      await startSession(wrapper, mixed())

      wrapper.getComponent(SessionExerciseStub).vm.$emit('answer', ['right'])
      await flushPromises()
      wrapper.getComponent(SessionExerciseStub).vm.$emit('next')
      await flushPromises()

      expect(wrapper.get('[data-test="take"]').text()).toBe('70 BPM · 4 of 4 left')
    })

    it('heads the application ending “Apply it”, and only that item', async () => {
      const wrapper = mountView()
      await startSession(wrapper, mixed())
      expect(wrapper.find('[data-test="apply-it"]').exists()).toBe(false)

      wrapper.getComponent(SessionExerciseStub).vm.$emit('next')
      await flushPromises()

      expect(wrapper.get('[data-test="apply-it"]').text()).toBe('Apply it')
    })

    it('counts answered exercises in how the session went', async () => {
      const wrapper = mountView()
      await startSession(wrapper, mixed())

      wrapper.getComponent(SessionExerciseStub).vm.$emit('answer', ['right'])
      await flushPromises()
      await wrapper.get('[data-test="shell-exit"]').trigger('click')

      expect(wrapper.get('[data-test="session-done"]').text()).toContain('You answered or rated 1 item.')
      expect(events('practice.session_ended')).toEqual([expect.objectContaining({ answered_count: 1, left_early: true })])
    })
  })
})
