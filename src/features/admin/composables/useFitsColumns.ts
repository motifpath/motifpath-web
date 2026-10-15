import type { Ref } from 'vue'

import { useMediaQuery } from '@/shared/composables/useMediaQuery'

/**
 * Whether the engagement tables have room for their columns. A student row and an event row need
 * about 760 px of content; with the Teach sidebar beside them, that takes a window of 1024 px or
 * more. Narrower, each row stacks instead.
 */
export function useFitsColumns(): Ref<boolean> {
  return useMediaQuery('(min-width: 1024px)').matches
}
