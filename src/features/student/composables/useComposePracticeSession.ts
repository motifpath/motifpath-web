import { ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useApi } from '@/shared/composables/useApi'

type Plan = components['schemas']['PracticeSessionPlan']

/** The length a session is offered at before the student picks another; the home quotes it too. */
export const DEFAULT_SESSION_MINUTES = 10

export type ComposeOutcome = { kind: 'composed'; plan: Plan } | { kind: 'nothing_to_practise' } | { kind: 'failed' }

/**
 * Asks core to compose a practice session for the instrument in the student's hands, or for none
 * when they practise in their head, and the minutes they have. Nothing is stored by composing: the session starts when the client sends
 * its plan as practice.session_started. Core answers not found when it has nothing to offer:
 * nothing the student is learning has items for that instrument, or the instrument is gone.
 */
export function useComposePracticeSession() {
  const { coreApi } = useApi()
  const isComposing = ref(false)

  async function compose(instrumentId: string | null, minutes: number): Promise<ComposeOutcome> {
    isComposing.value = true
    try {
      const { data, error, response } = await coreApi.POST('/students/me/practice-sessions', {
        body: { instrument_id: instrumentId, minutes },
      })
      if (data) return { kind: 'composed', plan: data }
      return error && response.status === 404 ? { kind: 'nothing_to_practise' } : { kind: 'failed' }
    } catch {
      return { kind: 'failed' }
    } finally {
      isComposing.value = false
    }
  }

  return { compose, isComposing }
}
