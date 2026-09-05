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

  async function register(): Promise<void> {
    state.value = 'registering'

    const me = await coreApi.GET('/users/me')
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
    if (created.data) {
      profile.value = created.data
      state.value = 'registered'
      return
    }

    if (created.response?.status === 409) {
      const reconciled = await coreApi.GET('/users/me')
      if (reconciled.data) {
        profile.value = reconciled.data
        state.value = 'registered'
        return
      }
    }

    state.value = 'failed'
  }

  function ensure(): Promise<void> {
    if (state.value === 'registering' || state.value === 'registered') {
      return inFlight ?? Promise.resolve()
    }

    inFlight = register().finally(() => {
      inFlight = null
    })
    return inFlight
  }

  function retry(): Promise<void> {
    inFlight = register().finally(() => {
      inFlight = null
    })
    return inFlight
  }

  function reset(): void {
    state.value = 'idle'
    profile.value = null
    inFlight = null
  }

  return { state, profile, isRegistered, isResolving, ensure, retry, reset }
})
