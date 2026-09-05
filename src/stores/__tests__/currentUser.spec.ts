import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const GET = vi.fn()
const POST = vi.fn()

vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET, POST }, eventApi: {} }),
}))

import { useCurrentUserStore } from '@/stores/currentUser'

const profile = { user_id: 'u-1', role: 'student', registered_at: '2026-09-05T00:00:00Z' }

describe('useCurrentUserStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    GET.mockReset()
    POST.mockReset()
  })

  it('starts idle with no requests made', () => {
    const store = useCurrentUserStore()

    expect(store.state).toBe('idle')
    expect(store.isRegistered).toBe(false)
    expect(store.isResolving).toBe(false)
    expect(GET).not.toHaveBeenCalled()
    expect(POST).not.toHaveBeenCalled()
  })

  it('resolves to registered when the identity already exists', async () => {
    GET.mockResolvedValueOnce({ data: profile, error: undefined, response: { status: 200 } })

    const store = useCurrentUserStore()
    await store.ensure()

    expect(store.state).toBe('registered')
    expect(store.isRegistered).toBe(true)
    expect(store.profile).toEqual(profile)
    expect(POST).not.toHaveBeenCalled()
  })

  it('self-registers as a student when the identity is not yet known', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'not found' }, response: { status: 404 } })
    POST.mockResolvedValueOnce({ data: profile, error: undefined, response: { status: 201 } })

    const store = useCurrentUserStore()
    await store.ensure()

    expect(POST).toHaveBeenCalledWith('/users', { body: { role: 'student' } })
    expect(store.state).toBe('registered')
    expect(store.profile).toEqual(profile)
  })

  it('reconciles a 409 race by re-reading the profile', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'not found' }, response: { status: 404 } })
    POST.mockResolvedValueOnce({ data: undefined, error: { message: 'conflict' }, response: { status: 409 } })
    GET.mockResolvedValueOnce({ data: profile, error: undefined, response: { status: 200 } })

    const store = useCurrentUserStore()
    await store.ensure()

    expect(GET).toHaveBeenCalledTimes(2)
    expect(store.state).toBe('registered')
    expect(store.profile).toEqual(profile)
  })

  it('fails when GET /users/me errors with anything other than 404', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

    const store = useCurrentUserStore()
    await store.ensure()

    expect(store.state).toBe('failed')
    expect(store.profile).toBeNull()
  })

  it('fails when POST /users errors with anything other than 409', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'not found' }, response: { status: 404 } })
    POST.mockResolvedValueOnce({ data: undefined, error: { message: 'bad request' }, response: { status: 400 } })

    const store = useCurrentUserStore()
    await store.ensure()

    expect(store.state).toBe('failed')
  })

  it('retry re-runs registration after a failure', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })
    const store = useCurrentUserStore()
    await store.ensure()
    expect(store.state).toBe('failed')

    GET.mockResolvedValueOnce({ data: profile, error: undefined, response: { status: 200 } })
    await store.retry()

    expect(store.state).toBe('registered')
    expect(store.profile).toEqual(profile)
  })

  it('ensure is idempotent — does not re-request once registered', async () => {
    GET.mockResolvedValueOnce({ data: profile, error: undefined, response: { status: 200 } })
    const store = useCurrentUserStore()

    await store.ensure()
    await store.ensure()

    expect(GET).toHaveBeenCalledTimes(1)
  })

  it('ensure does not re-enter while a request is already in flight', async () => {
    let resolveGet!: (value: unknown) => void
    GET.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveGet = resolve
      }),
    )
    const store = useCurrentUserStore()

    const first = store.ensure()
    const second = store.ensure()

    resolveGet({ data: profile, error: undefined, response: { status: 200 } })
    await Promise.all([first, second])

    expect(GET).toHaveBeenCalledTimes(1)
  })

  it('reset returns the store to idle and clears the profile', async () => {
    GET.mockResolvedValueOnce({ data: profile, error: undefined, response: { status: 200 } })
    const store = useCurrentUserStore()
    await store.ensure()

    store.reset()

    expect(store.state).toBe('idle')
    expect(store.profile).toBeNull()
  })
})
