import { onScopeDispose, ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useApi } from '@/shared/composables/useApi'

type SubjectList = components['schemas']['PracticeSubjectList']

/**
 * The subjects a student can choose to practise with the instrument in hand, or in the head when
 * it is null, grouped by area; nothing loads while it is undefined, not known yet. They load again
 * whenever the instrument changes; the request for an instrument no longer chosen is cancelled, as
 * listing subjects is costly for core, and its answer dropped.
 */
export function usePracticeSubjects(instrumentId: () => string | null | undefined) {
  const { coreApi } = useApi()

  const list = ref<SubjectList | null>(null)
  const isLoading = ref(true)
  const error = ref(false)
  let latest = 0
  let inFlight: AbortController | null = null

  async function load() {
    const id = instrumentId()
    if (id === undefined) return
    const request = ++latest
    inFlight?.abort()
    const controller = new AbortController()
    inFlight = controller
    isLoading.value = true
    error.value = false
    list.value = null
    let data: SubjectList | undefined
    try {
      const result = await coreApi.GET('/students/me/practice-subjects', {
        params: { query: id ? { instrument_id: id } : {} },
        signal: controller.signal,
      })
      data = result.data
    } catch {
      data = undefined
    }
    if (request !== latest) return
    inFlight = null
    list.value = data ?? null
    error.value = data === undefined
    isLoading.value = false
  }

  watch(instrumentId, () => void load(), { immediate: true })
  onScopeDispose(() => inFlight?.abort())

  return { list, isLoading, error, retry: load }
}
