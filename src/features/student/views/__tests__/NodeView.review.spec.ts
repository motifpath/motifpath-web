import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import type * as VueRouter from 'vue-router'

import type { LessonNodeState } from '@/features/student/composables/useLessonNode'
import type { ReviewNext, ReviewOwner, ReviewPlace } from '@/features/student/composables/useReviewLessonNode'
import { makeArticleNode, makeVideoNode } from '@/features/student/testing/contentNode'
import type { components } from '@/api/generated/core-domain'

type ContentNode = components['schemas']['ContentNode']
type ExpandedContent = components['schemas']['ExpandedContent']
type Status = components['schemas']['StudentPathItem']['status']

// The player library needs a real browser; here its events are dispatched by hand.
vi.mock('vidstack/player', () => ({}))
vi.mock('vidstack/player/ui', () => ({}))
vi.mock('vidstack/player/styles/base.css', () => ({}))

const push = vi.fn()
const replace = vi.fn()
const route = { name: 'review-lesson', params: { studentPathId: 'part-1', nodeId: 'node-2' }, query: {} }
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return { ...actual, useRoute: () => route, useRouter: () => ({ push, replace }) }
})

const courseOwner: ReviewOwner = { title: 'Music reading 101', to: { name: 'learning-course', params: { courseId: 'course-1' } } }

const review = {
  state: ref<LessonNodeState>('ready'),
  status: ref<Status | null>('completed'),
  node: ref<ContentNode | null>(null),
  cues: ref<ExpandedContent[]>([]),
  hasChallenge: ref(false),
  owner: ref<ReviewOwner | null>(courseOwner),
  place: ref<ReviewPlace | null>(null),
  next: ref<ReviewNext | null>(null),
  retry: vi.fn(),
}
const useReviewLessonNode = vi.fn<(studentPathId: () => string, nodeId: unknown) => typeof review>(() => review)
vi.mock('@/features/student/composables/useReviewLessonNode', () => ({
  useReviewLessonNode: (studentPathId: () => string, nodeId: unknown) => useReviewLessonNode(studentPathId, nodeId),
}))

const useLessonNode = vi.fn()
vi.mock('@/features/student/composables/useLessonNode', () => ({ useLessonNode: () => useLessonNode() }))

const useLessonTracking = vi.fn<(source: unknown, options?: { review?: boolean }) => { complete: () => Promise<void> }>(
  () => ({ complete: vi.fn() }),
)
vi.mock('@/features/student/composables/useLessonTracking', () => ({
  useLessonTracking: (source: unknown, options?: { review?: boolean }) => useLessonTracking(source, options),
}))

const waitForCompletion = vi.fn()
vi.mock('@/features/student/composables/useLessonCompletionSync', () => ({
  useLessonCompletionSync: () => ({ waitForCompletion }),
}))

vi.mock('@/shared/composables/useMediaQuery', () => ({ useMediaQuery: () => ({ matches: ref(false) }) }))

vi.mock('@/features/student/components/SendToTeacher.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'SendToTeacher',
      props: { reference: String, pathTitle: String, lessonTitle: String, raised: Boolean },
      setup: () => () => h('div'),
    }),
  }
})

import NodeView from '@/features/student/views/NodeView.vue'

const partPlace: ReviewPlace = { part: 1, lesson: 2, total: 5, kind: 'video' }
const nextLesson: ReviewNext = {
  studentPathId: 'part-1',
  contentNodeId: 'node-3',
  title: 'Bass clef',
  kind: 'article',
  place: { part: 1, lesson: 3, total: 5, kind: 'article' },
}

function setReview(next: { node?: ContentNode; place?: ReviewPlace; next?: ReviewNext | null; hasChallenge?: boolean; state?: LessonNodeState; owner?: ReviewOwner } = {}) {
  review.state.value = next.state ?? 'ready'
  review.status.value = 'completed'
  review.node.value = next.node ?? makeVideoNode('node-2', { title: 'Treble clef' })
  review.cues.value = []
  review.hasChallenge.value = next.hasChallenge ?? false
  review.owner.value = next.owner ?? courseOwner
  review.place.value = next.place ?? partPlace
  review.next.value = next.next === undefined ? nextLesson : next.next
}

async function mountView() {
  const wrapper = mount(NodeView, { global: { stubs: { RouterLink: RouterLinkStub } } })
  await flushPromises()
  await vi.waitFor(() => {
    expect(wrapper.find('[data-test="player-loading"]').exists()).toBe(false)
  })
  return wrapper
}

type Wrapper = Awaited<ReturnType<typeof mountView>>

async function endVideo(wrapper: Wrapper) {
  wrapper.get('media-player').element.dispatchEvent(new Event('ended'))
  await nextTick()
}

describe('NodeView reviewing a finished course or path', () => {
  beforeEach(() => {
    push.mockReset()
    replace.mockReset()
    waitForCompletion.mockReset()
    useLessonNode.mockReset()
    useLessonTracking.mockClear()
    useReviewLessonNode.mockClear()
    setReview()
  })

  it('loads the lesson from the finished course or path, never from My path', async () => {
    await mountView()

    expect(useReviewLessonNode.mock.calls[0]?.[0]()).toBe('part-1')
    expect(useLessonNode).not.toHaveBeenCalled()
  })

  it('reports the lesson as opened for review', async () => {
    await mountView()

    expect(useLessonTracking).toHaveBeenCalledWith(expect.anything(), { review: true })
  })

  describe('the pushed page', () => {
    it('leads back to the finished course, named by the course', async () => {
      const wrapper = await mountView()

      const back = wrapper.getComponent({ name: 'PageBackBar' })
      expect(back.props('title')).toBe('Music reading 101')
      expect(back.props('to')).toEqual(courseOwner.to)
    })

    it('names the part and the lesson’s place in it', async () => {
      const wrapper = await mountView()

      expect(wrapper.get('[data-test="step-meta"]').text()).toBe('Part 1 · Lesson 2 of 5 · Video · Done')
    })

    it('names the lesson’s place in a standalone path', async () => {
      setReview({ place: { part: null, lesson: 4, total: 9, kind: 'video' } })
      const wrapper = await mountView()

      expect(wrapper.get('[data-test="step-meta"]').text()).toBe('Lesson 4 of 9 · Video · Done')
    })
  })

  describe('when the lesson ends', () => {
    it('offers the next lesson of the course, with a quiet way back to it', async () => {
      const wrapper = await mountView()

      await endVideo(wrapper)

      const card = wrapper.getComponent({ name: 'NextStepCard' })
      expect(card.props('eyebrow')).toBe('Up next · Part 1 · Lesson 3 of 5')
      expect(card.props('title')).toBe('Bass clef')
      expect(card.props('to')).toEqual({ name: 'review-lesson', params: { studentPathId: 'part-1', nodeId: 'node-3' } })
      expect(wrapper.get('[data-test="back-to-owner"]').text()).toBe('Back to Music reading 101')
    })

    it('completes nothing and says no step is done', async () => {
      const wrapper = await mountView()

      await endVideo(wrapper)

      expect(waitForCompletion).not.toHaveBeenCalled()
      expect(wrapper.find('[data-test="step-done"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="back-to-my-path"]').exists()).toBe(false)
    })

    it('after the last lesson of the course, leads to Learning instead', async () => {
      setReview({ next: null })
      const wrapper = await mountView()

      await endVideo(wrapper)

      expect(wrapper.get('[data-test="last-lesson"]').text()).toBe('That was the last lesson of Music reading 101.')
      expect(wrapper.get('[data-test="go-to-learning"]').findComponent(RouterLinkStub).props('to')).toEqual({ name: 'my-courses' })
      expect(wrapper.findComponent({ name: 'NextStepCard' }).exists()).toBe(false)
      expect(replace).not.toHaveBeenCalled()
      expect(push).not.toHaveBeenCalled()
    })

    it('stays on the lesson until the student chooses where to go', async () => {
      const wrapper = await mountView()

      await endVideo(wrapper)

      expect(push).not.toHaveBeenCalled()
      expect(replace).not.toHaveBeenCalled()
    })

    it('ends an article with the way on too', async () => {
      setReview({ node: makeArticleNode('node-2', ['One paragraph.']) })
      const wrapper = await mountView()

      expect(wrapper.findComponent({ name: 'NextStepCard' }).props('title')).toBe('Bass clef')
      expect(wrapper.find('[data-test="mark-as-done"]').exists()).toBe(false)
    })
  })

  describe('the challenge', () => {
    it('can be done again, in review', async () => {
      setReview({ hasChallenge: true })
      const wrapper = await mountView()

      expect(wrapper.get('[data-test="practise-again"]').findComponent(RouterLinkStub).props('to')).toEqual({
        name: 'review-practice',
        params: { studentPathId: 'part-1', nodeId: 'node-2' },
      })
    })
  })

  describe('states', () => {
    it('a lesson of a course not finished opens later, from My path', async () => {
      setReview({ state: 'opens-later' })
      const wrapper = await mountView()

      expect(wrapper.get('[data-test="opens-later"]').text()).toContain('This lesson opens later')
      expect(wrapper.get('[data-test="opens-later-action"]').findComponent(RouterLinkStub).props('to')).toEqual({ name: 'path' })
    })

    it('a lesson that fails to load offers Try again, and the way back stays', async () => {
      setReview({ state: 'error' })
      const wrapper = await mountView()

      expect(wrapper.find('[data-test="error"]').exists()).toBe(true)
      expect(wrapper.getComponent({ name: 'PageBackBar' }).props('to')).toEqual(courseOwner.to)
    })
  })
})
