import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const get = vi.fn()

vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET: get }, eventApi: {} }),
}))

import { useStudentPath } from '@/features/student/composables/useStudentPath'

async function settle() {
  await nextTick()
  await nextTick()
}

describe('useStudentPath', () => {
  it('exposes the loaded path on success', async () => {
    get.mockResolvedValueOnce({ data: { title: 'Blues Foundations', items: [] }, error: undefined })

    const { data, error, isLoading } = useStudentPath()
    await settle()

    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(data.value?.title).toBe('Blues Foundations')
  })

  it('reports a distinct state when the student has no assigned path', async () => {
    get.mockResolvedValueOnce({ data: undefined, error: { message: 'not found' }, response: { status: 404 } })

    const { data, error } = useStudentPath()
    await settle()

    expect(data.value).toBeNull()
    expect(error.value).toBe('no-path')
  })

  it('reports a generic failure for other errors', async () => {
    get.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

    const { error } = useStudentPath()
    await settle()

    expect(error.value).toBe('load-failed')
  })

  it('retry re-requests the path', async () => {
    get.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })
    const { error, retry } = useStudentPath()
    await settle()
    expect(error.value).toBe('load-failed')

    get.mockResolvedValueOnce({ data: { title: 'Blues Foundations', items: [] }, error: undefined })
    await retry()

    expect(error.value).toBeNull()
  })
})
