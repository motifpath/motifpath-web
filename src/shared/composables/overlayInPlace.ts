import type { InjectionKey } from 'vue'

/**
 * True renders overlays where they were opened instead of on <body>. Only the unit tests provide it:
 * jsdom can't show stacking, and their wrappers find the overlay's content in place.
 */
export const overlayInPlaceKey: InjectionKey<boolean> = Symbol('overlayInPlace')
