import { computed, ref, shallowRef } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useApi } from '@/shared/composables/useApi'
import { useProgressionCatalog } from '@/shared/composables/useProgressionCatalog'

type Progression = components['schemas']['Progression']
export type NotAddableReason = components['schemas']['ProgressionNotAddableError']['reasons'][number]

/**
 * Adding a chart-only progression to the drills, with the skills and concepts it will practise.
 * Every answer but a refusal or silence brings the catalog up to date, since the row moves.
 */
export function useAddToDrills(onAdded: (progression: Progression) => void) {
  const { coreApi } = useApi()
  const { refresh } = useProgressionCatalog()

  const target = shallowRef<Progression | null>(null)
  const skillIds = ref<string[]>([])
  const conceptIds = ref<string[]>([])
  const adding = ref(false)
  const reasons = ref<NotAddableReason[]>([])
  const failed = ref(false)

  const picked = computed(() => skillIds.value.length + conceptIds.value.length > 0)

  function begin(progression: Progression) {
    target.value = progression
    skillIds.value = []
    conceptIds.value = []
    reasons.value = []
    failed.value = false
  }

  async function confirm() {
    const progression = target.value
    if (!progression || adding.value || !picked.value) return
    adding.value = true
    reasons.value = []
    failed.value = false
    const { data, error, response } = await coreApi
      .POST('/progressions/{progression_id}/drills', {
        params: { path: { progression_id: progression.progression_id } },
        body: { skill_ids: skillIds.value, concept_ids: conceptIds.value },
      })
      .catch(() => ({ data: undefined, error: undefined, response: undefined }))
    const refused = error !== undefined && 'reasons' in error ? error.reasons : null
    if (data || refused || response?.status === 404) await refresh()
    adding.value = false

    if (data) {
      target.value = null
      onAdded(data)
    } else if (refused) {
      reasons.value = refused
    } else if (response?.status === 404) {
      target.value = null
    } else {
      failed.value = true
    }
  }

  /** Adding can't be called back once it runs, so the dialog waits for its answer. */
  function close() {
    if (!adding.value) target.value = null
  }

  return { target, skillIds, conceptIds, picked, adding, reasons, failed, begin, confirm, close }
}
