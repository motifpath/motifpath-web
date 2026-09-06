import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type UserProfile = components['schemas']['UserProfile']

export type CurrentUserState = 'idle' | 'registering' | 'registered' | 'failed'

/**
 * The authenticated Clerk identity's MotifPath registration state. Resolves the
 * caller's profile via `GET /users/me`, self-registering as a student on 404 and
 * reconciling a 409 race by re-reading the profile. `ensure()` is idempotent —
 * safe to call on every authenticated mount without duplicating requests.
 */
export const useCurrentUserStore = defineStore('currentUser', () => {
  const { coreApi } = useApi()

  const state = ref<CurrentUserState>('idle')
  const profile = ref<UserProfile | null>(null)

  const isRegistered = computed(() => state.value === 'registered')

  let inFlight: Promise<void> | null = null

  // Bumped by every runRegistration() call and by reset(). An attempt checks
  // its own epoch against the current one before each write — if reset() (or
  // a newer attempt) ran while it was awaiting, its epoch is stale and it
  // must not apply its result, including clearing `inFlight` out from under
  // whichever newer attempt actually owns it.
  let epoch = 0

  // Shared by every await point in register(): stale (a reset() or a newer
  // attempt already moved epoch on) tells the caller to stop without
  // touching state; otherwise applies a successful profile and tells the
  // caller to stop, or reports "not resolved yet, keep going".
  function applyIfRegistered(myEpoch: number, data: UserProfile | undefined): boolean {
    if (myEpoch !== epoch) return true
    if (data) {
      profile.value = data
      state.value = 'registered'
      return true
    }
    return false
  }

  async function register(myEpoch: number): Promise<void> {
    state.value = 'registering'

    // A network-level failure (unreachable core-domain, DNS, CORS preflight)
    // rejects rather than resolving with a {data,error,response} shape —
    // caught here so it lands on 'failed' like any other unsuccessful
    // outcome, instead of leaving state stuck at 'registering' forever.
    try {
      const me = await coreApi.GET('/users/me')
      if (applyIfRegistered(myEpoch, me.data)) return

      if (me.response?.status !== 404) {
        state.value = 'failed'
        return
      }

      const created = await coreApi.POST('/users', { body: { role: 'student' } })
      if (applyIfRegistered(myEpoch, created.data)) return

      if (created.response?.status === 409) {
        const reconciled = await coreApi.GET('/users/me')
        if (applyIfRegistered(myEpoch, reconciled.data)) return
      }

      state.value = 'failed'
    } catch {
      if (myEpoch === epoch) {
        state.value = 'failed'
      }
    }
  }

  /** Starts a registration attempt, or returns the one already running. */
  function runRegistration(): Promise<void> {
    if (state.value === 'registering') {
      return inFlight ?? Promise.resolve()
    }

    const myEpoch = ++epoch
    const attempt = register(myEpoch).finally(() => {
      // Only clear the slot if it's still this attempt's — a reset() or a
      // newer attempt may have already moved epoch on and replaced it.
      if (myEpoch === epoch) {
        inFlight = null
      }
    })
    inFlight = attempt
    return attempt
  }

  function ensure(): Promise<void> {
    // 'failed' is a terminal outcome only retry() may re-run — ensure() is
    // called defensively and on every sign-in, and must never turn either
    // of those into a silent, un-asked-for retry of a real failure.
    if (state.value === 'registered' || state.value === 'failed') {
      return Promise.resolve()
    }
    return runRegistration()
  }

  function retry(): Promise<void> {
    return runRegistration()
  }

  function reset(): void {
    epoch++
    state.value = 'idle'
    profile.value = null
    inFlight = null
  }

  return { state, profile, isRegistered, ensure, retry, reset }
})
