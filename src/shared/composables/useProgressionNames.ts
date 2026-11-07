import { computed } from 'vue'

import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useProgressionCatalog } from '@/shared/composables/useProgressionCatalog'
import { numeralsOfKey } from '@/shared/utils/progressionNumeral'

/**
 * The progression catalog as people read it: every progression, and the name of one by its key in
 * the current language. Until the catalog is in, or for a key it lacks, a created progression is
 * called by the numerals its key spells, and a catalog one by its key: an old revision of a chart
 * keeps the tag of a progression removed since.
 */
export function useProgressionNames() {
  const { localizedName } = useLocalizedName()
  const { progressions: load, current: progressions } = useProgressionCatalog()
  void load()

  const byKey = computed(() => new Map(progressions.value.map((p) => [p.key, p])))

  function nameOf(key: string): string {
    const progression = byKey.value.get(key)
    if (progression) return localizedName(progression.names)
    return numeralsOfKey(key)?.join('–') ?? key
  }

  return { progressions, nameOf }
}
