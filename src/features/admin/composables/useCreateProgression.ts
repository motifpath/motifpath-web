import type { components } from '@/api/generated/core-domain'
import { useApi } from '@/shared/composables/useApi'
import { useProgressionCatalog } from '@/shared/composables/useProgressionCatalog'

type Progression = components['schemas']['Progression']
type ProgressionInput = components['schemas']['ProgressionInput']
type NotAddableReason = components['schemas']['ProgressionNotAddableError']['reasons'][number]

export type CreateProgressionOutcome =
  | { kind: 'created'; progression: Progression }
  | { kind: 'exists'; progression: Progression }
  | { kind: 'not_addable'; reasons: NotAddableReason[] }
  | { kind: 'failed' }

/** Creates a progression; on success, or when it turns out to exist, the catalog everyone reads catches up first. */
export function useCreateProgression() {
  const { coreApi } = useApi()
  const { refresh } = useProgressionCatalog()

  async function create(body: ProgressionInput): Promise<CreateProgressionOutcome> {
    const { data, error } = await coreApi.POST('/progressions', { body }).catch(() => ({ data: undefined, error: undefined }))
    if (data) {
      await refresh()
      return { kind: 'created', progression: data }
    }
    if (error && 'progression' in error) {
      await refresh()
      return { kind: 'exists', progression: error.progression }
    }
    if (error && 'reasons' in error) return { kind: 'not_addable', reasons: error.reasons }
    return { kind: 'failed' }
  }

  return { create }
}
