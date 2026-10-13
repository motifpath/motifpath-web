import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

import { makeStudentPathItem, makeStudentPathView } from '@/features/student/testing/studentPathItem'

const get = vi.fn()

vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET: get }, eventApi: {} }),
}))

import { useHeldStudentPath } from '@/features/student/composables/useHeldStudentPath'

const PATH = '/students/me/student-paths/{student_path_id}'
const view = makeStudentPathView([makeStudentPathItem(1, undefined, 'completed')], { student_path_id: 'sp-1' })

describe('useHeldStudentPath', () => {
  beforeEach(() => get.mockReset())

  it('loads nothing until there is a path, then loads it', async () => {
    get.mockResolvedValue({ data: view, error: undefined })
    const id = ref<string | null>(null)

    const held = useHeldStudentPath(id)
    await flushPromises()
    expect(get).not.toHaveBeenCalled()
    expect(held.view.value).toBeNull()

    id.value = 'sp-1'
    await flushPromises()
    expect(get).toHaveBeenCalledWith(PATH, { params: { path: { student_path_id: 'sp-1' } } })
    expect(held.view.value).toEqual(view)
  })

  it('reports a failure, and retry loads again', async () => {
    get.mockResolvedValue({ data: undefined, error: { message: 'failed' } })
    const held = useHeldStudentPath(() => 'sp-1')
    await flushPromises()
    expect(held.error.value).toBe(true)

    get.mockResolvedValue({ data: view, error: undefined })
    await held.retry()

    expect(held.error.value).toBe(false)
    expect(held.view.value).toEqual(view)
  })
})
