import type { useApi } from '@/shared/composables/useApi'
import { useApiList } from '@/shared/composables/useApiList'
import type { components } from '@/api/generated/core-domain'

type Voice = components['schemas']['Voice']
type CoreApi = ReturnType<typeof useApi>['coreApi']
type VoicesResult = { data?: Voice[]; error?: unknown }

// Voices only change with a release, and every diagram player on a page
// needs them, so they're asked for once per page load. A failed load is
// forgotten, so the next player or list asks again.
let cached: Promise<VoicesResult> | null = null

/** Forgets the loaded voices. For tests. */
export function clearVoiceCache() {
  cached = null
}

export function fetchVoices(coreApi: CoreApi): Promise<VoicesResult> {
  if (!cached) {
    const pending: Promise<VoicesResult> = coreApi.GET('/voices', {}).then((result) => {
      if (result.error || !result.data) cached = null
      return result
    })
    cached = pending
    pending.catch(() => {
      cached = null
    })
  }
  return cached
}

export function useListVoices() {
  const { items: voices, isLoading, error, retry } = useApiList<Voice>(fetchVoices)

  return { voices, isLoading, error, retry }
}
