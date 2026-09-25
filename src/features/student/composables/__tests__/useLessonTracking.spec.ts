import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import type { LessonNodeState } from '@/features/student/composables/useLessonNode'
import type { components } from '@/api/generated/core-domain'

type ContentNode = components['schemas']['ContentNode']
type Status = components['schemas']['StudentPathItem']['status']

const track = vi.fn()

vi.mock('@/shared/composables/useEventTracking', () => ({
  useEventTracking: () => ({ track }),
}))

import { useLessonTracking } from '@/features/student/composables/useLessonTracking'

// Entry events are remembered for the whole SPA session, so each test uses
// its own node id unless it is deliberately testing that memory.
let nextNodeId = 0
function freshNodeId(): string {
  nextNodeId += 1
  return `node-${nextNodeId}`
}

function videoNode(id: string): ContentNode {
  return {
    content_node_id: id,
    teacher: { user_id: 'teacher-1', display_name: 'Teacher One' },
    title: 'A lesson',
    content_type: 'video',
    classification: {
      skills: [],
      concepts: [],
      difficulty_level: 'beginner',
      review_state: 'confirmed',
    },
    media_url: 'https://cdn.example.test/lesson.mp4',
    languages: [{ code: 'any', name: 'Language-agnostic' }],
    created_at: '2026-09-21T12:00:00Z',
  }
}

/** The last event handed to the tracker. */
function lastEvent(): unknown {
  return track.mock.calls.at(-1)?.[0]
}

function lessonFor(id: string, status: Status, state: LessonNodeState = 'ready') {
  return {
    state: ref<LessonNodeState>(state),
    node: ref<ContentNode | null>(videoNode(id)),
    status: ref<Status | null>(status),
  }
}

function setTabVisibility(visibility: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: visibility, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useLessonTracking', () => {
  beforeEach(() => {
    track.mockReset()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-21T12:00:00Z'))
    setTabVisibility('visible')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('opening a lesson', () => {
    it('emits lesson.started for a step that is not started', () => {
      const id = freshNodeId()

      useLessonTracking(lessonFor(id, 'not_started'))

      expect(track).toHaveBeenCalledTimes(1)
      expect(track).toHaveBeenCalledWith({
        event_type: 'lesson.started',
        content_context: { content_node_id: id, content_type: 'video', teacher_id: 'teacher-1' },
      })
    })

    it('emits lesson.resumed for a step that is in progress', () => {
      const id = freshNodeId()

      useLessonTracking(lessonFor(id, 'in_progress'))

      expect(track).toHaveBeenCalledTimes(1)
      expect(track).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'lesson.resumed',
          content_context: expect.objectContaining({ content_node_id: id }),
        }),
      )
    })

    it('emits nothing when a completed step is reopened', () => {
      useLessonTracking(lessonFor(freshNodeId(), 'completed'))

      expect(track).not.toHaveBeenCalled()
    })

    it.each<LessonNodeState>([
      'loading',
      'error',
      'locked',
      'not-found',
      'no-media',
      'unsupported',
    ])('emits nothing while the lesson is %s', (state) => {
      useLessonTracking(lessonFor(freshNodeId(), 'not_started', state))

      expect(track).not.toHaveBeenCalled()
    })

    it('waits until the lesson is ready, then emits once', async () => {
      const lesson = lessonFor(freshNodeId(), 'not_started', 'loading')
      useLessonTracking(lesson)

      lesson.state.value = 'ready'
      await nextTick()

      expect(track).toHaveBeenCalledTimes(1)
    })

    it('emits the entry event only once per node in a session', () => {
      const id = freshNodeId()

      useLessonTracking(lessonFor(id, 'not_started'))
      useLessonTracking(lessonFor(id, 'in_progress'))

      expect(track).toHaveBeenCalledTimes(1)
    })

    it('emits again for a different node', () => {
      useLessonTracking(lessonFor(freshNodeId(), 'not_started'))
      useLessonTracking(lessonFor(freshNodeId(), 'not_started'))

      expect(track).toHaveBeenCalledTimes(2)
    })
  })

  describe('completing a lesson', () => {
    it('emits lesson.completed with the time spent, in whole seconds', async () => {
      const id = freshNodeId()
      const { complete } = useLessonTracking(lessonFor(id, 'in_progress'))
      track.mockClear()

      vi.setSystemTime(new Date('2026-09-21T12:01:35.400Z'))
      await complete()

      expect(track).toHaveBeenCalledTimes(1)
      expect(track).toHaveBeenCalledWith({
        event_type: 'lesson.completed',
        content_context: { content_node_id: id, content_type: 'video', teacher_id: 'teacher-1' },
        duration_seconds: 95,
      })
    })

    it('leaves out the duration when the tab was hidden at any point', async () => {
      const { complete } = useLessonTracking(lessonFor(freshNodeId(), 'in_progress'))
      track.mockClear()

      setTabVisibility('hidden')
      setTabVisibility('visible')
      vi.setSystemTime(new Date('2026-09-21T12:05:00Z'))
      await complete()

      expect(lastEvent()).not.toHaveProperty('duration_seconds')
    })

    it('leaves out the duration when the tab was already hidden on opening', async () => {
      setTabVisibility('hidden')
      const { complete } = useLessonTracking(lessonFor(freshNodeId(), 'in_progress'))
      track.mockClear()

      await complete()

      expect(lastEvent()).not.toHaveProperty('duration_seconds')
    })

    it('emits lesson.completed only once however many times it is called', async () => {
      const { complete } = useLessonTracking(lessonFor(freshNodeId(), 'in_progress'))
      track.mockClear()

      await complete()
      await complete()

      expect(track).toHaveBeenCalledTimes(1)
    })

    it('emits nothing when the step was already completed', async () => {
      const { complete } = useLessonTracking(lessonFor(freshNodeId(), 'completed'))

      await complete()

      expect(track).not.toHaveBeenCalled()
    })

    it('emits nothing when the lesson is not ready', async () => {
      const { complete } = useLessonTracking(lessonFor(freshNodeId(), 'in_progress', 'loading'))

      await complete()

      expect(track).not.toHaveBeenCalled()
    })

    it('measures the time from when the lesson became ready, not from when it started loading', async () => {
      const lesson = lessonFor(freshNodeId(), 'in_progress', 'loading')
      const { complete } = useLessonTracking(lesson)

      vi.setSystemTime(new Date('2026-09-21T12:00:30Z'))
      lesson.state.value = 'ready'
      await nextTick()
      track.mockClear()
      vi.setSystemTime(new Date('2026-09-21T12:00:40Z'))
      await complete()

      expect(track).toHaveBeenCalledWith(expect.objectContaining({ duration_seconds: 10 }))
    })
  })
})
