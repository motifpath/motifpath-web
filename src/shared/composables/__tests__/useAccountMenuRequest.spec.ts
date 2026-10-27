import { describe, expect, it } from 'vitest'

import { useAccountMenuRequest } from '@/shared/composables/useAccountMenuRequest'

describe('useAccountMenuRequest', () => {
  it('holds a request until one menu takes it', () => {
    const { request, take, pending } = useAccountMenuRequest()

    request('emails')

    expect(pending.value).toBe('emails')
    expect(take()).toBe('emails')
    expect(take()).toBeNull()
    expect(pending.value).toBeNull()
  })
})
