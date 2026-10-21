import { ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useApi } from '@/shared/composables/useApi'
import { fetchDiagram } from '@/shared/composables/useEmbeddedDiagram'
import { fetchInstruments } from '@/shared/composables/useListInstruments'

type Item = components['schemas']['PracticeSessionItem']
type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']

export type GuideToneChordsStatus = 'loading' | 'ready' | 'unavailable'

/**
 * What a guide tone's playback sounds: the voicing the plan names for each chord, the instrument
 * they sound on, and on a bass layout the bass whose voice plays each chord's root under it. A
 * guide tone whose voicings or instrument can't be loaded is unavailable: its take couldn't sound.
 */
export function useGuideToneChords(item: MaybeRefOrGetter<Item>) {
  const { coreApi } = useApi()

  const status = ref<GuideToneChordsStatus>('loading')
  const diagrams = ref<Record<string, Diagram>>({})
  const instrument = ref<Instrument | null>(null)
  /** The bass under the chords; null on guitar. */
  const bass = ref<{ instrument: Instrument } | null>(null)

  // Bumped by every item, so a load that finishes after the next item came is dropped.
  let attempt = 0

  async function load() {
    const planned = toValue(item).guide_tone
    const current = ++attempt
    status.value = 'loading'
    if (!planned || planned.voicings.length === 0) {
      status.value = 'unavailable'
      return
    }
    const loaded = await Promise.all(planned.voicings.map(async (v) => [v.chord, await fetchDiagram(coreApi, v.diagram_id)] as const))
    const found: Record<string, Diagram> = {}
    for (const [chord, diagram] of loaded) {
      if (!diagram?.chord_voicing) {
        if (current === attempt) status.value = 'unavailable'
        return
      }
      found[chord] = diagram
    }
    const { data } = await fetchInstruments(coreApi)
    if (current !== attempt) return
    const chordInstrument = data?.find((candidate) => candidate.instrument_id === loaded[0]?.[1]?.instrument_id) ?? null
    if (!chordInstrument || planned.bars.some((bar) => !found[bar.chord])) {
      status.value = 'unavailable'
      return
    }
    // The chords sound on the guitar; a layout other than theirs is a bass, which plays the roots.
    const layout = planned.layout_instrument_id === chordInstrument.instrument_id ? null : data?.find((candidate) => candidate.instrument_id === planned.layout_instrument_id)
    diagrams.value = found
    instrument.value = chordInstrument
    bass.value = layout ? { instrument: layout } : null
    status.value = 'ready'
  }

  watch(() => toValue(item).item_key, load, { immediate: true })

  return { status, diagrams, instrument, bass }
}
