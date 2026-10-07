<script setup lang="ts">
/**
 * One diagram shape of a practice session, asked the way its drill says, on the shape's own
 * diagram with its labels off. Naming the shape: its name never shows, and the student picks
 * which member of its family it is. Finding a degree: its roots are labelled, its other positions
 * aren't, and the student taps where the degree asked is, anywhere on the board around the shape.
 * The parent records and grades the answer, given the board the diagram draws; feedback shows in
 * place, a wrong answer revealing the right one.
 */
import { CircleCheck, CircleX } from 'lucide-vue-next'
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useAdvanceAfterAnswer } from '@/features/student/composables/useAdvanceAfterAnswer'
import type { GradedShapeAnswer, ShapeBoard } from '@/features/student/composables/usePracticeSessionRun'
import { pickReasonKeys } from '@/features/student/utils/pickReason'
import type { AnswerMarkKind } from '@/shared/components/diagram/AnswerMark.vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import type { AnswerCell } from '@/shared/components/diagram/FrettedDiagramView.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useEmbeddedDiagram } from '@/shared/composables/useEmbeddedDiagram'
import { useIntervalLabel } from '@/shared/composables/useIntervalLabel'
import { useTypedT } from '@/shared/composables/useTypedT'
import { cellsOfDegree } from '@/shared/utils/diagramShape'
import type { ShapeAnswer } from '@/shared/utils/diagramShape'
import type { DiagramEmbed } from '@/shared/utils/diagramEmbed'

type Item = components['schemas']['PracticeSessionItem']
type Shape = NonNullable<Item['diagram_shape']>
type Diagram = components['schemas']['Diagram']

const props = defineProps<{
  /** A diagram shape item. */
  item: Item
  /** The answer given, graded, once committed. */
  answer: GradedShapeAnswer | null
}>()

const emit = defineEmits<{ answer: [answer: ShapeAnswer, board: ShapeBoard]; next: [] }>()

const { t } = useTypedT()
const { intervalLabel } = useIntervalLabel()

const shape = computed<Shape>(() => props.item.diagram_shape!)
const naming = computed(() => shape.value.drill === 'name_the_shape')

const embed = computed<DiagramEmbed>(() => ({
  kind: 'single',
  ref: { diagram_id: shape.value.diagram_id, layers: { intervals: false, label: 'none' } },
}))
const { status, diagram, instrument } = useEmbeddedDiagram(embed)

/** The board the diagram draws, which an answer is graded on. */
const board = computed<ShapeBoard | null>(() => {
  if (!diagram.value || !instrument.value) return null
  const positions = diagram.value.positions.flatMap(({ string, fret, interval }) =>
    string === null || string === undefined || fret === null || fret === undefined ? [] : [{ string, fret, interval }],
  )
  return { positions, stringCount: instrument.value.string_count ?? 0 }
})

/**
 * The diagram as the drill shows it. Finding a degree labels the roots, and only them: the root
 * is shown so the degree can be counted from it, and every other label would give the answer away.
 */
const shownDiagram = computed<Diagram | null>(() => {
  if (!diagram.value) return null
  if (naming.value) return diagram.value
  // Already in the reader's language, and under the language any reader falls back to.
  const root = { en: intervalLabel('R') }
  return {
    ...diagram.value,
    label_display: 'hidden',
    positions: diagram.value.positions.map((position) => ({ ...position, custom_label: position.interval === 'R' ? root : undefined })),
  }
})
const shownRef = computed(() => ({
  diagram_id: shape.value.diagram_id,
  layers: { intervals: false, label: naming.value ? ('none' as const) : ('custom' as const) },
}))

const prompt = computed(() =>
  naming.value
    ? t('sessionDiagramShape.nameTheShape')
    : t('sessionDiagramShape.findTheDegree', { degree: intervalLabel(shape.value.asked_interval ?? '') }),
)

const cellId = (string: number, fret: number) => `${string}:${fret}`

/** Every cell of every string from a fret before the shape to a fret after it, open strings included. */
const answerCells = computed<AnswerCell[]>(() => {
  const shown = board.value
  if (naming.value || !shown || shown.positions.length === 0) return []
  const frets = shown.positions.map((position) => position.fret)
  const first = Math.max(0, Math.min(...frets) - 1)
  const last = Math.max(...frets) + 1
  const cells: AnswerCell[] = []
  for (let string = 1; string <= shown.stringCount; string++) {
    for (let fret = first; fret <= last; fret++) cells.push({ optionId: cellId(string, fret), string, fret })
  }
  return cells
})

/** A graded tap's marks: the tap, and where the degree is beside a wrong one. */
const cellMarks = computed<Record<string, AnswerMarkKind>>(() => {
  const given = props.answer
  if (!given || given.answer.response_type !== 'find_the_degree' || !board.value) return {}
  const tapped = cellId(given.answer.string, given.answer.fret)
  if (given.correct) return { [tapped]: 'right' }
  const marks: Record<string, AnswerMarkKind> = { [tapped]: 'wrong' }
  for (const cell of cellsOfDegree(board.value.positions, given.answer.interval)) marks[cellId(cell.string, cell.fret)] = 'right'
  return marks
})

/** How a graded answer marks a shape choice: the one picked, and the right one beside a wrong pick. */
function choiceMark(member: string): AnswerMarkKind | undefined {
  const given = props.answer
  if (!given || given.answer.response_type !== 'name_the_shape') return undefined
  if (member === shape.value.shape) return given.correct || given.answer.shape !== member ? 'right' : undefined
  return given.answer.shape === member ? 'wrong' : undefined
}

function nameShape(member: string) {
  if (!props.answer && board.value) emit('answer', { response_type: 'name_the_shape', shape: member }, board.value)
}

function tapCell(optionId: string) {
  const cell = answerCells.value.find((candidate) => candidate.optionId === optionId)
  const degree = shape.value.asked_interval
  if (props.answer || !cell || !degree || !board.value) return
  emit('answer', { response_type: 'find_the_degree', interval: degree, string: cell.string, fret: cell.fret }, board.value)
}

const { next } = useAdvanceAfterAnswer(
  () => props.answer,
  () => emit('next'),
)
</script>

<template>
  <div class="flex flex-col gap-4" data-test="session-diagram-shape">
    <span data-test="item-reason" class="self-start rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium">
      {{ t(pickReasonKeys[item.reason]) }}
    </span>

    <div v-if="status === 'loading'" data-test="shape-loading">
      <StateLoading />
    </div>

    <div v-else-if="status === 'unavailable' || !shownDiagram || !instrument" class="flex flex-col items-start gap-3">
      <p class="text-ink-muted">{{ t('sessionDiagramShape.unavailable') }}</p>
      <PracticeActionBar>
        <PrimaryButton data-test="skip-shape" data-primary-action class="h-12 w-full" @click="emit('next')">
          {{ t('practiceSessionView.skip') }}
        </PrimaryButton>
      </PracticeActionBar>
    </div>

    <template v-else>
      <p data-test="shape-prompt" class="text-lg font-semibold">{{ prompt }}</p>

      <FrettedDiagramView
        :diagram="shownDiagram"
        :instrument="instrument"
        :diagram-ref="shownRef"
        label-mode="hidden"
        :region-info="false"
        :drawing-inert="naming"
        :answer-cells="answerCells"
        :answer-marks="cellMarks"
        @select-answer="tapCell"
      />

      <div v-if="naming" class="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" :aria-label="t('sessionDiagramShape.shapes')">
        <button
          v-for="option in shape.options"
          :key="option.shape"
          type="button"
          data-test="shape-choice"
          :data-mark="choiceMark(option.shape)"
          :disabled="answer !== null"
          class="relative flex h-12 items-center justify-center rounded-md border px-3 text-base font-semibold"
          :class="{
            'border-success bg-success-muted': choiceMark(option.shape) === 'right',
            'border-danger bg-danger-muted': choiceMark(option.shape) === 'wrong',
            'border-border hover:border-accent': !choiceMark(option.shape),
          }"
          @click="nameShape(option.shape)"
        >
          {{ option.name }}
          <CircleCheck v-if="choiceMark(option.shape) === 'right'" :size="14" class="absolute right-1 top-1 text-success" aria-hidden="true" />
          <CircleX v-else-if="choiceMark(option.shape) === 'wrong'" :size="14" class="absolute right-1 top-1 text-danger" aria-hidden="true" />
          <span v-if="choiceMark(option.shape)" class="sr-only">
            {{ choiceMark(option.shape) === 'right' ? t('sessionFretboardCell.markedRight') : t('sessionFretboardCell.markedWrong') }}
          </span>
        </button>
      </div>
    </template>

    <PracticeActionBar v-if="answer">
      <p
        data-test="answer-feedback"
        role="status"
        class="flex items-center gap-1.5 text-base font-semibold"
        :class="answer.correct ? 'text-success' : 'text-danger'"
      >
        <CircleCheck v-if="answer.correct" :size="22" aria-hidden="true" />
        <CircleX v-else :size="22" aria-hidden="true" />
        {{ answer.correct ? t('sessionExercise.right') : t('sessionExercise.wrong') }}
      </p>
      <PrimaryButton data-test="next-item" data-primary-action class="ml-auto h-12 px-6" @click="next">
        {{ t('sessionExercise.next') }}
      </PrimaryButton>
    </PracticeActionBar>
  </div>
</template>
