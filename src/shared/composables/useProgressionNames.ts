import { computed, shallowRef } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useProgressionCatalog } from '@/shared/composables/useProgressionCatalog'

type Progression = components['schemas']['Progression']

/**
 * The progression catalog as people read it: every progression, and the name of one by its key in
 * the current language. Until the catalog is in, or for a key it lacks, a progression is called by
 * its key.
 */
export function useProgressionNames() {
  const { localizedName } = useLocalizedName()
  const progressions = shallowRef<Progression[]>([])
  void useProgressionCatalog()
    .progressions()
    .then((list) => {
      if (list) progressions.value = list
    })

  const byKey = computed(() => new Map(progressions.value.map((p) => [p.key, p])))

  function nameOf(key: string): string {
    const progression = byKey.value.get(key)
    return progression ? localizedName(progression.names) : key
  }

  return { progressions, nameOf }
}
