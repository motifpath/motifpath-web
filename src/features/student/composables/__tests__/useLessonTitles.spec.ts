import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { makeEnrollment } from '@/features/student/testing/learning'
import { makeStudentPathItem, makeStudentPathView } from '@/features/student/testing/studentPathItem'

const get = vi.fn()

vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET: get }, eventApi: {} }),
}))

import { useLessonTitles } from '@/features/student/composables/useLessonTitles'

const PATH = '/students/me/path'
const NODE = '/content-nodes/{content_node_id}'
const HELD_PATH = '/students/me/student-paths/{student_path_id}'
const ENROLLMENTS = '/students/me/course-enrollments'

type Result = { data?: unknown; error?: unknown }

const ok = (data: unknown): Result => ({ data, error: undefined })
const fail = (): Result => ({ data: undefined, error: { message: 'failed' } })

function respondWith(results: Record<string, Result>) {
  get.mockImplementation((url: string, options?: { params?: { path?: { content_node_id?: string } } }) => {
    if (url === NODE) {
      const id = options?.params?.path?.content_node_id
      return Promise.resolve(results[`${NODE}#${id}`] ?? results[NODE] ?? fail())
    }
    return Promise.resolve(results[url] ?? fail())
  })
}

const healthy = {
  [PATH]: ok(makeStudentPathView([makeStudentPathItem(1)])),
  [NODE]: ok({ content_node_id: 'node-1', title: 'Shuffle in E' }),
}

describe('useLessonTitles', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('knows no titles before they load', () => {
    respondWith(healthy)

    const { pathTitle, lessonTitle } = useLessonTitles('node-1')

    expect(pathTitle.value).toBeNull()
    expect(lessonTitle.value).toBeNull()
  })

  it('loads the path title and the lesson title', async () => {
    respondWith(healthy)

    const { pathTitle, lessonTitle } = useLessonTitles('node-1')
    await flushPromises()

    expect(pathTitle.value).toBe('Blues Foundations')
    expect(lessonTitle.value).toBe('Shuffle in E')
  })

  it('keeps the title that loaded when the other request fails', async () => {
    respondWith({ [NODE]: healthy[NODE] })

    const { pathTitle, lessonTitle } = useLessonTitles('node-1')
    await flushPromises()

    expect(pathTitle.value).toBeNull()
    expect(lessonTitle.value).toBe('Shuffle in E')
  })

  it('knows no titles when the requests throw', async () => {
    get.mockRejectedValue(new Error('network down'))

    const { pathTitle, lessonTitle } = useLessonTitles('node-1')
    await flushPromises()

    expect(pathTitle.value).toBeNull()
    expect(lessonTitle.value).toBeNull()
  })

  it('loads the new lesson title when the node id changes', async () => {
    respondWith({
      ...healthy,
      [`${NODE}#node-2`]: ok({ content_node_id: 'node-2', title: 'Box shape' }),
    })
    const nodeId = ref('node-1')

    const { lessonTitle } = useLessonTitles(nodeId)
    await flushPromises()
    nodeId.value = 'node-2'
    await flushPromises()

    expect(lessonTitle.value).toBe('Box shape')
  })

  describe('in review of a finished course or path', () => {
    const finishedPart = makeStudentPathView([makeStudentPathItem(1, undefined, 'completed')], {
      student_path_id: 'part-1',
      title: 'Part 1: First chords',
      course_enrollment_id: 'e-1',
    })
    const finishedStandalone = makeStudentPathView([makeStudentPathItem(1, undefined, 'completed')], {
      student_path_id: 'sp-1',
      title: 'Open chords',
    })
    const reviewing = {
      ...healthy,
      [ENROLLMENTS]: ok([makeEnrollment({ course_enrollment_id: 'e-0', course_title: 'Another course' }), makeEnrollment({ status: 'completed' })]),
    }

    it("names the finished course a reviewed part belongs to, not the student's current path", async () => {
      respondWith({ ...reviewing, [HELD_PATH]: ok(finishedPart) })

      const { pathTitle, lessonTitle } = useLessonTitles('node-1', 'part-1')
      await flushPromises()

      expect(pathTitle.value).toBe('Guitar foundations')
      expect(lessonTitle.value).toBe('Shuffle in E')
      expect(get).not.toHaveBeenCalledWith(PATH, expect.anything())
      expect(get).toHaveBeenCalledWith(HELD_PATH, expect.objectContaining({ params: { path: { student_path_id: 'part-1' } } }))
    })

    it('names a reviewed standalone path by its own title', async () => {
      respondWith({ ...reviewing, [HELD_PATH]: ok(finishedStandalone) })

      const { pathTitle } = useLessonTitles('node-1', 'sp-1')
      await flushPromises()

      expect(pathTitle.value).toBe('Open chords')
    })

    it("knows no path title when the course's name can't be read, never falling back to the current path", async () => {
      respondWith({ ...healthy, [HELD_PATH]: ok(finishedPart) })

      const { pathTitle } = useLessonTitles('node-1', 'part-1')
      await flushPromises()

      expect(pathTitle.value).toBeNull()
    })

    it("knows no path title when the reviewed path can't be read", async () => {
      respondWith(reviewing)

      const { pathTitle, lessonTitle } = useLessonTitles('node-1', 'part-1')
      await flushPromises()

      expect(pathTitle.value).toBeNull()
      expect(lessonTitle.value).toBe('Shuffle in E')
    })
  })
})
