import { computed, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useApi } from '@/shared/composables/useApi'
import { fetchDiagram } from '@/shared/composables/useEmbeddedDiagram'
import { fetchInstruments } from '@/shared/composables/useListInstruments'

type Item = components['schemas']['PracticeSessionItem']
type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']

export type KeyTourChordsStatus = 'loading' | 'ready' | 'unavailable'

/**
 * The chords of the key a progression key tour is on: the voicing the plan names for each, which
 * the backing strums and a chord's box draws, and the instrument they sound on. The tour moves on
 * key by key, so each key's voicings are loaded when the tour reaches it. A key whose voicings or
 * instrument can't be loaded is unavailable: its take couldn't sound.
 */
export function useKeyTourChords(item: MaybeRefOrGetter<Item>, musicKey: MaybeRefOrGetter<string>) {
  const { coreApi } = useApi()

  const status = ref<KeyTourChordsStatus>('loading')
  const diagrams = ref<Record<string, Diagram>>({})
  const instrument = ref<Instrument | null>(null)

  /** The key on, as the plan lays it out; null for a key the plan doesn't hold. */
  const key = computed(() => toValue(item).progression_keys?.keys.find((k) => k.music_key === toValue(musicKey)) ?? null)

  // Bumped by every key, so a load that finishes after the tour moved on is dropped.
  let attempt = 0

  async function load() {
    const planned = key.value
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
    const onInstrument = data?.find((candidate) => candidate.instrument_id === loaded[0]?.[1]?.instrument_id) ?? null
    if (current !== attempt) return
    if (!onInstrument || planned.chart.some((chord) => !found[chord])) {
      status.value = 'unavailable'
      return
    }
    diagrams.value = found
    instrument.value = onInstrument
    status.value = 'ready'
  }

  watch(() => `${toValue(item).item_key}|${toValue(musicKey)}`, load, { immediate: true })

  return { status, key, diagrams, instrument }
}
