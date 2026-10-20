import { describe, expect, it } from 'vitest'

import { useApi } from '@/shared/composables/useApi'

describe('useApi', () => {
  it('exposes typed clients for both services', () => {
    const { coreApi, eventApi } = useApi()

    expect(typeof coreApi.GET).toBe('function')
    expect(typeof eventApi.POST).toBe('function')
  })
})
