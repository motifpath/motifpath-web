<script setup lang="ts">
/**
 * Picks a chord voicing from the chord catalog to embed as a diagram: an author writes a chord
 * symbol, read the way the server reads it, and sees the chord's voicings as chord boxes, named
 * by where they sit on the neck. A symbol that isn't a chord, or a chord the catalog doesn't
 * have, says so. Picking a voicing reports its diagram, to embed like any other.
 */
import { computed, ref, shallowRef, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import ChordBoxDiagram from '@/shared/components/songChart/ChordBoxDiagram.vue'
import { useApi } from '@/shared/composables/useApi'
import { useChordLookup } from '@/shared/composables/useChordLookup'
import { fetchDiagram } from '@/shared/composables/useEmbeddedDiagram'
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useTypedT } from '@/shared/composables/useTypedT'
import { voicingNames } from '@/shared/utils/songChartReading'

type Diagram = components['schemas']['Diagram']

const emit = defineEmits<{ select: [diagram: Diagram] }>()

const { t } = useTypedT()
const { coreApi } = useApi()
const { lookUp, checkOf } = useChordLookup()
const { instruments } = useListInstruments()

const symbol = ref('')
const written = computed(() => symbol.value.trim())
watch(written, (s) => {
  if (s) lookUp(s)
})

const check = computed(() => (written.value ? checkOf(written.value) : null))
const voicings = computed(() => check.value?.chord?.voicings ?? [])
const names = computed(() => voicingNames(voicings.value, t('songChart.openVoicing')))

/** Each voicing's diagram, by id, as it loads. */
const diagrams = shallowRef(new Map<string, Diagram>())
watch(voicings, (list) => {
  for (const v of list) {
    if (diagrams.value.has(v.diagram_id)) continue
    void fetchDiagram(coreApi, v.diagram_id).then((d) => {
      if (d) diagrams.value = new Map(diagrams.value).set(d.diagram_id, d)
    })
  }
})

function instrumentOf(instrumentId: string) {
  return instruments.value.find((i) => i.instrument_id === instrumentId) ?? null
}

function pick(diagramId: string) {
  const diagram = diagrams.value.get(diagramId)
  if (diagram) emit('select', diagram)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <label class="flex flex-col gap-1.5 text-sm font-semibold text-ink">
      {{ t('chordVoicingPicker.symbolLabel') }}
      <input
        v-model="symbol"
        data-test="chord-search"
        type="text"
        maxlength="32"
        :placeholder="t('chordVoicingPicker.symbolPlaceholder')"
        class="w-40 rounded-md border border-border bg-surface-sunken px-3 py-2 font-mono text-sm text-ink"
      />
    </label>

    <p
      v-if="check && check.kind !== 'ok' && check.kind !== 'without_bass'"
      data-test="chord-search-status"
      :data-kind="check.kind"
      class="text-sm text-ink-muted"
    >
      {{ t(`songChartEditor.chordCheck.${check.kind}`) }}
    </p>

    <ul v-if="voicings.length" class="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <li v-for="(v, i) in voicings" :key="v.chord_voicing_id">
        <button
          type="button"
          data-test="chord-voicing"
          class="flex w-full flex-col items-center gap-1 rounded-lg border border-border bg-surface-raised p-2 hover:border-accent disabled:opacity-50"
          :disabled="!diagrams.get(v.diagram_id)"
          @click="pick(v.diagram_id)"
        >
          <ChordBoxDiagram
            v-if="diagrams.get(v.diagram_id) && instrumentOf(v.instrument_id)"
            :voicing="v"
            :diagram="diagrams.get(v.diagram_id)!"
            :instrument="instrumentOf(v.instrument_id)!"
            :label="`${written} ${names[i]}`"
          />
          <span data-test="chord-voicing-name" class="text-sm font-semibold text-ink">{{ names[i] }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
