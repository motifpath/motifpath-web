import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import type * as VueRouter from 'vue-router'

import type { LessonNodeState } from '@/features/student/composables/useLessonNode'
import type { MyPathStep } from '@/features/student/utils/myPath'
import { makeTimedCue } from '@/features/student/testing/expandedContent'
import { makeVideoNode } from '@/features/student/testing/contentNode'
import { makeStudentPathItem, makeStudentPathView } from '@/features/student/testing/studentPathItem'
import type { components } from '@/api/generated/core-domain'

type ContentNode = components['schemas']['ContentNode']
type ExpandedContent = components['schemas']['ExpandedContent']
type Status = components['schemas']['StudentPathItem']['status']

function makeStep(position: number, overrides: Partial<MyPathStep> = {}): MyPathStep {
  return {
    position,
    title: `Step ${position}`,
    contentNodeId: `node-${position}`,
    kind: 'video',
    state: 'current',
    availableLanguages: [],
    ...overrides,
  }
}

// The player library needs a real browser; the wrapper around it has its own
// tests, so here it is stubbed and its events are dispatched by hand.
vi.mock('vidstack/player', () => ({}))
vi.mock('vidstack/player/ui', () => ({}))
vi.mock('vidstack/player/styles/base.css', () => ({}))

const push = vi.fn()
const replace = vi.fn()
const route: { params: { nodeId: string }; query: Record<string, string> } = { params: { nodeId: 'node-abc' }, query: {} }
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return {
    ...actual,
    useRoute: () => route,
    useRouter: () => ({ push, replace }),
  }
})

const lesson = {
  state: ref<LessonNodeState>('ready'),
  status: ref<Status | null>('in_progress'),
  node: ref<ContentNode | null>(null),
  cues: ref<ExpandedContent[]>([]),
  hasChallenge: ref(false),
  completedCourseEnrollmentId: ref<string | null>(null),
  pathTitle: ref<string | null>('Blues Basics'),
  step: ref<MyPathStep | null>(null),
  next: ref<MyPathStep | null>(null),
  current: ref<MyPathStep | null>(null),
  total: ref(14),
  retry: vi.fn(),
}
type LessonOptions = { language?: () => string | undefined }
const useLessonNode = vi.fn<(nodeId: unknown, options?: LessonOptions) => typeof lesson>(() => lesson)
vi.mock('@/features/student/composables/useLessonNode', () => ({
  useLessonNode: (nodeId: unknown, options?: LessonOptions) => useLessonNode(nodeId, options),
}))

// The button has its own tests; here only where it appears and what it is given.
vi.mock('@/features/student/components/SendToTeacher.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'SendToTeacher',
      props: { reference: String, pathTitle: String, lessonTitle: String, raised: Boolean },
      setup: () => () => h('div', { 'data-test': 'send-to-teacher-stub' }),
    }),
  }
})

const waitForCompletion = vi.fn()
vi.mock('@/features/student/composables/useLessonCompletionSync', () => ({
  useLessonCompletionSync: () => ({ waitForCompletion }),
}))

// A real device's width and height are independent — a phone rotated to
// landscape is wide but short. Tests drive this directly rather than via
// window.matchMedia, since useMediaQuery's own reactivity to the query is
// already covered by its own tests.
const isShortViewport = ref(false)
// Short in height only — a phone rotated to landscape, not an upright phone.
const isShortHeight = ref(false)
vi.mock('@/shared/composables/useMediaQuery', () => ({
  useMediaQuery: (query: string) => ({ matches: query === '(max-height: 500px)' ? isShortHeight : isShortViewport }),
}))

const complete = vi.fn()
const useLessonTracking = vi.fn<(source: unknown) => { complete: typeof complete }>(() => ({
  complete,
}))
vi.mock('@/features/student/composables/useLessonTracking', () => ({
  useLessonTracking: (source: unknown) => useLessonTracking(source),
}))

// The card loads its own chart and has its own tests; here it is a button that opens its chart the
// way the lesson says, so the lesson's handling of it can be checked.
vi.mock('@/shared/components/songChart/SongChartCard.vue', async () => {
  const { defineComponent, h, inject } = await import('vue')
  const { SONG_CHART_OPENER } = await import('@/shared/components/songChart/songChartOpener')
  return {
    default: defineComponent({
      name: 'SongChartCard',
      props: { songChartId: { type: String, required: true } },
      setup(props) {
        const open = inject(SONG_CHART_OPENER, null)
        return () => h('button', { 'data-test': 'song-chart-card', onClick: () => open?.(props.songChartId) })
      },
    }),
  }
})
// The reader page has its own tests; here only whether the lesson shows it, and closes it.
vi.mock('@/shared/components/songChart/SongChartScreen.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'SongChartScreen',
      props: { songChartId: { type: String, required: true } },
      emits: ['close'],
      setup: (props, { emit }) => () =>
        h('div', { 'data-test': 'song-chart-screen', 'data-song-chart-id': props.songChartId }, [
          h('button', { 'data-test': 'close-song-chart', onClick: () => emit('close') }),
        ]),
    }),
  }
})

import NodeView from '@/features/student/views/NodeView.vue'

function setLesson(next: {
  state?: LessonNodeState
  status?: Status | null
  cues?: ExpandedContent[]
  hasChallenge?: boolean
  node?: ContentNode | null
}) {
  lesson.state.value = next.state ?? 'ready'
  lesson.status.value = next.status === undefined ? 'in_progress' : next.status
  lesson.cues.value = next.cues ?? []
  lesson.hasChallenge.value = next.hasChallenge ?? false
  lesson.node.value = next.node === undefined ? makeVideoNode('node-abc') : next.node
  lesson.step.value = makeStep(8, { contentNodeId: 'node-abc', state: lesson.status.value === 'completed' ? 'done' : 'current' })
  lesson.next.value = makeStep(9, { state: 'open' })
  lesson.current.value = null
  lesson.total.value = 14
}

/**
 * Waits for the lazily loaded player. While it loads the view shows a
 * placeholder, so its disappearance means the player is in — and a screen that
 * never loads a player has no placeholder to wait for.
 */
async function settle(wrapper: Pick<ReturnType<typeof mount>, 'find'>) {
  await flushPromises()
  await vi.waitFor(() => {
    expect(wrapper.find('[data-test="player-loading"]').exists()).toBe(false)
  })
}

async function mountView() {
  const wrapper = mount(NodeView, { global: { stubs: { RouterLink: RouterLinkStub } } })
  await settle(wrapper)
  return wrapper
}

type Wrapper = Awaited<ReturnType<typeof mountView>>

async function playTo(wrapper: Wrapper, seconds: number) {
  wrapper
    .get('media-player')
    .element.dispatchEvent(new CustomEvent('time-update', { detail: { currentTime: seconds } }))
  await nextTick()
}

async function endVideo(wrapper: Wrapper) {
  wrapper.get('media-player').element.dispatchEvent(new Event('ended'))
  await nextTick()
}

describe('NodeView', () => {
  beforeEach(() => {
    push.mockReset()
    replace.mockReset()
    waitForCompletion.mockReset().mockResolvedValue({ kind: 'recorded' })
    lesson.completedCourseEnrollmentId.value = null
    complete.mockReset().mockResolvedValue(undefined)
    useLessonTracking.mockClear()
    lesson.retry.mockReset()
    isShortViewport.value = false
    isShortHeight.value = false
    setLesson({})
  })

  it('takes the student to the course-completed screen when loading the lesson finds their course just completed', async () => {
    lesson.completedCourseEnrollmentId.value = 'ce-1'

    await mountView()

    expect(replace).toHaveBeenCalledWith({ name: 'course-completed', params: { enrollmentId: 'ce-1' } })
  })

  it('opens the lesson in the language the student chose from the path', async () => {
    route.query = { language: 'en' }
    await mountView()

    const options = useLessonNode.mock.calls.at(-1)?.[1]
    expect(options?.language?.()).toBe('en')
    route.query = {}
  })

  it('reports the lesson it shows to the tracker', async () => {
    await mountView()

    expect(useLessonTracking).toHaveBeenCalledWith(lesson)
  })

  describe('the pushed page', () => {
    it('leads back to My path, named by the path title', async () => {
      const wrapper = await mountView()

      const back = wrapper.getComponent({ name: 'PageBackBar' })
      expect(back.props('to')).toEqual({ name: 'path' })
      expect(back.props('title')).toBe('Blues Basics')
    })

    it.each<LessonNodeState>(['loading', 'error', 'locked', 'language-locked', 'not-found'])(
      'keeps the way back while the lesson is %s',
      async (state) => {
        setLesson({ state, node: null })

        const wrapper = await mountView()

        expect(wrapper.findComponent({ name: 'PageBackBar' }).exists()).toBe(true)
      },
    )
  })

  describe('states other than ready', () => {
    it('shows a skeleton in the shape of a video lesson while it loads', async () => {
      setLesson({ state: 'loading', node: null, status: null })

      const wrapper = await mountView()

      expect(wrapper.getComponent({ name: 'LoadingSkeleton' }).props('shape')).toBe('video')
      expect(wrapper.find('media-player').exists()).toBe(false)
    })

    it('shows an error and lets the student try again', async () => {
      setLesson({ state: 'error', node: null, status: null })

      const wrapper = await mountView()
      await wrapper.get('[data-test="retry"]').trigger('click')

      expect(wrapper.find('[data-test="error"]').exists()).toBe(true)
      expect(lesson.retry).toHaveBeenCalledTimes(1)
    })

    it('explains a step locked behind an earlier one, and offers the step that opens it', async () => {
      setLesson({ state: 'locked', status: 'locked', node: null })
      lesson.current.value = makeStep(8, { title: 'Inversions on the top strings' })

      const wrapper = await mountView()

      const locked = wrapper.get('[data-test="locked"]')
      expect(locked.text()).toContain('This step opens later')
      expect(locked.text()).toContain('Finish step 8, “Inversions on the top strings”, first. Steps open one by one.')
      expect(wrapper.getComponent<typeof RouterLinkStub>('[data-test="locked-action"]').props('to')).toEqual({
        name: 'node',
        params: { nodeId: 'node-8' },
      })
      expect(wrapper.get('[data-test="locked-action"]').text()).toBe('Go to step 8')
      expect(wrapper.find('media-player').exists()).toBe(false)
    })

    it('opens the step that opens it without choosing a language, so a language-locked one explains itself', async () => {
      setLesson({ state: 'locked', status: 'locked', node: null })
      lesson.current.value = makeStep(8, { state: 'language', availableLanguages: ['en'] })

      const wrapper = await mountView()

      expect(wrapper.getComponent<typeof RouterLinkStub>('[data-test="locked-action"]').props('to')).toEqual({
        name: 'node',
        params: { nodeId: 'node-8' },
      })
    })

    it('offers My path from a locked step when no step can be done now', async () => {
      setLesson({ state: 'locked', status: 'locked', node: null })

      const wrapper = await mountView()

      expect(wrapper.getComponent<typeof RouterLinkStub>('[data-test="locked-action"]').props('to')).toEqual({ name: 'path' })
    })

    it('explains a language-locked step in place and opens it in the language it has, without loading the video first', async () => {
      setLesson({ state: 'language-locked', status: 'locked', node: null })
      lesson.step.value = makeStep(8, { state: 'language', availableLanguages: ['en'] })

      const wrapper = await mountView()

      const block = wrapper.get('[data-test="language-locked"]')
      expect(block.text()).toContain('This lesson is only in English for now.')
      expect(wrapper.get('[data-test="language-action"]').text()).toBe('Watch in English')
      expect(wrapper.getComponent<typeof RouterLinkStub>('[data-test="language-action"]').props('to')).toEqual({
        name: 'node',
        params: { nodeId: 'node-8' },
        query: { language: 'en' },
      })
      expect(wrapper.find('media-player').exists()).toBe(false)
    })

    it('sends a step that is no longer on the path back to My path', async () => {
      setLesson({ state: 'not-found', node: null, status: null })

      const wrapper = await mountView()

      expect(wrapper.get('[data-test="not-found"]').text()).toContain("This lesson isn't on your path")
      expect(wrapper.getComponent<typeof RouterLinkStub>('[data-test="not-found-action"]').props('to')).toEqual({ name: 'path' })
    })

    it('says so when a video step has no video, and lets the student try again', async () => {
      setLesson({ state: 'no-media' })

      const wrapper = await mountView()
      await wrapper.get('[data-test="retry"]').trigger('click')

      expect(wrapper.get('[data-test="no-video"]').text()).toContain("doesn't have a video yet")
      expect(lesson.retry).toHaveBeenCalledTimes(1)
    })

    it('keeps the holding screen for a step whose content type has no lesson screen yet', async () => {
      setLesson({ state: 'unsupported' })

      const wrapper = await mountView()

      expect(wrapper.get('[data-test="unsupported"]').text()).toContain("isn't available yet")
      expect(wrapper.find('media-player').exists()).toBe(false)
    })
  })

  describe('a lesson that is ready', () => {
    it('titles the page with the lesson, under the video', async () => {
      const wrapper = await mountView()

      const html = wrapper.html()
      expect(wrapper.get('h1').text()).toBe('Minor pentatonic shape 1')
      expect(html.indexOf('<media-player')).toBeLessThan(html.indexOf('<h1'))
    })

    it('says where the step sits and what kind it is, with no length', async () => {
      const wrapper = await mountView()

      expect(wrapper.get('[data-test="step-meta"]').text()).toBe('Step 8 of 14 · Video')
    })

    it('plays the lesson video', async () => {
      const wrapper = await mountView()

      expect(wrapper.get('media-player').attributes('src')).toBe(
        'https://cdn.example.test/lesson.mp4',
      )
    })

    it('loads the player only when a lesson is opened, not with the screen', () => {
      const wrapper = mount(NodeView, { global: { stubs: { RouterLink: RouterLinkStub } } })

      expect(wrapper.find('media-player').exists()).toBe(false)
    })
    describe('cues', () => {
      const cue = makeTimedCue('a', 5, 10)

      beforeEach(() => {
        setLesson({ cues: [cue] })
      })

      it('shows no cue before the first one is due', async () => {
        const wrapper = await mountView()

        await playTo(wrapper, 2)

        expect(wrapper.find('[data-test="cue"]').exists()).toBe(false)
      })

      it('shows the cue while its window is open and takes it away once it closes', async () => {
        const wrapper = await mountView()

        await playTo(wrapper, 6)
        expect(wrapper.find('[data-test="cue"] img').attributes('src')).toBe(
          'https://cdn.example.test/a.png',
        )

        await playTo(wrapper, 10)
        expect(wrapper.find('[data-test="cue"]').exists()).toBe(false)
      })

      it('shows the cue again when the student seeks back into its window', async () => {
        const wrapper = await mountView()

        await playTo(wrapper, 12)
        await playTo(wrapper, 7)

        expect(wrapper.find('[data-test="cue"]').exists()).toBe(true)
      })

      it('announces a cue politely to assistive technology, and keeps that region mounted between cues', async () => {
        const wrapper = await mountView()

        expect(wrapper.get('[data-test="cue-region"]').attributes('aria-live')).toBe('polite')

        await playTo(wrapper, 20) // past the only cue's window

        expect(wrapper.get('[data-test="cue-region"]').attributes('aria-live')).toBe('polite')
      })

      it('gives the cue a fixed width, not a share of the video, so a wider screen keeps the video full size', async () => {
        const wrapper = await mountView()

        const classes = wrapper.get('[data-test="player-aside"]').classes()
        expect(classes).toContain('landscape:w-80')
        expect(classes).not.toContain('landscape:w-1/3')
      })
    })

    describe('when a video with no challenge ends', () => {
      it('offers nothing to do until the video ends', async () => {
        const wrapper = await mountView()

        expect(wrapper.find('[data-test="step-done"]').exists()).toBe(false)
        expect(wrapper.find('[data-test="practise-this"]').exists()).toBe(false)
        expect(complete).not.toHaveBeenCalled()
      })

      it('completes the step, waiting until it is recorded so the next step has opened', async () => {
        const order: string[] = []
        complete.mockImplementation(async () => {
          order.push('complete')
        })
        waitForCompletion.mockImplementation(async (nodeId: string) => {
          order.push(`wait:${nodeId}`)
          return { kind: 'recorded' }
        })
        const wrapper = await mountView()

        await endVideo(wrapper)
        await flushPromises()

        expect(order).toEqual(['complete', 'wait:node-abc'])
      })

      it('says the step is done and offers the next step, with My path as the quiet way out', async () => {
        const wrapper = await mountView()

        await endVideo(wrapper)
        await flushPromises()

        expect(wrapper.get('[data-test="step-done"]').text()).toBe('Step done')
        const card = wrapper.getComponent({ name: 'NextStepCard' })
        expect(card.props()).toMatchObject({
          eyebrow: 'Up next · step 9 of 14',
          title: 'Step 9',
          actionLabel: 'Start lesson',
          to: { name: 'node', params: { nodeId: 'node-9' } },
        })
        expect(wrapper.getComponent<typeof RouterLinkStub>('[data-test="back-to-my-path"]').props('to')).toEqual({ name: 'path' })
      })

      it('offers the next step as the path has it once this one is recorded', async () => {
        // Read before this step was done, the path shows step 9 waiting behind it; recorded, step 9
        // turns out to be in English only.
        lesson.next.value = makeStep(9, { state: 'locked' })
        waitForCompletion.mockResolvedValue({
          kind: 'recorded',
          view: makeStudentPathView([
            { ...makeStudentPathItem(8, undefined, 'completed'), content_node_id: 'node-abc' },
            { ...makeStudentPathItem(9, undefined, 'locked'), lock_reason: 'language', available_languages: [{ code: 'en', name: 'English' }] },
          ]),
        })
        const wrapper = await mountView()

        await endVideo(wrapper)
        await flushPromises()

        expect(wrapper.getComponent({ name: 'NextStepCard' }).props()).toMatchObject({
          actionLabel: 'Watch in English',
          to: { name: 'node', params: { nodeId: 'node-9' }, query: { language: 'en' } },
        })
      })

      it('falls back to the next step the lesson loaded with when no fresh path came back, offering it as a lesson', async () => {
        lesson.next.value = makeStep(9, { state: 'locked' })
        waitForCompletion.mockResolvedValue({ kind: 'timed-out' })
        const wrapper = await mountView()

        await endVideo(wrapper)
        await flushPromises()

        expect(wrapper.getComponent({ name: 'NextStepCard' }).props()).toMatchObject({
          actionLabel: 'Start lesson',
          to: { name: 'node', params: { nodeId: 'node-9' } },
        })
      })

      it('offers only My path after the last step', async () => {
        lesson.next.value = null
        const wrapper = await mountView()

        await endVideo(wrapper)
        await flushPromises()

        expect(wrapper.find('[data-test="step-done"]').exists()).toBe(true)
        expect(wrapper.findComponent({ name: 'NextStepCard' }).exists()).toBe(false)
        expect(wrapper.find('[data-test="back-to-my-path"]').exists()).toBe(true)
      })

      it('announces the saving and then the step done in one live region, mounted before the video ends', async () => {
        let settleWait: (outcome: unknown) => void = () => {}
        waitForCompletion.mockImplementation(() => new Promise((resolve) => (settleWait = resolve)))
        const wrapper = await mountView()
        const region = wrapper.get('[data-test="hand-off-status"]')
        expect(region.attributes('role')).toBe('status')

        await endVideo(wrapper)
        await flushPromises()
        expect(wrapper.get('[data-test="hand-off-status"]').element).toBe(region.element)
        expect(region.text()).toBe('Saving your progress…')

        settleWait({ kind: 'recorded' })
        await flushPromises()
        expect(wrapper.get('[data-test="hand-off-status"]').element).toBe(region.element)
        expect(region.text()).toBe('Step done')
      })

      it('shows nothing to tap while the completion is being recorded', async () => {
        waitForCompletion.mockImplementation(() => new Promise(() => {}))
        const wrapper = await mountView()

        await endVideo(wrapper)
        await flushPromises()

        expect(wrapper.find('[data-test="saving-progress"]').exists()).toBe(true)
        expect(wrapper.findComponent({ name: 'NextStepCard' }).exists()).toBe(false)
      })

      it('still offers the next step when the completion is slow to be recorded', async () => {
        waitForCompletion.mockResolvedValue({ kind: 'timed-out' })
        const wrapper = await mountView()

        await endVideo(wrapper)
        await flushPromises()

        expect(wrapper.findComponent({ name: 'NextStepCard' }).exists()).toBe(true)
      })

      it('goes straight to the course-completed screen when this lesson finished the course', async () => {
        waitForCompletion.mockResolvedValue({ kind: 'course-completed', enrollmentId: 'ce-1' })
        const wrapper = await mountView()

        await endVideo(wrapper)
        await flushPromises()

        expect(replace).toHaveBeenCalledWith({ name: 'course-completed', params: { enrollmentId: 'ce-1' } })
      })

      it('still shows the course-completed screen if the student left during the wait that discovered it', async () => {
        let settleWait: (outcome: unknown) => void = () => {}
        waitForCompletion.mockImplementation(() => new Promise((resolve) => (settleWait = resolve)))
        const wrapper = await mountView()
        await endVideo(wrapper)
        await flushPromises()

        wrapper.unmount()
        settleWait({ kind: 'course-completed', enrollmentId: 'ce-1' })
        await flushPromises()

        expect(replace).toHaveBeenCalledWith({ name: 'course-completed', params: { enrollmentId: 'ce-1' } })
      })

      it('completes the step once, however often the video ends', async () => {
        const wrapper = await mountView()

        await endVideo(wrapper)
        await endVideo(wrapper)
        await flushPromises()

        expect(complete).toHaveBeenCalledTimes(1)
        expect(waitForCompletion).toHaveBeenCalledTimes(1)
      })
    })

    describe('when a video with a challenge ends', () => {
      beforeEach(() => {
        setLesson({ hasChallenge: true })
      })

      it('reports the lesson and offers Practise this, which starts the challenge', async () => {
        const wrapper = await mountView()

        await endVideo(wrapper)
        await flushPromises()

        expect(complete).toHaveBeenCalledTimes(1)
        expect(wrapper.get('[data-test="try-it"]').text()).toContain('Now try it')
        const practise = wrapper.getComponent<typeof RouterLinkStub>('[data-test="practise-this"]')
        expect(practise.text()).toBe('Practise this')
        expect(practise.props('to')).toEqual({ name: 'practice', params: { nodeId: 'node-abc' } })
      })

      it('does not say the step is done, nor wait for it: the challenge finishes it', async () => {
        const wrapper = await mountView()

        await endVideo(wrapper)
        await flushPromises()

        expect(wrapper.find('[data-test="step-done"]').exists()).toBe(false)
        expect(waitForCompletion).not.toHaveBeenCalled()
      })
    })
    describe('when the video cannot be played', () => {
      it('says so instead of offering to finish', async () => {
        const wrapper = await mountView()

        wrapper.get('media-player').element.dispatchEvent(new CustomEvent('error', { detail: {} }))
        await nextTick()

        expect(wrapper.get('[data-test="playback-error"]').text()).toContain(
          "The video didn't load",
        )
        expect(wrapper.find('[data-test="complete"]').exists()).toBe(false)
      })

      it('loads the video again when the student tries again', async () => {
        const wrapper = await mountView()
        wrapper.get('media-player').element.dispatchEvent(new CustomEvent('error', { detail: {} }))
        await nextTick()

        await wrapper.get('[data-test="playback-error"] [data-test="retry"]').trigger('click')
        await settle(wrapper)

        expect(wrapper.find('[data-test="playback-error"]').exists()).toBe(false)
        expect(wrapper.find('media-player').exists()).toBe(true)
      })

      it('hides the video rather than tearing it down, so a cue region stays mounted through the error', async () => {
        setLesson({ cues: [makeTimedCue('a', 5, 10)] })
        const wrapper = await mountView()
        const region = wrapper.get('[data-test="cue-region"]').element

        wrapper.get('media-player').element.dispatchEvent(new CustomEvent('error', { detail: {} }))
        await nextTick()

        expect(wrapper.get('[data-test="cue-region"]').element).toBe(region)
        expect(wrapper.get('[data-test="lesson"]').isVisible()).toBe(false)
      })

      it('keeps the cue region mounted through a retry too', async () => {
        setLesson({ cues: [makeTimedCue('a', 5, 10)] })
        const wrapper = await mountView()
        const region = wrapper.get('[data-test="cue-region"]').element
        wrapper.get('media-player').element.dispatchEvent(new CustomEvent('error', { detail: {} }))
        await nextTick()

        await wrapper.get('[data-test="playback-error"] [data-test="retry"]').trigger('click')
        await settle(wrapper)

        expect(wrapper.get('[data-test="cue-region"]').element).toBe(region)
        expect(wrapper.get('[data-test="lesson"]').isVisible()).toBe(true)
      })

      it('offers nothing to finish while the video is failing, even once it has ended once before', async () => {
        const wrapper = await mountView()
        await endVideo(wrapper)

        wrapper.get('media-player').element.dispatchEvent(new CustomEvent('error', { detail: {} }))
        await nextTick()

        expect(wrapper.find('[data-test="complete"]').exists()).toBe(false)
        expect(wrapper.find('[data-test="practice-link"]').exists()).toBe(false)
      })
    })
  })

  describe('reopening a completed lesson', () => {
    beforeEach(() => {
      setLesson({ status: 'completed', hasChallenge: true })
    })

    it('shows the video like any other lesson, not starting on its own', async () => {
      const wrapper = await mountView()

      expect(wrapper.get('media-player').attributes('src')).toBe(
        'https://cdn.example.test/lesson.mp4',
      )
      expect(wrapper.get('media-player').attributes('autoplay')).toBeUndefined()
    })

    it('says the step is done in its title block', async () => {
      const wrapper = await mountView()

      expect(wrapper.get('[data-test="step-meta"]').text()).toBe('Step 8 of 14 · Video · Done')
    })

    it('offers Practise again right away, as a secondary action', async () => {
      const wrapper = await mountView()

      const practise = wrapper.getComponent({ name: 'AppButton' })
      expect(practise.attributes('data-test')).toBe('practise-again')
      expect(practise.props()).toMatchObject({ variant: 'secondary', to: { name: 'practice', params: { nodeId: 'node-abc' } } })
      expect(practise.text()).toBe('Practise again')
    })

    it('keeps offering only Practise again, without reporting anything, once the video ends', async () => {
      const wrapper = await mountView()

      await endVideo(wrapper)
      await flushPromises()

      expect(wrapper.find('[data-test="practise-again"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="step-done"]').exists()).toBe(false)
      expect(complete).not.toHaveBeenCalled()
      expect(waitForCompletion).not.toHaveBeenCalled()
    })

    it('offers nothing when the lesson has no challenge', async () => {
      setLesson({ status: 'completed', hasChallenge: false })

      const wrapper = await mountView()
      await endVideo(wrapper)
      await flushPromises()

      expect(wrapper.find('[data-test="practise-again"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="step-done"]').exists()).toBe(false)
    })
  })
  describe('send to your teacher', () => {
    it('is offered on the lesson with its reference, path title and lesson title', async () => {
      setLesson({ node: { ...makeVideoNode('node-abc'), title: 'Shuffle in E' } })

      const wrapper = await mountView()

      const button = wrapper.findComponent({ name: 'SendToTeacher' })
      expect(button.exists()).toBe(true)
      expect(button.props()).toEqual({
        reference: 'L-node-abc',
        pathTitle: 'Blues Basics',
        lessonTitle: 'Shuffle in E',
        raised: false,
      })
    })

    it('floats higher on a short screen, clear of the player controls a full-height video puts at the bottom', async () => {
      isShortViewport.value = true
      isShortHeight.value = true
      setLesson({})

      const wrapper = await mountView()

      expect(wrapper.findComponent({ name: 'SendToTeacher' }).props('raised')).toBe(true)
    })

    it('stays in its low corner on an upright phone, whose video does not reach the bottom', async () => {
      isShortViewport.value = true
      setLesson({})

      const wrapper = await mountView()

      expect(wrapper.findComponent({ name: 'SendToTeacher' }).props('raised')).toBe(false)
    })

    it.each<LessonNodeState>(['unsupported', 'no-media'])('is offered on an unlocked %s lesson', async (state) => {
      setLesson({ state })

      const wrapper = await mountView()

      expect(wrapper.findComponent({ name: 'SendToTeacher' }).exists()).toBe(true)
    })

    it.each<LessonNodeState>(['loading', 'locked', 'language-locked', 'not-found', 'error'])(
      'is not offered while the lesson is %s',
      async (state) => {
        setLesson({ state, node: null })

        const wrapper = mount(NodeView, { global: { stubs: { RouterLink: RouterLinkStub } } })
        await flushPromises()

        expect(wrapper.findComponent({ name: 'SendToTeacher' }).exists()).toBe(false)
      },
    )
  })

  describe('a song chart in a cue', () => {
    function songChartCue(): ExpandedContent {
      return {
        ...makeTimedCue('cue-chart', 30, 60),
        content_type: 'rich_text',
        media_url: undefined,
        rich_content: { type: 'doc', content: [{ type: 'songChart', attrs: { songChartId: 'chart-asa-branca' } }] },
      }
    }

    async function atTheCue() {
      setLesson({ cues: [songChartCue()] })
      const wrapper = await mountView()
      await playTo(wrapper, 31)
      const pause = vi.fn()
      Object.assign(wrapper.get('media-player').element, { pause })
      return { wrapper, pause }
    }

    it('shows the card while the cue is on', async () => {
      const { wrapper } = await atTheCue()

      expect(wrapper.find('[data-test="song-chart-card"]').exists()).toBe(true)
    })

    it('pauses the video and opens the reader over the lesson when the card is tapped', async () => {
      const { wrapper, pause } = await atTheCue()

      await wrapper.get('[data-test="song-chart-card"]').trigger('click')

      expect(pause).toHaveBeenCalled()
      expect(wrapper.get('[data-test="song-chart-screen"]').attributes('data-song-chart-id')).toBe('chart-asa-branca')
      expect(push).not.toHaveBeenCalled()
    })

    it('returns to the lesson, still paused, when the reader closes', async () => {
      const { wrapper } = await atTheCue()
      await wrapper.get('[data-test="song-chart-card"]').trigger('click')
      const play = vi.fn()
      Object.assign(wrapper.get('media-player').element, { play })

      await wrapper.get('[data-test="close-song-chart"]').trigger('click')

      expect(wrapper.find('[data-test="song-chart-screen"]').exists()).toBe(false)
      expect(wrapper.find('media-player').exists()).toBe(true)
      expect(play).not.toHaveBeenCalled()
    })
  })
})
