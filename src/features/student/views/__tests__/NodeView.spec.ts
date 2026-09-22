import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import type * as VueRouter from 'vue-router'

import type { LessonNodeState } from '@/features/student/composables/useLessonNode'
import { makeTimedCue } from '@/features/student/testing/expandedContent'
import { makeVideoNode } from '@/features/student/testing/contentNode'
import type { components } from '@/api/generated/core-domain'

type ContentNode = components['schemas']['ContentNode']
type ExpandedContent = components['schemas']['ExpandedContent']
type Status = components['schemas']['StudentPathItem']['status']

// The player library needs a real browser; the wrapper around it has its own
// tests, so here it is stubbed and its events are dispatched by hand.
vi.mock('vidstack/player', () => ({}))
vi.mock('vidstack/player/ui', () => ({}))
vi.mock('vidstack/player/styles/base.css', () => ({}))

const push = vi.fn()
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return {
    ...actual,
    useRoute: () => ({ params: { nodeId: 'node-abc' } }),
    useRouter: () => ({ push }),
  }
})

const lesson = {
  state: ref<LessonNodeState>('ready'),
  status: ref<Status | null>('in_progress'),
  node: ref<ContentNode | null>(null),
  cues: ref<ExpandedContent[]>([]),
  hasChallenge: ref(false),
  retry: vi.fn(),
}
vi.mock('@/features/student/composables/useLessonNode', () => ({ useLessonNode: () => lesson }))

const complete = vi.fn()
const useLessonTracking = vi.fn<(source: unknown) => { complete: typeof complete }>(() => ({
  complete,
}))
vi.mock('@/features/student/composables/useLessonTracking', () => ({
  useLessonTracking: (source: unknown) => useLessonTracking(source),
}))

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
    complete.mockReset().mockResolvedValue(undefined)
    useLessonTracking.mockClear()
    lesson.retry.mockReset()
    setLesson({})
  })

  it('reports the lesson it shows to the tracker', async () => {
    await mountView()

    expect(useLessonTracking).toHaveBeenCalledWith(lesson)
  })

  describe('states other than ready', () => {
    it('shows that the lesson is loading', async () => {
      setLesson({ state: 'loading', node: null, status: null })

      const wrapper = await mountView()

      expect(wrapper.find('[data-test="loading"]').exists()).toBe(true)
      expect(wrapper.find('media-player').exists()).toBe(false)
    })

    it('shows an error and lets the student try again', async () => {
      setLesson({ state: 'error', node: null, status: null })

      const wrapper = await mountView()
      await wrapper.get('[data-test="retry"]').trigger('click')

      expect(wrapper.find('[data-test="error"]').exists()).toBe(true)
      expect(lesson.retry).toHaveBeenCalledTimes(1)
    })

    it('shows the locked state for a locked step', async () => {
      setLesson({ state: 'locked', status: 'locked', node: null })

      const wrapper = await mountView()

      expect(wrapper.find('[data-test="locked"]').exists()).toBe(true)
      expect(wrapper.find('media-player').exists()).toBe(false)
    })

    it('says so when the lesson is not on the path', async () => {
      setLesson({ state: 'not-found', node: null, status: null })

      const wrapper = await mountView()

      expect(wrapper.get('[data-test="not-found"]').text()).toContain('Lesson not found')
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
    it('titles the page with the lesson', async () => {
      const wrapper = await mountView()

      expect(wrapper.get('h1').text()).toBe('Minor pentatonic shape 1')
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

    it('links back to the path', async () => {
      const wrapper = await mountView()

      const link = wrapper.findComponent(RouterLinkStub)
      expect(link.props('to')).toEqual({ name: 'path' })
    })

    it('lays the video and its cue out side by side in landscape and stacked in portrait', async () => {
      const wrapper = await mountView()

      const classes = wrapper.get('[data-test="lesson"]').classes()
      expect(classes).toContain('flex-col')
      expect(classes).toContain('landscape:flex-row')
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

      it('announces a cue politely to assistive technology', async () => {
        const wrapper = await mountView()

        expect(wrapper.get('[data-test="cue-region"]').attributes('aria-live')).toBe('polite')
      })
    })

    describe('finishing without a challenge', () => {
      it('offers nothing to do until the video ends', async () => {
        const wrapper = await mountView()

        expect(wrapper.find('[data-test="complete"]').exists()).toBe(false)
        expect(wrapper.find('[data-test="practice-link"]').exists()).toBe(false)
      })

      it('offers to mark the lesson complete once the video ends', async () => {
        const wrapper = await mountView()

        await endVideo(wrapper)

        expect(wrapper.get('[data-test="complete"]').text()).toBe('Mark complete')
        expect(wrapper.find('[data-test="practice-link"]').exists()).toBe(false)
      })

      it('reports completion and goes back to the path', async () => {
        const wrapper = await mountView()
        await endVideo(wrapper)

        await wrapper.get('[data-test="complete"]').trigger('click')
        await settle(wrapper)

        expect(complete).toHaveBeenCalledTimes(1)
        expect(push).toHaveBeenCalledWith({ name: 'path' })
      })

      it('reports completion first, so the event is accepted before the screen changes', async () => {
        const order: string[] = []
        complete.mockImplementation(async () => {
          order.push('complete')
        })
        push.mockImplementation(async () => {
          order.push('push')
        })
        const wrapper = await mountView()
        await endVideo(wrapper)

        await wrapper.get('[data-test="complete"]').trigger('click')
        await settle(wrapper)

        expect(order).toEqual(['complete', 'push'])
      })

      it('acts only once when the button is pressed twice in quick succession', async () => {
        const wrapper = await mountView()
        await endVideo(wrapper)
        const button = wrapper.get<HTMLButtonElement>('[data-test="complete"]').element

        // Both presses land before the screen has had a chance to re-render.
        button.click()
        button.click()
        await settle(wrapper)

        expect(push).toHaveBeenCalledTimes(1)
        expect(complete).toHaveBeenCalledTimes(1)
      })
    })

    describe('finishing a lesson that has a challenge', () => {
      beforeEach(() => {
        setLesson({ hasChallenge: true })
      })

      it('offers to go to practice, and not to mark complete, once the video ends', async () => {
        const wrapper = await mountView()

        await endVideo(wrapper)

        expect(wrapper.get('[data-test="practice-link"]').text()).toBe('Go to practice ›')
        expect(wrapper.find('[data-test="complete"]').exists()).toBe(false)
      })

      it('reports completion and goes to the practice screen', async () => {
        const wrapper = await mountView()
        await endVideo(wrapper)

        await wrapper.get('[data-test="practice-link"]').trigger('click')
        await settle(wrapper)

        expect(complete).toHaveBeenCalledTimes(1)
        expect(push).toHaveBeenCalledWith({ name: 'practice', params: { nodeId: 'node-abc' } })
      })
    })

    describe('when the video cannot be played', () => {
      it('says so instead of offering to finish', async () => {
        const wrapper = await mountView()

        wrapper.get('media-player').element.dispatchEvent(new CustomEvent('error', { detail: {} }))
        await nextTick()

        expect(wrapper.get('[data-test="playback-error"]').text()).toContain(
          "We couldn't play this video",
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

    it('offers a way to practice right away, without waiting for the video to end', async () => {
      const wrapper = await mountView()

      const link = wrapper
        .findAllComponents(RouterLinkStub)
        .find((candidate) => candidate.attributes('data-test') === 'practice-link')
      expect(link?.props('to')).toEqual({ name: 'practice', params: { nodeId: 'node-abc' } })
    })

    it('keeps offering practice, without reporting anything, once the video ends', async () => {
      const wrapper = await mountView()

      await endVideo(wrapper)

      const link = wrapper
        .findAllComponents(RouterLinkStub)
        .find((candidate) => candidate.attributes('data-test') === 'practice-link')
      expect(link?.props('to')).toEqual({ name: 'practice', params: { nodeId: 'node-abc' } })
      expect(complete).not.toHaveBeenCalled()
      expect(wrapper.find('[data-test="complete"]').exists()).toBe(false)
    })

    it('offers nothing to review when the lesson has no challenge', async () => {
      setLesson({ status: 'completed', hasChallenge: false })

      const wrapper = await mountView()
      await endVideo(wrapper)

      expect(wrapper.find('[data-test="practice-link"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="complete"]').exists()).toBe(false)
    })
  })
})
