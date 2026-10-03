<script setup lang="ts">
/**
 * One fretboard-cell question, alternating between "where is this note?" (tap
 * the fret) and "which note is this?" (pick the name). Reports the raw answer
 * and its latency; right or wrong is shown by the same grader the server runs.
 */
import { computed, onMounted, ref } from 'vue'

import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import { findTheNoteQuestion, nameTheNoteQuestion } from '@/spikes/practice/drillGenerator'
import { gradeContext, instruments } from '@/spikes/practice/fixtures/catalog'
import { grade } from '@/spikes/practice/graders'
import { bareDiagram } from '@/spikes/practice/labels'
import type { FretboardCellItem, PracticeResponse } from '@/spikes/practice/model'
import { seededRandom } from '@/spikes/practice/random'

const MAX_FRET = 11

const props = defineProps<{ item: FretboardCellItem; variant: 'find' | 'name' }>()
const emit = defineEmits<{ answered: [response: PracticeResponse] }>()

const find = computed(() => findTheNoteQuestion(props.item, MAX_FRET))
const name = computed(() =>
  nameTheNoteQuestion(props.item, seededRandom(props.item.fret * 7 + props.item.string)),
)

const shownAt = ref(0)
onMounted(() => {
  shownAt.value = performance.now()
})

const picked = ref<string | null>(null)
const correct = ref<boolean | null>(null)

const target = {
  position_id: 'target',
  string: props.item.string,
  fret: props.item.fret,
  interval: 'R' as const,
  note_name: props.item.note_name,
  shape: 'dot' as const,
}

const questionDiagram = computed(() =>
  bareDiagram(
    `q-${props.item.item_key}`,
    props.variant === 'name' || correct.value !== null ? [target] : [],
  ),
)

const diagramRef = computed(() => ({
  diagram_id: questionDiagram.value.diagram_id,
  layers: { label: correct.value === null ? ('none' as const) : ('note' as const) },
}))

/** The whole neck stays in view: every fret of the asked string is a target. */
const cells = computed(() =>
  find.value.frets.map((fret) => ({ optionId: `f${fret}`, string: props.item.string, fret })),
)

function answer(response: PracticeResponse, choice: string) {
  if (correct.value !== null) return
  picked.value = choice
  const result = grade(props.item, response, gradeContext)
  const isCorrect =
    'graded' in result && result.graded.source === 'auto_graded' && result.graded.correct
  correct.value = isCorrect
  setTimeout(() => emit('answered', response), isCorrect ? 500 : 1400)
}

const latency = () => Math.round(performance.now() - shownAt.value)

function onCell(optionId: string) {
  const fret = Number(optionId.slice(1))
  answer(
    { kind: 'find_the_note', string: props.item.string, fret, latency_ms: latency() },
    optionId,
  )
}

function onName(choice: string) {
  answer({ kind: 'name_the_note', chosen_note: choice, latency_ms: latency() }, choice)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <p class="text-lg font-semibold">
      <template v-if="variant === 'find'"
        >Where is <span class="text-accent-text">{{ item.note_name }}</span> on string
        {{ item.string }}?</template
      >
      <template v-else>Which note is this?</template>
    </p>

    <div class="overflow-x-auto rounded-lg bg-surface-raised p-3">
      <FrettedDiagramView
        :diagram="questionDiagram"
        :instrument="instruments[item.instrument_id]!"
        :diagram-ref="diagramRef"
        :answer-cells="cells"
        :selected-answer-ids="picked && variant === 'find' ? [picked] : []"
        :drawing-inert="variant === 'name' || correct !== null"
        :region-info="false"
        @select-answer="onCell"
      />
    </div>

    <div v-if="variant === 'name'" class="grid grid-cols-4 gap-2">
      <button
        v-for="choice in name.choices"
        :key="choice"
        type="button"
        class="rounded-lg border border-border p-3 text-lg font-semibold"
        :class="{
          'bg-success-muted': correct !== null && choice === name.answer,
          'bg-danger-muted': correct === false && choice === picked,
        }"
        @click="onName(choice)"
      >
        {{ choice }}
      </button>
    </div>

    <p v-if="correct === true" class="text-success">Right!</p>
    <p v-else-if="correct === false" class="text-danger">
      It's {{ item.note_name }} — string {{ item.string }}, fret {{ item.fret }}.
    </p>
  </div>
</template>
