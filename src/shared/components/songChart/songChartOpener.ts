import type { InjectionKey } from 'vue'

/**
 * How the page a song chart card sits on opens the chart. A page that must keep its place, such
 * as a lesson whose video should be paused and resumed where it was, provides one; without it, a
 * card opens the chart's own page.
 */
export type SongChartOpener = (songChartId: string) => void

export const SONG_CHART_OPENER: InjectionKey<SongChartOpener> = Symbol('songChartOpener')
