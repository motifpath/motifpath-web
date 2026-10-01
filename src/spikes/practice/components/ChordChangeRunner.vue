<script setup lang="ts">
/** One-minute chord changes: switch between two chords, then count and rate. */
import { onBeforeUnmount, ref } from 'vue'

import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import RatingButtons from '@/spikes/practice/components/RatingButtons.vue'
import { diagrams, guitar, STUDENT_ID } from '@/spikes/practice/fixtures/catalog'
import type { ChordChangeItem, Rating } from '@/spikes/practice/model'
import { usePracticeSpike } from '@/spikes/practice/usePracticeSpike'

const props = defineProps<{ item: ChordChangeItem; sessionId: string }>()
const emit = defineEmits<{ done: [] }>()

const spike = usePracticeSpike()
const from = diagrams[props.item.from_diagram_id]!
const to = diagrams[props.item.to_diagram_id]!
const best = spike.states.value.get(props.item.item_key)?.best_changes_per_minute ?? null

const DURATION = 60
const phase = ref<'ready' | 'running' | 'count'>('ready')
const left = ref(DURATION)
const count = ref(best ?? 20)
let timer: ReturnType<typeof setInterval> | undefined

function start() {
  phase.value = 'running'
  left.value = DURATION
  timer = setInterval(() => {
    left.value--
    if (left.value <= 0) {
      clearInterval(timer)
      phase.value = 'count'
    }
  }, 1000)
}

function stopEarly() {
  clearInterval(timer)
  phase.value = 'count'
}

onBeforeUnmount(() => clearInterval(timer))

function rate(rating: Rating) {
  spike.addEvidence({
    evidence_id: spike.newId('ev'),
    student_id: STUDENT_ID,
    item_key: props.item.item_key,
    occurred_at: spike.clock(),
    session_id: props.sessionId,
    source: 'self_assessed',
    rating,
    bpm: null,
    changes_per_minute: count.value,
  })
  emit('done')
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-baseline justify-between">
      <p class="text-lg font-semibold">{{ item.label }}</p>
      <p class="text-sm text-ink-muted">Best {{ best ?? '—' }} · goal {{ item.target_changes_per_minute }}/min</p>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <div v-for="d in [from, to]" :key="d.diagram_id" class="overflow-x-auto rounded-lg bg-surface-raised p-2">
        <p class="mb-1 text-sm font-semibold">{{ d.names.en }}</p>
        <FrettedDiagramView :diagram="d" :instrument="guitar" :diagram-ref="{ diagram_id: d.diagram_id, layers: { label: 'note' } }" :region-info="false" compact />
      </div>
    </div>

    <button v-if="phase === 'ready'" type="button" class="rounded-lg bg-accent p-3 text-accent-fg" @click="start">
      Start the minute — switch back and forth, count each change
    </button>
    <template v-else-if="phase === 'running'">
      <p class="text-center text-5xl font-semibold tabular-nums">{{ left }}</p>
      <button type="button" class="rounded-lg border border-border p-3" @click="stopEarly">Stop</button>
    </template>
    <template v-else>
      <p class="font-semibold">How many changes did you make?</p>
      <div class="flex items-center justify-center gap-4">
        <button type="button" class="h-7 w-7 rounded-full border border-border text-xl" @click="count = Math.max(0, count - 1)">−</button>
        <span class="w-16 text-center text-3xl font-semibold tabular-nums">{{ count }}</span>
        <button type="button" class="h-7 w-7 rounded-full border border-border text-xl" @click="count++">+</button>
      </div>
      <p class="font-semibold">And how clean were they?</p>
      <RatingButtons @rate="rate" />
    </template>
  </div>
</template>
