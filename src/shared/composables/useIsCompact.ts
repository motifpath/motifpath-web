import type { Ref } from 'vue'

import { useMediaQuery } from '@/shared/composables/useMediaQuery'

const COMPACT_QUERY = '(max-width: 767px)'

/**
 * Tracks the single mobile/desktop split AppBar's `compact` prop needs,
 * rather than a continuous responsive range.
 */
export function useIsCompact(): { isCompact: Ref<boolean> } {
  const { matches } = useMediaQuery(COMPACT_QUERY)
  return { isCompact: matches }
}
