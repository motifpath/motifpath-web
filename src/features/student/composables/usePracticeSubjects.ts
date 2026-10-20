import { ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useApi } from '@/shared/composables/useApi'

type SubjectList = components['schemas']['PracticeSubjectList']

/**
 * The subjects a student can choose to practise with the instrument in hand, or in the head when
 * it is null, grouped by area. They load again whenever the instrument changes; an answer for an
 * instrument no longer chosen is dropped.
 */
export function usePracticeSubjects(instrumentId: () => string | null) {
  const { coreApi } = useApi()

  const list = ref<SubjectList | null>(null)
  const isLoading = ref(false)
  const error = ref(false)
  let latest = 0

  async function load() {
    const request = ++latest
    const id = instrumentId()
    isLoading.value = true
    error.value = false
    list.value = null
    let data: SubjectList | undefined
    try {
      const result = await coreApi.GET('/students/me/practice-subjects', { params: { query: id ? { instrument_id: id } : {} } })
      data = result.data
    } catch {
      data = undefined
    }
    if (request !== latest) return
    list.value = data ?? null
    error.value = data === undefined
    isLoading.value = false
  }

  watch(instrumentId, () => void load(), { immediate: true })

  return { list, isLoading, error, retry: load }
}
