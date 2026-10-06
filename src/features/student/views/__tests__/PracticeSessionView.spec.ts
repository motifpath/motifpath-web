import { enableAutoUnmount, flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'

type Item = components['schemas']['PracticeSessionItem']
type Plan = components['schemas']['PracticeSessionPlan']

const POST = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST } }),
}))

const track = vi.fn()
vi.mock('@/shared/composables/useEventTracking', () => ({
  useEventTracking: () => ({ track }),
}))

const GUITAR = '22222222-2222-4222-8222-222222222222'
const BASS = '33333333-3333-4333-8333-333333333333'
const PIANO = '44444444-4444-4444-8444-444444444444'

const instruments = {
  instruments: ref([
    { instrument_id: GUITAR, names: { en: 'Guitar' }, family: 'fretted', icon: 'acoustic_guitar', languages: ['en'] },
    { instrument_id: PIANO, names: { en: 'Piano' }, family: 'keyboard', icon: 'piano', languages: ['en'] },
    { instrument_id: BASS, names: { en: 'Electric bass' }, family: 'fretted', icon: 'electric_bass', languages: ['en'] },
  ]),
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

import PracticeSessionView from '@/features/student/views/PracticeSessionView.vue'

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

function plan(items: Item[] = [playAlong(WARM_UP, 'warm_up', 80), playAlong(DUE, 'due', 60)]): Plan {
  return { practice_session_id: SESSION_ID, instrument_id: GUITAR, minutes: 10, items }
}

function mountView() {
  return mount(PracticeSessionView, {
    global: { stubs: { RouterLink: RouterLinkStub, PlayAlongTake: PlayAlongTakeStub, SessionExercise: SessionExerciseStub } },
  })
}

async function startSession(wrapper: ReturnType<typeof mountView>, composed: Plan = plan()) {
  POST.mockResolvedValueOnce({ data: composed, response: { status: 200 } })
  await wrapper.get('[data-test="start-session"]').trigger('click')
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
    instruments.isLoading.value = false
    instruments.error.value = false
  })

  it('offers the instruments a take can be played on as tiles, the first chosen', () => {
    const wrapper = mountView()

    const tiles = wrapper.findAll('[data-test="instrument-tile"]')
    expect(tiles.map((tile) => tile.text())).toEqual(['Guitar', 'Electric bass'])
    expect(tiles.map((tile) => tile.get<HTMLInputElement>('input').element.checked)).toEqual([true, false])
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

  it('ends the session early and shows how it went', async () => {
    const wrapper = mountView()
    await startSession(wrapper)

    await wrapper.get('[data-test="end-session"]').trigger('click')

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
    await wrapper.get('[data-test="end-session"]').trigger('click')

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

  it('asks for another instrument when there is nothing to practise on the chosen one', async () => {
    const wrapper = mountView()
    POST.mockResolvedValueOnce({ error: { message: 'not found' }, response: { status: 404 } })
    await wrapper.get('[data-test="start-session"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('There’s nothing to practise on this instrument yet. Pick another one.')
    expect(wrapper.findAll('[data-test="instrument-tile"]')).toHaveLength(2)
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
      await wrapper.get('[data-test="end-session"]').trigger('click')

      expect(wrapper.get('[data-test="session-done"]').text()).toContain('You answered or rated 1 item.')
      expect(events('practice.session_ended')).toEqual([expect.objectContaining({ answered_count: 1, left_early: true })])
    })
  })
})
