<script setup lang="ts">
/**
 * Writing one chord in the lyrics, in a popover at the selected word or the chord at the cursor:
 * the symbol, checked as it is typed the same way the server reads it, and the voicings learners
 * may see first, as chord boxes named by where they sit. No pick means the best voicing. It sits
 * below the selection, or above it when there is no room below.
 */
import { Music, X } from 'lucide-vue-next'
import { computed, shallowRef, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import ChordBox from '@/shared/components/diagram/ChordBox.vue'
import { useApi } from '@/shared/composables/useApi'
import { fetchDiagram } from '@/shared/composables/useEmbeddedDiagram'
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { ChordCheck } from '@/shared/utils/chordCheck'
import { voicingNames } from '@/shared/utils/songChartReading'

type ChordVoicing = components['schemas']['ChordVoicing']
type Diagram = components['schemas']['Diagram']

const props = defineProps<{
  /** Whether the cursor is on a chord already, which Put changes rather than adds. */
  onChord: boolean
  /** The typed symbol's check; null until there is one. */
  check: ChordCheck | null
  /** The voicings of the chord at the cursor, and the one picked; none for a new chord. */
  voicings: ChordVoicing[]
  pickedVoicingId: string | null
  /** Where it sits: its top-left corner in the lyrics' box, and whether it is above the selection. */
  position: { top: number; left: number; above: boolean }
}>()
const symbol = defineModel<string>('symbol', { required: true })
const emit = defineEmits<{ put: []; remove: []; pick: [voicingId: string | null]; close: [] }>()

const { t } = useTypedT()
const { coreApi } = useApi()
const { instruments } = useListInstruments()

const names = computed(() => voicingNames(props.voicings, t('songChart.openVoicing')))

/** Each voicing's diagram, by id, as it loads. */
const diagrams = shallowRef(new Map<string, Diagram>())
watch(
  () => props.voicings,
  (list) => {
    for (const v of list) {
      if (diagrams.value.has(v.diagram_id)) continue
      void fetchDiagram(coreApi, v.diagram_id).then((d) => {
        if (d) diagrams.value = new Map(diagrams.value).set(d.diagram_id, d)
      })
    }
  },
  { immediate: true },
)

function instrumentOf(instrumentId: string) {
  return instruments.value.find((i) => i.instrument_id === instrumentId) ?? null
}

// Placed where the selection is, which only the editor's geometry knows.
const placement = computed(() => ({ top: `${props.position.top}px`, left: `${props.position.left}px` }))
</script>

<template>
  <div
    data-test="chord-popover"
    :data-above="String(position.above)"
    role="dialog"
    :aria-label="t('songChartEditor.chord')"
    class="absolute z-30 flex w-[min(340px,calc(100vw-48px))] flex-col gap-3 rounded-2xl border border-border bg-surface-raised p-3 shadow-level2"
    :style="placement"
    @keydown.esc.stop="emit('close')"
  >
    <div class="flex items-center gap-2">
      <Music :size="18" class="shrink-0 text-ink-muted" aria-hidden="true" />
      <input
        v-model="symbol"
        data-test="chord-symbol-input"
        type="text"
        maxlength="32"
        :placeholder="t('songChartEditor.chordPlaceholder')"
        :aria-label="t('songChartEditor.chord')"
        class="h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 font-mono text-base text-ink"
        @keydown.enter.prevent="emit('put')"
      />
      <button
        type="button"
        data-test="put-chord"
        class="h-10 shrink-0 rounded-full bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-50"
        :disabled="!symbol.trim()"
        @click="emit('put')"
      >
        {{ onChord ? t('songChartEditor.changeChord') : t('songChartEditor.putChord') }}
      </button>
      <button type="button" class="flex size-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken" :aria-label="t('songChart.closeSheet')" @click="emit('close')">
        <X :size="18" aria-hidden="true" />
      </button>
    </div>

    <p
      v-if="check"
      data-test="chord-status"
      :data-kind="check.kind"
      :data-blocks="String(check.blocks)"
      class="text-xs"
      :class="check.kind === 'not_a_chord' || check.kind === 'unsupported' ? 'text-danger' : check.blocks ? 'text-warning' : 'text-ink-muted'"
    >
      {{ t(`songChartEditor.chordCheck.${check.kind}`) }}
      <span v-if="check.blocks">({{ t('songChartEditorView.blocksPublishing') }})</span>
    </p>

    <div v-if="voicings.length" role="radiogroup" :aria-label="t('songChart.voicings')" class="flex flex-wrap gap-2">
      <button
        type="button"
        role="radio"
        data-test="voicing-option"
        data-voicing-id=""
        :aria-checked="pickedVoicingId === null"
        class="flex min-h-12 items-center rounded-xl border px-3 text-sm font-semibold"
        :class="pickedVoicingId === null ? 'border-accent bg-accent-muted text-accent-text' : 'border-border text-ink'"
        @click="emit('pick', null)"
      >
        {{ t('songChartEditor.bestVoicing') }}
      </button>
      <button
        v-for="(v, i) in voicings"
        :key="v.chord_voicing_id"
        type="button"
        role="radio"
        data-test="voicing-option"
        :data-voicing-id="v.chord_voicing_id"
        :aria-checked="pickedVoicingId === v.chord_voicing_id"
        class="flex flex-col items-center gap-0.5 rounded-xl border px-1.5 pb-1 pt-1.5"
        :class="pickedVoicingId === v.chord_voicing_id ? 'border-accent bg-accent-muted' : 'border-border'"
        @click="emit('pick', v.chord_voicing_id)"
      >
        <span v-if="diagrams.get(v.diagram_id) && instrumentOf(v.instrument_id)" data-test="chord-box">
          <ChordBox :voicing="v" :diagram="diagrams.get(v.diagram_id)!" :instrument="instrumentOf(v.instrument_id)!" :label="names[i]!" :scale="0.4" />
        </span>
        <span data-test="voicing-name" class="text-xs font-semibold text-ink">{{ names[i] }}</span>
      </button>
    </div>

    <button v-if="onChord" type="button" data-test="remove-chord" class="self-start text-sm font-semibold text-danger hover:underline" @click="emit('remove')">
      {{ t('songChartEditor.removeChord') }}
    </button>
  </div>
</template>
