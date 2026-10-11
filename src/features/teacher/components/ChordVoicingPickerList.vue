<script setup lang="ts">
/**
 * Picks a chord voicing from the chord catalog to embed as a diagram. An author finds the chord by
 * a root and one quality, or types its symbol in any case, and sees the chord's voicings as chord
 * boxes, each named by the chord and where it sits ("Am · 5fr"). A symbol that isn't a chord, or a
 * chord the catalog doesn't have, says so. Picking a voicing reports its diagram, to embed like any
 * other; the voicing already picked is marked.
 *
 * The search stays put and only the voicings scroll, so the caller gives it a bounded height.
 */
import { Check } from 'lucide-vue-next'
import { computed, ref, shallowRef, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import ChoiceChip from '@/shared/components/ChoiceChip.vue'
import ChordBox from '@/shared/components/diagram/ChordBox.vue'
import { useApi } from '@/shared/composables/useApi'
import { useChordLookup } from '@/shared/composables/useChordLookup'
import { fetchDiagram } from '@/shared/composables/useEmbeddedDiagram'
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useTypedT } from '@/shared/composables/useTypedT'
import { CHORD_QUALITIES, chordSymbolOf, readTypedChord } from '@/shared/utils/chordSymbolInput'
import type { ChordQualityChoice } from '@/shared/utils/chordSymbolInput'
import { CHROMATIC_SCALE } from '@/shared/utils/musicTheory'
import { voicingNames } from '@/shared/utils/songChartReading'

type Diagram = components['schemas']['Diagram']

withDefaults(defineProps<{ pickedDiagramId?: string | null }>(), { pickedDiagramId: null })
const emit = defineEmits<{ select: [diagram: Diagram] }>()

const { t } = useTypedT()
const { coreApi } = useApi()
const { lookUp, checkOf } = useChordLookup()
const { instruments } = useListInstruments()

const root = ref('')
const quality = ref<ChordQualityChoice>('')
const typed = ref('')
const isTyping = computed(() => typed.value.trim() !== '')

function chooseRoot(event: Event) {
  if (!(event.target instanceof HTMLSelectElement)) return
  root.value = event.target.value
  typed.value = ''
}

function chooseQuality(next: ChordQualityChoice) {
  quality.value = next
  typed.value = ''
}

/** The symbol asked of the catalog: what's typed, else the root with its quality. */
const symbol = computed(() => {
  if (isTyping.value) return readTypedChord(typed.value)
  return root.value ? chordSymbolOf(root.value, quality.value) : ''
})
watch(symbol, (s) => {
  if (s) lookUp(s)
})

const check = computed(() => (symbol.value ? checkOf(symbol.value) : null))
const voicings = computed(() => check.value?.chord?.voicings ?? [])
const names = computed(() => voicingNames(voicings.value, t('songChart.openVoicing')).map((where) => `${symbol.value} · ${where}`))

/** What the author wrote, as they wrote it, for a message about it. */
const shownSymbol = computed(() => (isTyping.value ? typed.value.trim() : symbol.value))
const statusMessage = computed(() => {
  switch (check.value?.kind) {
    case 'not_a_chord':
      return t('chordVoicingPicker.notAChord', { symbol: shownSymbol.value })
    case 'unsupported':
    case 'not_in_catalog':
      return t('chordVoicingPicker.notInCatalog', { symbol: shownSymbol.value })
    default:
      return null
  }
})

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

function qualityLabel(q: ChordQualityChoice) {
  return q === '' ? t('chordVoicingPicker.major') : q
}

function pick(diagramId: string) {
  const diagram = diagrams.value.get(diagramId)
  if (diagram) emit('select', diagram)
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3">
    <div data-test="chord-filters" class="flex shrink-0 flex-col gap-2">
      <div class="flex flex-wrap items-end gap-3">
        <label class="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          {{ t('chordVoicingPicker.rootLabel') }}
          <select
            data-test="chord-root"
            :value="root"
            class="h-10 rounded-md border border-border bg-surface px-2 text-sm font-normal normal-case tracking-normal text-ink"
            @change="chooseRoot"
          >
            <option value="">{{ t('chordVoicingPicker.chooseRoot') }}</option>
            <option v-for="note in CHROMATIC_SCALE" :key="note" :value="note">{{ note }}</option>
          </select>
        </label>
        <label class="flex flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          {{ t('chordVoicingPicker.symbolLabel') }}
          <input
            v-model="typed"
            data-test="chord-search"
            type="text"
            maxlength="32"
            autocapitalize="off"
            :placeholder="t('chordVoicingPicker.symbolPlaceholder')"
            class="h-10 min-w-32 rounded-md border border-border bg-surface px-3 font-mono text-sm font-normal normal-case tracking-normal text-ink"
          />
        </label>
      </div>
      <div class="flex flex-wrap gap-x-1.5" role="group" :aria-label="t('chordVoicingPicker.qualityLabel')">
        <ChoiceChip
          v-for="q in CHORD_QUALITIES"
          :key="q || 'major'"
          data-test="chord-quality"
          :label="qualityLabel(q)"
          :selected="!isTyping && quality === q"
          @toggle="chooseQuality(q)"
        />
      </div>
      <p v-if="statusMessage" data-test="chord-search-status" :data-kind="check?.kind" class="text-sm text-ink-muted">
        {{ statusMessage }}
      </p>
    </div>

    <div data-test="chord-results" class="min-h-0 flex-1 overflow-y-auto">
      <ul v-if="voicings.length" class="grid grid-cols-2 gap-2 p-0.5 sm:grid-cols-3 lg:grid-cols-4">
        <li v-for="(v, i) in voicings" :key="v.chord_voicing_id">
          <button
            type="button"
            data-test="chord-voicing"
            :aria-current="v.diagram_id === pickedDiagramId ? 'true' : undefined"
            class="relative flex w-full flex-col items-center gap-1 rounded-lg border bg-surface-raised p-2 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
            :class="v.diagram_id === pickedDiagramId ? 'border-accent ring-2 ring-inset ring-accent' : 'border-border'"
            :disabled="!diagrams.get(v.diagram_id)"
            @click="pick(v.diagram_id)"
          >
            <Check
              v-if="v.diagram_id === pickedDiagramId"
              :size="16"
              class="absolute right-2 top-2 text-accent-text"
              aria-hidden="true"
            />
            <ChordBox
              v-if="diagrams.get(v.diagram_id) && instrumentOf(v.instrument_id)"
              :voicing="v"
              :diagram="diagrams.get(v.diagram_id)!"
              :instrument="instrumentOf(v.instrument_id)!"
              :label="names[i] ?? symbol"
            />
            <span data-test="chord-voicing-name" class="text-sm font-semibold text-ink">{{ names[i] }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
