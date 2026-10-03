<script setup lang="ts">
/**
 * Twenty seconds of "tap the highlighted fret": no knowledge involved, so the
 * times are pure tapping. Later answers subtract it, and only knowing counts.
 */
import { computed, onMounted, ref } from 'vue'

import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import { guitar } from '@/spikes/practice/fixtures/catalog'
import { bareDiagram } from '@/spikes/practice/labels'
import { usePracticeSpike } from '@/spikes/practice/usePracticeSpike'

const ROUNDS = 6
const MAX_FRET = 11
const TARGETS = [3, 8, 1, 10, 5, 7]

const emit = defineEmits<{ done: [baseline: number | null] }>()
const spike = usePracticeSpike()

const round = ref(0)
const times: number[] = []
let shownAt = 0
const target = computed(() => TARGETS[round.value % TARGETS.length]!)
const diagram = computed(() =>
  bareDiagram(`tap-${round.value}`, [
    {
      position_id: 'target',
      string: 6,
      fret: target.value,
      interval: 'R',
      note_name: '',
      shape: 'dot',
    },
  ]),
)
const cells = computed(() =>
  Array.from({ length: MAX_FRET + 1 }, (_, fret) => ({ optionId: `f${fret}`, string: 6, fret })),
)

onMounted(() => {
  shownAt = performance.now()
})

function onCell(optionId: string) {
  if (optionId !== `f${target.value}`) return
  times.push(Math.round(performance.now() - shownAt))
  if (round.value + 1 >= ROUNDS) {
    emit('done', spike.saveTapCheck(times.slice(1)))
    return
  }
  round.value++
  shownAt = performance.now()
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="text-sm font-semibold">Tap the highlighted fret — {{ round + 1 }} of {{ ROUNDS }}</p>
    <div class="overflow-x-auto rounded-lg bg-surface-raised p-3">
      <FrettedDiagramView
        :diagram="diagram"
        :instrument="guitar"
        :diagram-ref="{ diagram_id: diagram.diagram_id, layers: { label: 'none' } }"
        :answer-cells="cells"
        :selected-answer-ids="[]"
        :drawing-inert="false"
        :region-info="false"
        @select-answer="onCell"
      />
    </div>
  </div>
</template>
