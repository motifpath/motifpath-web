import { describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: {}, eventApi: {} }),
}))

import { useApiItem } from '@/shared/composables/useApiItem'

describe('useApiItem', () => {
  it('loads the item', async () => {
    const { item, isLoading, error, notFound } = useApiItem(async () => ({
      data: { id: 'x' },
      response: new Response(null, { status: 200 }),
    }))
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(item.value).toEqual({ id: 'x' })
    expect(error.value).toBe(false)
    expect(notFound.value).toBe(false)
  })

  it('tells a missing item apart from a failed load', async () => {
    const { item, isLoading, error, notFound } = useApiItem(async () => ({
      error: { message: 'no such course' },
      response: new Response(null, { status: 404 }),
    }))
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(item.value).toBeNull()
    expect(error.value).toBe(true)
    expect(notFound.value).toBe(true)
  })

  it('does not call any other failure missing', async () => {
    const { isLoading, error, notFound } = useApiItem(async () => ({
      error: { message: 'boom' },
      response: new Response(null, { status: 500 }),
    }))
    await vi.waitFor(() => expect(isLoading.value).toBe(false))

    expect(error.value).toBe(true)
    expect(notFound.value).toBe(false)
  })
})
