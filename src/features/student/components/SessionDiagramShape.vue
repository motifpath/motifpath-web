<script setup lang="ts">
/**
 * One diagram shape of a practice session, asked the way its drill says, on the shape's own
 * diagram with its labels off. Naming the shape: its name never shows, and the student picks
 * which member of its family it is. Finding a degree: its roots are labelled, its other positions
 * aren't, and the student taps where the degree asked is, anywhere on the board around the shape.
 * The parent records and grades the answer, given the board the diagram draws; feedback shows in
 * place, a wrong answer revealing the right one. Number keys name a member, so a keyboard can answer
 * too. A shape whose diagram can't be shown here is skipped, never counted against the student.
 */
import { CircleCheck, CircleX } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useAdvanceAfterAnswer } from '@/features/student/composables/useAdvanceAfterAnswer'
import type { GradedShapeAnswer, NotAnsweredReason, ShapeBoard } from '@/features/student/composables/usePracticeSessionRun'
import { pickReasonKeys } from '@/features/student/utils/pickReason'
import type { AnswerMarkKind } from '@/shared/components/diagram/AnswerMark.vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import type { AnswerCell } from '@/shared/components/diagram/FrettedDiagramView.vue'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import OptionTile from '@/shared/components/OptionTile.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import { useEmbeddedDiagram } from '@/shared/composables/useEmbeddedDiagram'
import { useIntervalLabel } from '@/shared/composables/useIntervalLabel'
import { useTypedT } from '@/shared/composables/useTypedT'
import { cellsOfDegree } from '@/shared/utils/diagramShape'
import type { ShapeAnswer } from '@/shared/utils/diagramShape'
import type { DiagramEmbed } from '@/shared/utils/diagramEmbed'
import { optionState } from '@/shared/utils/optionState'

type Item = components['schemas']['PracticeSessionItem']
type Shape = NonNullable<Item['diagram_shape']>
type Diagram = components['schemas']['Diagram']

const props = defineProps<{
  /** A diagram shape item. */
  item: Item
  /** The answer given, graded, once committed. */
  answer: GradedShapeAnswer | null
  /** The instrument the shape is drawn on, named only in a session mixing instruments. */
  instrumentName?: string
}>()

const emit = defineEmits<{ answer: [answer: ShapeAnswer, board: ShapeBoard]; next: []; skip: [reason: NotAnsweredReason] }>()

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

function onKeydown(event: KeyboardEvent) {
  if (props.answer || !naming.value || event.defaultPrevented || !/^[1-9]$/.test(event.key)) return
  const member = shape.value.options[Number(event.key) - 1]
  if (member) nameShape(member.shape)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="flex flex-col gap-4" data-test="session-diagram-shape">
    <span data-test="item-reason" class="self-start rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium">
      {{ t(pickReasonKeys[item.reason]) }}
    </span>

    <p v-if="instrumentName" data-test="item-instrument" class="text-sm font-medium text-ink-muted">{{ instrumentName }}</p>

    <div v-if="status === 'loading'" data-test="shape-loading">
      <LoadingSkeleton />
    </div>

    <div v-else-if="status === 'unavailable' || !shownDiagram || !instrument">
      <InlineNotice tone="unavailable" :message="t('sessionDiagramShape.unavailable')" />
      <PracticeActionBar>
        <PrimaryButton data-test="skip-shape" data-primary-action class="h-12 w-full" @click="emit('skip', 'unavailable')">
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

      <div v-if="naming" class="flex flex-col gap-2" role="group" :aria-label="t('sessionDiagramShape.shapes')">
        <OptionTile
          v-for="(option, i) in shape.options"
          :key="option.shape"
          data-test="shape-choice"
          :data-mark="choiceMark(option.shape)"
          :key-hint="i + 1"
          :label="option.name"
          :state="optionState({ selected: false, mark: choiceMark(option.shape), settled: answer !== null })"
          @click="nameShape(option.shape)"
        />
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
