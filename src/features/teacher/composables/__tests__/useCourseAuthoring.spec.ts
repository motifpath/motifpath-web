import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
const POST = vi.fn()
const PUT = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET, POST, PUT }, eventApi: {} }),
}))

import type { components } from '@/api/generated/core-domain'
import {
  useCourse,
  useCourseMutations,
  useLearningPathTitles,
  usePublishedCourse,
} from '@/features/teacher/composables/useCourseAuthoring'

type CreateCourseRequest = components['schemas']['CreateCourseRequest']

const request: CreateCourseRequest = {
  title: 't',
  summary: 's',
  level: 'beginner',
  language: 'en',
  instrument_ids: [],
  checkpoints: [{ learning_path_id: 'lp-1' }],
}

function ok(data: unknown) {
  return { data, error: undefined, response: new Response(null, { status: 200 }) }
}

describe('course authoring composables', () => {
  beforeEach(() => {
    GET.mockReset()
    POST.mockReset()
    PUT.mockReset()
  })

  it('loads a course by id, and says when it does not exist', async () => {
    GET.mockResolvedValueOnce({ error: { message: 'x' }, response: new Response(null, { status: 404 }) })

    const { course, isLoading, notFound } = useCourse('c-9')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/courses/{course_id}', { params: { path: { course_id: 'c-9' } } })
    expect(course.value).toBeNull()
    expect(notFound.value).toBe(true)
  })

  it('loads the published outline of a course', async () => {
    GET.mockResolvedValueOnce(ok({ course_id: 'c-1', checkpoints: [] }))

    const { outline, isLoading } = usePublishedCourse('c-1')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(GET).toHaveBeenCalledWith('/courses/{course_id}/published', { params: { path: { course_id: 'c-1' } } })
    expect(outline.value).toEqual({ course_id: 'c-1', checkpoints: [] })
  })

  describe('mutations', () => {
    it('creates and replaces a course', async () => {
      POST.mockResolvedValueOnce(ok({ course_id: 'c-1' }))
      PUT.mockResolvedValueOnce(ok({ course_id: 'c-1' }))
      const { createCourse, replaceCourse } = useCourseMutations()

      await createCourse(request)
      await replaceCourse('c-1', request)

      expect(POST).toHaveBeenCalledWith('/courses', { body: request })
      expect(PUT).toHaveBeenCalledWith('/courses/{course_id}', { params: { path: { course_id: 'c-1' } }, body: request })
    })

    const actions: ['publishCourse' | 'retireCourse' | 'reactivateCourse', string][] = [
      ['publishCourse', '/courses/{course_id}/publish'],
      ['retireCourse', '/courses/{course_id}/retire'],
      ['reactivateCourse', '/courses/{course_id}/reactivate'],
    ]
    it.each(actions)('%s posts to %s', async (name, path) => {
      POST.mockResolvedValueOnce(ok({ course_id: 'c-1' }))
      const mutations = useCourseMutations()

      await mutations[name]('c-1')

      expect(POST).toHaveBeenCalledWith(path, { params: { path: { course_id: 'c-1' } } })
    })

    it('throws the API error when a mutation fails', async () => {
      POST.mockResolvedValueOnce({
        data: undefined,
        error: { error: 'validation_error', message: 'status: the course is not retired' },
        response: new Response(null, { status: 400 }),
      })
      const { reactivateCourse } = useCourseMutations()

      await expect(reactivateCourse('c-1')).rejects.toThrow('the course is not retired')
    })
  })

  describe('useLearningPathTitles', () => {
    it("looks up each path's title once", async () => {
      GET.mockImplementation((_path: string, options: { params: { path: { learning_path_id: string } } }) =>
        Promise.resolve(ok({ learning_path_id: options.params.path.learning_path_id, title: `Title ${options.params.path.learning_path_id}` })),
      )
      const found: [string, string][] = []
      const { lookUp } = useLearningPathTitles((id, title) => found.push([id, title]))

      await lookUp(['lp-1', 'lp-2'])
      await lookUp(['lp-1'])

      expect(GET).toHaveBeenCalledTimes(2)
      expect(found).toEqual([
        ['lp-1', 'Title lp-1'],
        ['lp-2', 'Title lp-2'],
      ])
    })

    it('skips a path that fails to load, and tries it again later', async () => {
      GET.mockResolvedValueOnce({ error: { message: 'boom' }, response: new Response(null, { status: 500 }) })
      GET.mockResolvedValueOnce(ok({ learning_path_id: 'lp-1', title: 'Open chords' }))
      const found: [string, string][] = []
      const { lookUp } = useLearningPathTitles((id, title) => found.push([id, title]))

      await lookUp(['lp-1'])
      expect(found).toEqual([])

      await lookUp(['lp-1'])
      expect(found).toEqual([['lp-1', 'Open chords']])
    })
  })
})
