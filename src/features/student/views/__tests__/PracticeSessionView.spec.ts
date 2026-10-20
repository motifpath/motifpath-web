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
  props: { item: { type: Object, required: true }, tempo: Number, noteValue: String, takesLeft: Number, takesTotal: Number },
  emits: ['rate', 'skip', 'tempo', 'noteValue'],
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

const SessionGeneratedChoiceStub = defineComponent({
  name: 'SessionGeneratedChoice',
  props: { item: { type: Object, required: true }, answer: { type: Object, default: null }, instrumentName: { type: String, default: undefined } },
  emits: ['answer', 'next', 'skip', 'playing'],
  setup(props) {
    return () => h('div', { 'data-test': 'harmony' }, props.answer ? `answered ${props.answer.correct ? 'right' : 'wrong'}` : 'unanswered')
  },
})

const SessionChordVoicingStub = defineComponent({
  name: 'SessionChordVoicing',
  props: { item: { type: Object, required: true }, tuning: { type: Array, default: undefined }, instrumentName: { type: String, default: undefined } },
  emits: ['rate', 'skip'],
  setup() {
    return () => h('div', { 'data-test': 'chord' })
  },
})

const SessionChordChangeStub = defineComponent({
  name: 'SessionChordChange',
  props: { item: { type: Object, required: true }, tuning: { type: Array, default: undefined }, instrumentName: { type: String, default: undefined } },
  emits: ['save', 'skip'],
  setup() {
    return () => h('div', { 'data-test': 'chord-change' })
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
  props: {
    items: { type: Array, required: true },
    minutes: { type: Number, required: true },
    instrumentName: { type: String, required: true },
    labelOf: { type: Function, required: true },
  },
  emits: ['start'],
  setup(props) {
    return () => h('div', { 'data-test': 'plan' }, `${props.minutes} min: ${props.items.length} items`)
  },
})

const NextUpCardStub = defineComponent({
  name: 'NextUpCard',
  props: { doneLabel: String, fastestBpm: Number, fastestNoteValue: String, nextLabel: String, nextReason: String },
  emits: ['continue'],
  setup(props) {
    return () => h('div', { 'data-test': 'next-up' }, `${props.doneLabel} up to ${props.fastestBpm} → ${props.nextLabel} (${props.nextReason})`)
  },
})

// The summary loads this week's numbers itself: here it only reports what it was given and emits.
const SessionSummaryStub = defineComponent({
  name: 'SessionSummary',
  props: { rows: { type: Array, required: true }, minutes: Number, instrumentName: String, itemCount: Number, labelOf: Function },
  emits: ['done', 'practiseAgain'],
  setup(props) {
    return () => h('div', { 'data-test': 'session-done' }, `${props.minutes} min · ${props.instrumentName} · ${props.itemCount} items · ${props.rows.length} rows`)
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
    rung: 'play_in_time',
    reason,
    node_id: null,
    level: 'learning',
    estimated_seconds: 60,
    play_along: {
      diagram_id: diagramId,
      start_tempo_bpm: start,
      start_note_value: 'quarters',
      target_tempo_bpm: 100,
      best_clean_tempo_bpm: null,
      best_clean_note_value: null,
    },
  }
}

const EXERCISE = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const APPLY = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'

function exerciseItem(exerciseId: string): Item {
  return {
    item_key: `exercise:${exerciseId}`,
    kind: 'exercise',
    rung: 'know',
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
      updated_at: '2026-10-06T00:00:00Z',
    },
  }
}

function plan(items: Item[] = [playAlong(WARM_UP, 'warm_up', 80), playAlong(DUE, 'due', 60)], fields: Partial<Plan> = {}): Plan {
  return { practice_session_id: SESSION_ID, instrument_id: GUITAR, minutes: 10, focus_source: 'suggested', focus_nodes: [], items, felt_questions: [], tap_check_due: false, ...fields }
}

function cellItem(string: number, fret: number, drill: 'name_the_note' | 'find_the_note', layout = GUITAR): Item {
  return {
    item_key: `fretboard_cell:${layout}:${string}:${fret}`,
    kind: 'fretboard_cell',
    rung: 'know',
    reason: 'new',
    node_id: null,
    level: 'new',
    estimated_seconds: 8,
    fretboard_cell: { layout_instrument_id: layout, string, fret, drill, fret_window: { from_fret: 0 } },
  }
}

const SHAPE = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'

function shapeItem(layout = GUITAR): Item {
  return {
    item_key: `diagram_shape:${SHAPE}`,
    kind: 'diagram_shape',
    rung: 'know',
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

function harmonyItem(): Item {
  return {
    item_key: 'diatonic_chord:G:vi',
    kind: 'diatonic_chord',
    rung: 'know',
    reason: 'new',
    node_id: null,
    level: 'new',
    estimated_seconds: 8,
    generated_choice: {
      way: 'numeral_to_chord',
      music_key: 'G',
      numeral: 'vi',
      chord: null,
      function: null,
      progression: null,
      chart: [],
      drawn_as: 'chord_symbols',
      options: ['Em', 'D', 'F#dim', 'C'].map((value) => ({ value, name: null, chart: [] })),
      voicings: [],
    },
  }
}

const AM_BOX = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1'
const C_BOX = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1'
const chordMinute = { start_tempo_bpm: 45, target_changes_per_minute: 60, best_clean_changes_per_minute: 16, last_changes_per_minute: 18 }
const chordBase = { reason: 'new', node_id: null, level: 'new' } as const

function chordVoicingItem(): Item {
  return { ...chordBase, item_key: `chord_voicing:${AM_BOX}`, kind: 'chord_voicing', rung: 'play_clean', estimated_seconds: 20, chord_voicing: { diagram_id: AM_BOX, chord_symbol: 'Am' } }
}

function chordChangeItem(): Item {
  return {
    ...chordBase,
    item_key: `chord_change:${AM_BOX}:${C_BOX}`,
    kind: 'chord_change',
    rung: 'play_in_time',
    estimated_seconds: 90,
    chord_change: { from_diagram_id: AM_BOX, to_diagram_id: C_BOX, from_chord_symbol: 'Am', to_chord_symbol: 'C', minute: chordMinute },
  }
}

function rootFifthItem(): Item {
  return {
    ...chordBase,
    item_key: `root_fifth:${BASS}:G`,
    kind: 'root_fifth',
    rung: 'play_clean',
    estimated_seconds: 20,
    root_fifth: { layout_instrument_id: BASS, chord_symbol: 'G', root: { string: 4, fret: 3 }, fifth: { string: 3, fret: 5 } },
  }
}

function rootChangeItem(): Item {
  return {
    ...chordBase,
    item_key: `root_change:${BASS}:Am:C`,
    kind: 'root_change',
    rung: 'play_in_time',
    estimated_seconds: 90,
    root_change: { layout_instrument_id: BASS, from_chord_symbol: 'Am', to_chord_symbol: 'C', from_root: { string: 3, fret: 0 }, to_root: { string: 3, fret: 3 }, minute: chordMinute },
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
        SessionGeneratedChoice: SessionGeneratedChoiceStub,
        SessionChordVoicing: SessionChordVoicingStub,
        SessionChordChange: SessionChordChangeStub,
        TapCheck: TapCheckStub,
        FeltQuestions: FeltQuestionsStub,
        TodaysPlan: TodaysPlanStub,
        NextUpCard: NextUpCardStub,
        SessionSummary: SessionSummaryStub,
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

  describe('tools', () => {
    /** Opens Tools from the setup's header and chooses the Metronome. */
    async function openMetronome(wrapper: ReturnType<typeof mountView>) {
      await wrapper.get('[data-test="tools"]').trigger('click')
      await wrapper.get('[data-test="tool-metronome"]').trigger('click')
      await flushPromises()
    }

    it('offers Tools in the header of the setup', () => {
      expect(mountView().get('[data-test="shell-options"] [data-test="tools"]').attributes('aria-label')).toBe('Tools')
    })

    it('opens the Metronome as a page inside the shell', async () => {
      const wrapper = mountView()

      await openMetronome(wrapper)

      expect(wrapper.get('[data-test="shell-title"]').text()).toBe('Metronome')
      expect(wrapper.get('[data-test="shell-exit"]').attributes('aria-label')).toBe('Back to practice')
      expect(wrapper.find('[data-test="metronome-tool"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="practice-setup"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="tools"]').exists()).toBe(false)
    })

    it('goes back to the setup as the student left it, without leaving practice', async () => {
      const wrapper = mountView()
      await wrapper.get('[data-test="minutes-20"]').setValue(true)
      await openMetronome(wrapper)

      await wrapper.get('[data-test="shell-exit"]').trigger('click')

      expect(wrapper.find('[data-test="metronome-tool"]').exists()).toBe(false)
      expect(wrapper.get<HTMLInputElement>('[data-test="minutes-20"]').element.checked).toBe(true)
      expect(router.back).not.toHaveBeenCalled()
      expect(router.push).not.toHaveBeenCalled()
    })

    it('offers no Tools once a session is composed or running', async () => {
      const wrapper = mountView()
      await composeSession(wrapper)
      expect(wrapper.find('[data-test="tools"]').exists()).toBe(false)

      wrapper.getComponent(TodaysPlanStub).vm.$emit('start')
      await flushPromises()
      expect(wrapper.find('[data-test="tools"]').exists()).toBe(false)
    })

    it('sends nothing from the Metronome', async () => {
      const wrapper = mountView()
      await openMetronome(wrapper)
      await wrapper.get('[data-test="shell-exit"]').trigger('click')

      expect(track).not.toHaveBeenCalled()
    })
  })

  describe('today’s plan', () => {
    it('shows today’s plan once the session is composed, before anything is sent', async () => {
      const wrapper = mountView()
      await composeSession(wrapper)

      expect(wrapper.get('[data-test="plan"]').text()).toBe('10 min: 2 items')
      expect(wrapper.getComponent(TodaysPlanStub).props('instrumentName')).toBe('Guitar')
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

    it('names a session in the head as such on today’s plan', async () => {
      const wrapper = mountView()
      await headTile(wrapper).get('input').setValue()

      await composeSession(wrapper, plan([cellItem(5, 3, 'name_the_note')], { instrument_id: null }))

      expect(wrapper.getComponent(TodaysPlanStub).props('instrumentName')).toBe('In my head')
    })

    it('chooses the head when no instrument can play along', () => {
      instruments.instruments.value = allInstruments.filter((instrument) => instrument.family === 'keyboard')
      const wrapper = mountView()

      expect(wrapper.findAll('[data-test="instrument-tile"]')).toHaveLength(0)
      expect(headTile(wrapper).get<HTMLInputElement>('input').element.checked).toBe(true)
      expect(wrapper.get('[data-test="start-session"]').attributes('disabled')).toBeUndefined()
    })

    it('says when there is nothing to practise in the head, and the way out is the primary action', async () => {
      const wrapper = mountView()
      await headTile(wrapper).get('input').setValue()
      POST.mockResolvedValueOnce({ error: { message: 'not found' }, response: { status: 404 } })
      await wrapper.get('[data-test="start-session"]').trigger('click')
      await flushPromises()

      const notice = wrapper.get('[data-test="inline-notice"]')
      expect(notice.attributes('data-tone')).toBe('unavailable')
      expect(notice.text()).toBe('There’s nothing to practise in your head yet. Pick an instrument.')
      const primary = wrapper.get('[data-primary-action]')
      expect(primary.text()).toBe('Find where to start')

      await primary.trigger('click')
      expect(router.push).toHaveBeenCalledWith({ name: 'home' })
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

  describe('with chords played in hand', () => {
    it('shows a single chord, and records its rating with no tempo and no count', async () => {
      const wrapper = mountView()
      await startSession(wrapper, plan([chordVoicingItem(), shapeItem()]))

      expect(wrapper.getComponent(SessionChordVoicingStub).props('item')).toMatchObject({ item_key: `chord_voicing:${AM_BOX}` })
      wrapper.getComponent(SessionChordVoicingStub).vm.$emit('rate', 'almost')
      await flushPromises()

      expect(events('practice.item_answered')).toEqual([
        expect.objectContaining({ item_key: `chord_voicing:${AM_BOX}`, response: { response_type: 'self_rating', rating: 'almost' } }),
      ])
      expect(wrapper.find('[data-test="shape"]').exists()).toBe(true)
    })

    it('records a minute of changes with the tempo played, the count and the rating they give', async () => {
      const wrapper = mountView()
      await startSession(wrapper, plan([chordChangeItem(), shapeItem()]))

      wrapper.getComponent(SessionChordChangeStub).vm.$emit('save', 50, 48)
      await flushPromises()

      expect(events('practice.item_answered')).toEqual([
        expect.objectContaining({ response: { response_type: 'self_rating', rating: 'clean', tempo_bpm: 50, changes_per_minute: 48 } }),
      ])
      expect(wrapper.find('[data-test="shape"]').exists()).toBe(true)
    })

    it('draws a bass item on its layout’s board', async () => {
      const wrapper = mountView()
      await startSession(wrapper, plan([rootFifthItem(), rootChangeItem()], { instrument_id: BASS }))

      expect(wrapper.getComponent(SessionChordVoicingStub).props('tuning')).toEqual(['E1', 'A1', 'D2', 'G2'])
      wrapper.getComponent(SessionChordVoicingStub).vm.$emit('rate', 'clean')
      await flushPromises()

      expect(wrapper.getComponent(SessionChordChangeStub).props('tuning')).toEqual(['E1', 'A1', 'D2', 'G2'])
    })

    it('sends a chord that can’t be shown as not answered and moves on', async () => {
      const wrapper = mountView()
      await startSession(wrapper, plan([chordChangeItem(), shapeItem()]))

      wrapper.getComponent(SessionChordChangeStub).vm.$emit('skip', 'unavailable')
      await flushPromises()

      expect(events('practice.item_answered')).toEqual([expect.objectContaining({ response: { response_type: 'not_answered', reason: 'unavailable' } })])
      expect(wrapper.find('[data-test="shape"]').exists()).toBe(true)
    })

    it('sends no answer for a minute of changes when the student leaves the session during it', async () => {
      const wrapper = mountView()
      await startSession(wrapper, plan([chordChangeItem(), shapeItem()]))

      await wrapper.get('[data-test="shell-exit"]').trigger('click')
      await flushPromises()

      expect(events('practice.item_answered')).toEqual([])
      expect(events('practice.session_ended')).toEqual([expect.objectContaining({ left_early: true })])
    })
  })

  describe('with harmony questions', () => {
    it('shows a harmony question, and records its answer graded as the record grades it', async () => {
      const wrapper = mountView()
      await startSession(wrapper, plan([harmonyItem(), shapeItem()]))
      const question = () => wrapper.getComponent(SessionGeneratedChoiceStub)

      expect(question().props('item')).toMatchObject({ item_key: 'diatonic_chord:G:vi' })

      question().vm.$emit(
        'answer',
        { way: 'numeral_to_chord', options: ['Em', 'D', 'F#dim', 'C'], choice: 'Em' },
        { question: { way: 'numeral_to_chord', key: 'G', numeral: 'vi' }, catalog: {} },
      )
      await flushPromises()

      expect(events('practice.item_answered')).toEqual([
        expect.objectContaining({ response: expect.objectContaining({ response_type: 'generated_choice', choice: 'Em' }) }),
      ])
      expect(wrapper.get('[data-test="harmony"]').text()).toBe('answered right')

      question().vm.$emit('next')
      await flushPromises()
      expect(wrapper.find('[data-test="shape"]').exists()).toBe(true)
    })

    it('times a heard question’s answer from when its sound started', async () => {
      const heard: Item = {
        ...harmonyItem(),
        item_key: 'heard_chord:vi',
        kind: 'heard_chord',
        rung: 'hear',
        generated_choice: {
          ...harmonyItem().generated_choice!,
          way: 'cadence_then_chord',
          numeral: null,
          options: ['ii', 'IV', 'V', 'vi'].map((value) => ({ value, name: null, chart: [] })),
          playback: { tempo_bpm: 70, bass_line: false, bass_instrument_id: null, bars: [{ chord: 'G', numeral: 'I' }, { chord: 'Em', numeral: null }] },
        },
      }
      const wrapper = mountView()
      await startSession(wrapper, plan([heard, shapeItem()]))
      const clock = vi.spyOn(Date, 'now')
      const question = wrapper.getComponent(SessionGeneratedChoiceStub)

      clock.mockReturnValue(50_000)
      question.vm.$emit('playing', true)
      clock.mockReturnValue(53_000)
      question.vm.$emit('playing', false)
      clock.mockReturnValue(54_200)
      question.vm.$emit(
        'answer',
        { way: 'cadence_then_chord', options: ['ii', 'IV', 'V', 'vi'], choice: 'vi', audioMs: 3000 },
        { question: { way: 'cadence_then_chord', key: 'G', numeral: 'vi' }, catalog: {} },
      )
      await flushPromises()
      clock.mockRestore()

      expect(events('practice.item_answered')).toEqual([
        expect.objectContaining({ response: expect.objectContaining({ latency_ms: 4200, audio_ms: 3000, music_key: 'G' }) }),
      ])
    })

    it('sends a harmony question that can’t be shown as not answered and moves on', async () => {
      const wrapper = mountView()
      await startSession(wrapper, plan([harmonyItem(), shapeItem()]))

      wrapper.getComponent(SessionGeneratedChoiceStub).vm.$emit('skip', 'unavailable')
      await flushPromises()

      expect(events('practice.item_answered')).toEqual([expect.objectContaining({ response: { response_type: 'not_answered', reason: 'unavailable' } })])
      expect(wrapper.find('[data-test="shape"]').exists()).toBe(true)
    })
  })

  it('sends a shape that can’t be shown as not answered and moves on', async () => {
    const wrapper = mountView()
    await startSession(wrapper, plan([shapeItem(), cellItem(5, 3, 'name_the_note')]))

    wrapper.getComponent(SessionDiagramShapeStub).vm.$emit('skip', 'unavailable')
    await flushPromises()

    expect(events('practice.item_answered')).toEqual([expect.objectContaining({ response: { response_type: 'not_answered', reason: 'unavailable' } })])
    expect(wrapper.findComponent(SessionFretboardCellStub).exists()).toBe(true)
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

  it('sends an item the take can’t play as not answered and moves on', async () => {
    const wrapper = mountView()
    await startSession(wrapper)

    wrapper.getComponent(PlayAlongTakeStub).vm.$emit('skip', 'unavailable')
    await flushPromises()

    expect(events('practice.item_answered')).toEqual([expect.objectContaining({ response: { response_type: 'not_answered', reason: 'unavailable' } })])
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
    expect(wrapper.getComponent(SessionSummaryStub).props()).toMatchObject({ rows: [], itemCount: 0, instrumentName: 'Guitar' })
  })

  it('shows the session done after its last take', async () => {
    const wrapper = mountView()
    await startSession(wrapper, plan([playAlong(DUE, 'due', 60)]))
    for (let i = 0; i < 4; i++) wrapper.getComponent(PlayAlongTakeStub).vm.$emit('rate', 'clean')
    await flushPromises()

    expect(events('practice.session_ended')).toEqual([expect.objectContaining({ left_early: false, answered_count: 1 })])
    const summary = wrapper.getComponent(SessionSummaryStub)
    expect(summary.props('itemCount')).toBe(1)
    expect(summary.props('rows')).toEqual([expect.objectContaining({ key: `play_along:${DUE}`, result: { kind: 'played', fastestBpm: 65, fastestNoteValue: 'quarters', rating: 'clean' } })])
  })

  it('goes back to the choice for another session', async () => {
    const wrapper = mountView()
    await startSession(wrapper)
    await wrapper.get('[data-test="shell-exit"]').trigger('click')

    wrapper.getComponent(SessionSummaryStub).vm.$emit('practiseAgain')
    await flushPromises()

    expect(wrapper.find('[data-test="start-session"]').exists()).toBe(true)
  })

  it('goes home when the student is done', async () => {
    const wrapper = mountView()
    await startSession(wrapper)
    await wrapper.get('[data-test="shell-exit"]').trigger('click')

    wrapper.getComponent(SessionSummaryStub).vm.$emit('done')

    expect(router.push).toHaveBeenCalledWith({ name: 'home' })
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

  describe('setup', () => {
    it('keeps the choices when the session can’t be put together, and Try again sends them again', async () => {
      const wrapper = mountView()
      await wrapper.get('[data-test="minutes-20"]').setValue()
      POST.mockResolvedValueOnce({ error: { message: 'boom' }, response: { status: 500 } })
      await wrapper.get('[data-test="start-session"]').trigger('click')
      await flushPromises()

      const notice = wrapper.get('[data-test="inline-notice"]')
      expect(notice.attributes('data-tone')).toBe('error')
      expect(notice.text()).toBe("We couldn't put your session together. Your choices are kept — try again.")
      expect(wrapper.get<HTMLInputElement>('[data-test="minutes-20"]').element.checked).toBe(true)
      expect(wrapper.get('[data-primary-action]').text()).toBe('Try again')

      await startSession(wrapper)
      expect(POST).toHaveBeenLastCalledWith('/students/me/practice-sessions', { body: { instrument_id: GUITAR, minutes: 20 } })
      expect(segments(wrapper)).toEqual([0, 0])
    })

    it('makes practising in the head the primary action when there is nothing to play on the chosen instrument', async () => {
      const wrapper = mountView()
      POST.mockResolvedValueOnce({ error: { message: 'not found' }, response: { status: 404 } })
      await wrapper.get('[data-test="start-session"]').trigger('click')
      await flushPromises()

      const notice = wrapper.get('[data-test="inline-notice"]')
      expect(notice.attributes('data-tone')).toBe('unavailable')
      expect(notice.text()).toBe('There’s nothing to play on this instrument yet. You can practise in your head instead.')
      expect(wrapper.findAll('[data-test="instrument-tile"]')).toHaveLength(2)
      expect(wrapper.findAll('[data-primary-action]')).toHaveLength(1)
      expect(wrapper.get('[data-primary-action]').text()).toBe('Practise in my head')

      POST.mockResolvedValueOnce({ data: plan([cellItem(5, 3, 'name_the_note')], { instrument_id: null }), response: { status: 200 } })
      await wrapper.get('[data-primary-action]').trigger('click')
      await flushPromises()

      expect(POST).toHaveBeenLastCalledWith('/students/me/practice-sessions', { body: { instrument_id: null, minutes: 10 } })
      expect(wrapper.find('[data-test="plan"]').exists()).toBe(true)
    })

    it('goes back to Start practising once another instrument is chosen', async () => {
      const wrapper = mountView()
      POST.mockResolvedValueOnce({ error: { message: 'not found' }, response: { status: 404 } })
      await wrapper.get('[data-test="start-session"]').trigger('click')
      await flushPromises()

      await wrapper.findAll('[data-test="instrument-tile"]')[1].get('input').setValue()

      expect(wrapper.find('[data-test="inline-notice"]').exists()).toBe(false)
      expect(wrapper.get('[data-primary-action]').text()).toBe('Start practising')
    })

    it('says in place when the instruments can’t be loaded, with Try again as the primary action', async () => {
      instruments.error.value = true
      const wrapper = mountView()

      const notice = wrapper.get('[data-test="inline-notice"]')
      expect(notice.attributes('data-tone')).toBe('error')
      expect(notice.text()).toBe("We couldn't load the instruments. Check your connection and try again.")
      expect(wrapper.find('[data-test="minutes-10"]').exists()).toBe(true)
      expect(wrapper.get('[data-primary-action]').text()).toBe('Try again')

      await wrapper.get('[data-primary-action]').trigger('click')
      expect(instruments.retry).toHaveBeenCalledOnce()
    })

    it('shows the shape of today’s plan while the session is put together, never a blank spinner', async () => {
      const wrapper = mountView()
      POST.mockReturnValueOnce(new Promise(() => {}))
      await wrapper.get('[data-test="start-session"]').trigger('click')

      const composing = wrapper.get('[data-test="plan-composing"]')
      expect(composing.text()).toContain("Today's plan")
      expect(composing.text()).toContain('Putting your session together…')
      expect(composing.find('[aria-busy="true"]').exists()).toBe(true)
      expect(wrapper.get('[data-primary-action]').text()).toBe("Let's go")
      expect(wrapper.get('[data-primary-action]').attributes('disabled')).toBeDefined()
      expect(wrapper.find('[data-test="start-session"]').exists()).toBe(false)
    })
  })

  it('plays the next take at the tempo the student picks', async () => {
    const wrapper = mountView()
    await startSession(wrapper)

    wrapper.getComponent(PlayAlongTakeStub).vm.$emit('tempo', 95)
    await flushPromises()

    expect(wrapper.get('[data-test="take"]').text()).toBe('95 BPM · 2 of 2 left')
  })

  it('plays the next take in the note value the student picks, at the same effective speed', async () => {
    const wrapper = mountView()
    await startSession(wrapper)

    wrapper.getComponent(PlayAlongTakeStub).vm.$emit('noteValue', 'eighths')
    await flushPromises()

    expect(wrapper.getComponent(PlayAlongTakeStub).props()).toMatchObject({ tempo: 40, noteValue: 'eighths' })
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

    it('times a choice among sounds from the clips the exercise reports', async () => {
      const wrapper = mountView()
      const sounds = exerciseItem(EXERCISE)
      sounds.exercise = { ...sounds.exercise!, exercise_type: 'audio_selection' }
      await startSession(wrapper, plan([sounds]))

      wrapper.getComponent(SessionExerciseStub).vm.$emit('playing', true)
      wrapper.getComponent(SessionExerciseStub).vm.$emit('answer', ['right'])
      await flushPromises()

      expect(events('practice.item_answered')).toEqual([expect.objectContaining({ response: expect.objectContaining({ latency_ms: 0 }) })])
    })

    it('sends a skipped exercise as not answered and moves on', async () => {
      const wrapper = mountView()
      await startSession(wrapper, mixed())

      wrapper.getComponent(SessionExerciseStub).vm.$emit('skip', 'failed_to_load')
      await flushPromises()

      expect(events('practice.item_answered')).toEqual([
        expect.objectContaining({ response: { response_type: 'not_answered', reason: 'failed_to_load' } }),
      ])
      expect(wrapper.find('[data-test="take"]').exists()).toBe(true)
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

      expect(wrapper.getComponent(SessionSummaryStub).props('itemCount')).toBe(1)
      expect(events('practice.session_ended')).toEqual([expect.objectContaining({ answered_count: 1, left_early: true })])
    })
  })
})
