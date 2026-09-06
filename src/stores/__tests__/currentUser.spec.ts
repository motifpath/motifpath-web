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

  it('fails when GET /users/me rejects outright (network failure, not an HTTP error)', async () => {
    GET.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const store = useCurrentUserStore()
    await store.ensure()

    expect(store.state).toBe('failed')
    expect(store.profile).toBeNull()
  })

  it('fails when POST /users rejects outright (network failure, not an HTTP error)', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'not found' }, response: { status: 404 } })
    POST.mockRejectedValueOnce(new TypeError('Failed to fetch'))

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

  it('ensure does not restart a genuinely failed registration — that is what retry() is for', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })
    const store = useCurrentUserStore()
    await store.ensure()
    expect(store.state).toBe('failed')

    GET.mockClear()
    await store.ensure()

    expect(GET).not.toHaveBeenCalled()
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

  it('ignores a stale response that resolves after reset() (sign-out race)', async () => {
    let resolveGet!: (value: unknown) => void
    GET.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveGet = resolve
      }),
    )
    const store = useCurrentUserStore()

    const pending = store.ensure()
    store.reset()
    resolveGet({ data: profile, error: undefined, response: { status: 200 } })
    await pending

    expect(store.state).toBe('idle')
    expect(store.profile).toBeNull()
  })

  it('does not let a stale attempt clobber a newer in-flight registration', async () => {
    let resolveFirstGet!: (value: unknown) => void
    GET.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirstGet = resolve
      }),
    )
    const store = useCurrentUserStore()

    void store.ensure() // attempt #1 starts; GET pending
    store.reset() // invalidates #1 via the epoch bump, clears inFlight

    let resolveSecondGet!: (value: unknown) => void
    GET.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSecondGet = resolve
      }),
    )
    void store.ensure() // attempt #2 starts; GET pending

    // The stale attempt #1 resolves now. Its `finally` must not clear the
    // in-flight slot that attempt #2 actually owns.
    resolveFirstGet({ data: undefined, error: { message: 'stale' }, response: { status: 404 } })
    await new Promise((resolve) => setTimeout(resolve, 0))

    // A third call while #2 is still genuinely in flight must return #2's
    // real promise, not a bogus already-resolved one. Proven without relying
    // on exact tick counts: attempt #2's GET is still deliberately unresolved
    // here, so a macrotask flush can never settle a promise genuinely tied to it.
    const third = store.ensure()
    let thirdResolved = false
    void third.then(() => {
      thirdResolved = true
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(thirdResolved).toBe(false)
    expect(GET).toHaveBeenCalledTimes(2)

    resolveSecondGet({ data: profile, error: undefined, response: { status: 200 } })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(thirdResolved).toBe(true)
    expect(store.state).toBe('registered')
    expect(store.profile).toEqual(profile)
  })

  it('retry does not start a second attempt while one is already in flight', async () => {
    let resolveGet!: (value: unknown) => void
    GET.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveGet = resolve
      }),
    )
    const store = useCurrentUserStore()

    const first = store.retry()
    const second = store.retry()

    resolveGet({ data: profile, error: undefined, response: { status: 200 } })
    await Promise.all([first, second])

    expect(GET).toHaveBeenCalledTimes(1)
    expect(store.state).toBe('registered')
  })
})
