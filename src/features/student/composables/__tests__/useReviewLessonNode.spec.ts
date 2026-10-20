import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

import { makeEnrollment } from '@/features/student/testing/learning'
import { makeStudentPathItem, makeStudentPathView } from '@/features/student/testing/studentPathItem'
import type { components } from '@/api/generated/core-domain'

type StudentPathItem = components['schemas']['StudentPathItem']

const get = vi.fn()

vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET: get }, eventApi: {} }),
}))

import { useReviewLessonNode } from '@/features/student/composables/useReviewLessonNode'

const PATH = '/students/me/student-paths/{student_path_id}'
const PARTS = '/students/me/course-enrollments/{course_enrollment_id}/parts'
const ENROLLMENTS = '/students/me/course-enrollments'
const NODE = '/content-nodes/{content_node_id}'
const CUES = '/content-nodes/{content_node_id}/expanded-content'
const CHALLENGES = '/content-nodes/{content_node_id}/challenges'

type Result = { data?: unknown; error?: unknown; response?: { status: number } }
const ok = (data: unknown): Result => ({ data, error: undefined })
const fail = (status: number): Result => ({ data: undefined, error: { message: 'failed' }, response: { status } })

function item(position: number, nodeId: string, status: StudentPathItem['status'] = 'completed'): StudentPathItem {
  return { ...makeStudentPathItem(position, undefined, status), content_node_id: nodeId, title: `Lesson ${nodeId}` }
}

const part1 = makeStudentPathView([item(1, 'node-1'), item(2, 'node-2')], {
  student_path_id: 'part-1',
  title: 'The staff and clefs',
  course_enrollment_id: 'enrollment-1',
  course_checkpoint_position: 1,
})
const part2 = makeStudentPathView([item(1, 'node-3'), item(2, 'node-4')], {
  student_path_id: 'part-2',
  title: 'Rhythm values',
  course_enrollment_id: 'enrollment-1',
  course_checkpoint_position: 2,
})
const finishedCourse = makeEnrollment({
  course_enrollment_id: 'enrollment-1',
  course_id: 'course-1',
  course_title: 'Music reading 101',
  status: 'completed',
})
const standalone = makeStudentPathView([item(1, 'node-5'), item(2, 'node-6')], {
  student_path_id: 'standalone-1',
  source_template_id: 'open-chords-path',
  title: 'Open chords',
})

/** Answers each request by its URL and, for the held-path read, its id. */
function respondWith(paths: Record<string, Result>, others: Record<string, Result>) {
  get.mockImplementation((url: string, init?: { params?: { path?: { student_path_id?: string } } }) => {
    if (url === PATH) return Promise.resolve(paths[init?.params?.path?.student_path_id ?? ''] ?? fail(404))
    return Promise.resolve(others[url] ?? fail(500))
  })
}

const content = {
  [NODE]: ok({ content_node_id: 'node-2', title: 'Treble clef', content_type: 'video', media_url: 'https://cdn.example.test/v.mp4' }),
  [CUES]: ok({ items: [] }),
  [CHALLENGES]: ok([]),
}

function courseResponses(enrollment = finishedCourse) {
  return {
    ...content,
    [PARTS]: ok([part1, part2]),
    [ENROLLMENTS]: ok([enrollment]),
  }
}

describe('useReviewLessonNode', () => {
  beforeEach(() => get.mockReset())

  describe('a lesson of a finished course', () => {
    it('is ready, named by its part and its place in the part', async () => {
      respondWith({ 'part-1': ok(part1) }, courseResponses())

      const lesson = useReviewLessonNode('part-1', 'node-2')
      await flushPromises()

      expect(lesson.state.value).toBe('ready')
      expect(lesson.place.value).toEqual({ part: 1, lesson: 2, total: 2, kind: 'video' })
    })

    it('goes back to the course detail, named by the course', async () => {
      respondWith({ 'part-1': ok(part1) }, courseResponses())

      const lesson = useReviewLessonNode('part-1', 'node-2')
      await flushPromises()

      expect(lesson.owner.value).toEqual({
        title: 'Music reading 101',
        to: { name: 'learning-course', params: { courseId: 'course-1' } },
      })
    })

    it('offers the first lesson of the next part after the last lesson of a part', async () => {
      respondWith({ 'part-1': ok(part1) }, courseResponses())

      const lesson = useReviewLessonNode('part-1', 'node-2')
      await flushPromises()

      expect(lesson.next.value).toEqual({
        studentPathId: 'part-2',
        contentNodeId: 'node-3',
        title: 'Lesson node-3',
        kind: 'video',
        place: { part: 2, lesson: 1, total: 2, kind: 'video' },
      })
    })

    it('offers the next lesson of the same part', async () => {
      respondWith({ 'part-1': ok(part1) }, courseResponses())

      const lesson = useReviewLessonNode('part-1', 'node-1')
      await flushPromises()

      expect(lesson.next.value?.contentNodeId).toBe('node-2')
      expect(lesson.next.value?.studentPathId).toBe('part-1')
    })

    it('offers nothing after the last lesson of the course', async () => {
      respondWith({ 'part-2': ok(part2) }, courseResponses())

      const lesson = useReviewLessonNode('part-2', 'node-4')
      await flushPromises()

      expect(lesson.state.value).toBe('ready')
      expect(lesson.next.value).toBeNull()
    })

    it('never reads My path', async () => {
      respondWith({ 'part-1': ok(part1) }, courseResponses())

      useReviewLessonNode('part-1', 'node-2')
      await flushPromises()

      expect(get).not.toHaveBeenCalledWith('/students/me/path', expect.anything())
    })
  })

  describe('a lesson of a finished standalone path', () => {
    it('goes back to the path detail and moves through the path', async () => {
      respondWith({ 'standalone-1': ok(standalone) }, content)

      const lesson = useReviewLessonNode('standalone-1', 'node-5')
      await flushPromises()

      expect(lesson.state.value).toBe('ready')
      expect(lesson.place.value).toEqual({ part: null, lesson: 1, total: 2, kind: 'video' })
      expect(lesson.owner.value).toEqual({
        title: 'Open chords',
        to: { name: 'learning-path', params: { learningPathId: 'open-chords-path' } },
      })
      expect(lesson.next.value?.contentNodeId).toBe('node-6')
    })
  })

  describe('what does not open for review', () => {
    it('a lesson of a course still in progress opens later', async () => {
      respondWith({ 'part-1': ok(part1) }, courseResponses({ ...finishedCourse, status: 'active' }))

      const lesson = useReviewLessonNode('part-1', 'node-2')
      await flushPromises()

      expect(lesson.state.value).toBe('opens-later')
      expect(get).not.toHaveBeenCalledWith(NODE, expect.anything())
    })

    it('a lesson of a standalone path not finished opens later', async () => {
      const unfinished = { ...standalone, items: [item(1, 'node-5'), item(2, 'node-6', 'not_started')] }
      respondWith({ 'standalone-1': ok(unfinished) }, content)

      const lesson = useReviewLessonNode('standalone-1', 'node-5')
      await flushPromises()

      expect(lesson.state.value).toBe('opens-later')
    })

    it('a part the student has not reached opens later', async () => {
      respondWith({}, content)

      const lesson = useReviewLessonNode('part-3', 'node-9')
      await flushPromises()

      expect(lesson.state.value).toBe('opens-later')
    })

    it('a lesson that is not in the path is not found', async () => {
      respondWith({ 'standalone-1': ok(standalone) }, content)

      const lesson = useReviewLessonNode('standalone-1', 'node-99')
      await flushPromises()

      expect(lesson.state.value).toBe('not-found')
    })
  })

  describe('failures', () => {
    it('a path that fails to load is an error, and retry loads it again', async () => {
      respondWith({ 'standalone-1': fail(500) }, content)
      const lesson = useReviewLessonNode('standalone-1', 'node-5')
      await flushPromises()
      expect(lesson.state.value).toBe('error')

      respondWith({ 'standalone-1': ok(standalone) }, content)
      await lesson.retry()

      expect(lesson.state.value).toBe('ready')
    })

    it('a lesson whose content fails to load is an error', async () => {
      respondWith({ 'standalone-1': ok(standalone) }, { ...content, [NODE]: fail(500) })

      const lesson = useReviewLessonNode('standalone-1', 'node-5')
      await flushPromises()

      expect(lesson.state.value).toBe('error')
    })
  })
})
