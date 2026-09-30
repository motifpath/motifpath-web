import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { makeStudentPathItem, makeStudentPathView } from '@/features/student/testing/studentPathItem'

const get = vi.fn()

vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET: get }, eventApi: {} }),
}))

import { useLessonTitles } from '@/features/student/composables/useLessonTitles'

const PATH = '/students/me/path'
const NODE = '/content-nodes/{content_node_id}'

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
})
