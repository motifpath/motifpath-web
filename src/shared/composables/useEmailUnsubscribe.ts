import { ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useApi } from '@/shared/composables/useApi'

type EmailKind = components['schemas']['EmailUnsubscribeResult']['kind']

/**
 * Where an unsubscribe link stands: `working` while it is used; `done` once the kind it names is
 * off; `broken` when the server refused the link (altered, cut short or missing), which a retry
 * can't fix; `failed` when the server couldn't be reached or erred, which a retry may fix.
 * Nothing changes unless it is `done`.
 */
export type UnsubscribeState = 'working' | 'done' | 'broken' | 'failed'

/** Uses an unsubscribe link's token, which needs no sign-in: it names the user and the kind. */
export function useEmailUnsubscribe(token: string | null) {
  const { coreApi } = useApi()
  const state = ref<UnsubscribeState>('working')
  const kind = ref<EmailKind | null>(null)

  async function unsubscribe(): Promise<void> {
    if (!token) {
      state.value = 'broken'
      return
    }
    state.value = 'working'
    try {
      const result = await coreApi.POST('/email-unsubscribes', { params: { query: { token } }, body: {} })
      if (result.data) {
        kind.value = result.data.kind
        state.value = 'done'
        return
      }
      state.value = result.response?.status === 400 ? 'broken' : 'failed'
    } catch {
      state.value = 'failed'
    }
  }

  return { state, kind, unsubscribe }
}
