import type { InjectionKey } from 'vue'

/**
 * What a section's heading in the lyrics editor needs from the editor around it, by the section's
 * place in the chart: the tags the last save found it doesn't play, the key they were checked in,
 * and the ways to change its tags.
 */
export interface SectionHeadingContext {
  unplayedAt: (sectionIndex: number) => string[]
  concertKey: () => string | null
  remove: (sectionIndex: number, key: string) => void
  openPicker: (sectionIndex: number, anchor: HTMLElement) => void
}

export const sectionHeadingContextKey: InjectionKey<SectionHeadingContext> = Symbol('sectionHeadingContext')
