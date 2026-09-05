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
  const isResolving = computed(() => state.value === 'registering')

  let inFlight: Promise<void> | null = null

  // Bumped by every register() call and by reset(). A register() attempt
  // checks its own epoch against the current one before each write — if
  // reset() (or a newer attempt) ran while it was awaiting, its epoch is
  // stale and it must not apply its result.
  let epoch = 0

  async function register(): Promise<void> {
    const myEpoch = ++epoch
    state.value = 'registering'

    const me = await coreApi.GET('/users/me')
    if (myEpoch !== epoch) return
    if (me.data) {
      profile.value = me.data
      state.value = 'registered'
      return
    }

    if (me.response?.status !== 404) {
      state.value = 'failed'
      return
    }

    const created = await coreApi.POST('/users', { body: { role: 'student' } })
    if (myEpoch !== epoch) return
    if (created.data) {
      profile.value = created.data
      state.value = 'registered'
      return
    }

    if (created.response?.status === 409) {
      const reconciled = await coreApi.GET('/users/me')
      if (myEpoch !== epoch) return
      if (reconciled.data) {
        profile.value = reconciled.data
        state.value = 'registered'
        return
      }
    }

    state.value = 'failed'
  }

  /** Starts a registration attempt, or returns the one already running. */
  function runRegistration(): Promise<void> {
    if (state.value === 'registering') {
      return inFlight ?? Promise.resolve()
    }

    inFlight = register().finally(() => {
      inFlight = null
    })
    return inFlight
  }

  function ensure(): Promise<void> {
    if (state.value === 'registered') {
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

  return { state, profile, isRegistered, isResolving, ensure, retry, reset }
})
