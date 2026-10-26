import { computed, onUnmounted, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { CardCorner } from '@/shared/components/songChart/FloatingChordCard.vue'
import type { ChordView } from '@/shared/composables/useChordView'
import type { ChordViewOrigin } from '@/shared/composables/useSongChartTracking'
import { openingVoicing } from '@/shared/utils/songChartReading'

type LearnerSongChart = components['schemas']['LearnerSongChart']
type Instrument = components['schemas']['Instrument']
type Anchor = components['schemas']['SongChartChordAnchor']['attrs']
type ChordDefinition = components['schemas']['ChordDefinition']
type ChordVoicing = components['schemas']['ChordVoicing']

export interface SongChordCardOptions {
  /** Called each time a card opens, with the chord and the voicing it opens on. */
  onViewed?: (origin: ChordViewOrigin, chordId: string, voicingId: string) => void
  /** Whether the card floats over the chart, which then tucks it away to a chip when scrolled. */
  floating: MaybeRefOrGetter<boolean>
}

/**
 * The chord card of a song chart: tapping a chord over the lyrics opens it on the author's pick
 * (or the chord's best voicing), and tapping one in the chords in this song on its best voicing.
 * The voicing the student last chose for a chord wins over the author's pick for every anchor of
 * that chord, and Box or Neck is kept from one chord to the next. A chord with nothing to draw,
 * or a chart read with no instrument, has no card.
 *
 * A floating card stays out of the way of the chart: scrolling it tucks the card away to a chip.
 * Scroll events don't bubble, so the window hears them while capturing: the page's own scroll, or
 * that of a layer holding the chart, such as over a lesson.
 */
export function useSongChordCard(
  chart: MaybeRefOrGetter<LearnerSongChart | null>,
  instrument: MaybeRefOrGetter<Instrument | null>,
  options: SongChordCardOptions,
) {
  const chordsById = computed(() => new Map((toValue(chart)?.chords ?? []).map((c) => [c.chord_definition_id, c])))

  /** The chord and voicing an anchor's card opens on; null when it has none to show. */
  function cardFor(anchor: Anchor): { chord: ChordDefinition; voicing: ChordVoicing } | null {
    if (!toValue(instrument)) return null
    const chord = anchor.chordDefinitionId ? chordsById.value.get(anchor.chordDefinitionId) : undefined
    const voicing = chord ? openingVoicing(chord, anchor) : null
    return chord && voicing ? { chord, voicing } : null
  }

  /** The open card: the chord, as written where it was tapped, and the voicing shown. */
  const open = ref<{ anchor: Anchor | null; title: string; chord: ChordDefinition; voicingId: string } | null>(null)

  const chosenVoicings = ref(new Map<string, string>())
  const view = ref<ChordView>('box')
  const minimized = ref(false)
  const corner = ref<CardCorner>('bottom-right')

  const openVoicingId = computed({
    get: () => open.value?.voicingId ?? '',
    set: (id: string) => {
      if (!open.value) return
      open.value.voicingId = id
      chosenVoicings.value.set(open.value.chord.chord_definition_id, id)
    },
  })

  function show(origin: ChordViewOrigin, chord: ChordDefinition, authorVoicing: ChordVoicing) {
    const chordId = chord.chord_definition_id
    const voicingId = chosenVoicings.value.get(chordId) ?? authorVoicing.chord_voicing_id
    const anchor = origin.source === 'lyrics' ? origin.anchor : null
    open.value = { anchor, title: anchor?.writtenSymbol ?? chord.canonical_symbol, chord, voicingId }
    minimized.value = false
    options.onViewed?.(origin, chordId, voicingId)
  }

  function openFromLyrics(anchor: Anchor) {
    const card = cardFor(anchor)
    if (card) show({ source: 'lyrics', anchor }, card.chord, card.voicing)
  }

  function openFromStrip(chord: ChordDefinition) {
    const best = chord.voicings[0]
    if (best) show({ source: 'strip' }, chord, best)
  }

  /** The voicing a chord shows in the chords in this song: the one last chosen, or its best. */
  function stripVoicing(chord: ChordDefinition): ChordVoicing {
    const chosen = chosenVoicings.value.get(chord.chord_definition_id)
    return chord.voicings.find((v) => v.chord_voicing_id === chosen) ?? chord.voicings[0]!
  }

  function close() {
    open.value = null
  }

  const SCROLL_LISTENER = { capture: true, passive: true } as const
  function minimizeOnScroll() {
    if (open.value && toValue(options.floating)) minimized.value = true
  }
  watch(
    () => open.value !== null,
    (isOpen) => {
      if (isOpen) window.addEventListener('scroll', minimizeOnScroll, SCROLL_LISTENER)
      else window.removeEventListener('scroll', minimizeOnScroll, SCROLL_LISTENER)
    },
  )
  onUnmounted(() => window.removeEventListener('scroll', minimizeOnScroll, SCROLL_LISTENER))

  return { open, openVoicingId, view, minimized, corner, cardFor, openFromLyrics, openFromStrip, stripVoicing, close }
}
