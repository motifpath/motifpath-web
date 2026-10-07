<script setup lang="ts">
/**
 * One fretboard cell of a practice session, asked the way its drill says. Naming the note: the cell
 * is lit and the student taps one of the twelve notes, or presses its letter (with Shift for a
 * sharp). Finding the note: the note and its string are named and the student taps where it is on
 * that string. The tap is the answer, since latency counts from the prompt. The parent records and
 * grades it; feedback shows in place, a wrong answer revealing where the right one was.
 */
import { CircleCheck, CircleX } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useAdvanceAfterAnswer } from '@/features/student/composables/useAdvanceAfterAnswer'
import type { GradedCellAnswer } from '@/features/student/composables/usePracticeSessionRun'
import { pickReasonKeys } from '@/features/student/utils/pickReason'
import DrillFretboard from '@/shared/components/diagram/DrillFretboard.vue'
import type { CellMark } from '@/shared/components/diagram/DrillFretboard.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { cellNoteName } from '@/shared/utils/fretboardCell'
import type { CellAnswer, CellPlace } from '@/shared/utils/fretboardCell'
import { CHROMATIC_SCALE } from '@/shared/utils/musicTheory'

type Item = components['schemas']['PracticeSessionItem']
type Cell = NonNullable<Item['fretboard_cell']>

/** Generated cells run from the open string to fret 11, so the board shows up to fret 12. */
const LAST_FRET = 12

const props = defineProps<{
  /** A fretboard cell item. */
  item: Item
  /** The open-string pitches of the cell's instrument, lowest first. */
  tuning: string[]
  /** The answer given, graded, once committed. */
  answer: GradedCellAnswer | null
  /** The instrument the cell is on, named only in a session mixing instruments. */
  instrumentName?: string
}>()

const emit = defineEmits<{ answer: [answer: CellAnswer]; next: [] }>()

const { t } = useTypedT()

const cell = computed<Cell>(() => props.item.fretboard_cell!)
const naming = computed(() => cell.value.drill === 'name_the_note')

/** The cell's note, spelled with sharps. */
const rightNote = computed(() => cellNoteName(props.tuning, cell.value) ?? '')

/** A note name as the student reads it: a real sharp sign. */
const shown = (noteName: string) => noteName.replace('#', '♯')

const prompt = computed(() =>
  naming.value ? t('sessionFretboardCell.nameTheNote') : t('sessionFretboardCell.findTheNote', { note: shown(rightNote.value), string: cell.value.string }),
)

/** How a graded answer marks a note choice: the one picked, and the right one beside a wrong pick. */
function noteMark(noteName: string): 'right' | 'wrong' | undefined {
  const given = props.answer
  if (!given || given.answer.response_type !== 'name_the_note') return undefined
  if (noteName === rightNote.value) return given.correct || given.answer.note_name !== noteName ? 'right' : undefined
  return given.answer.note_name === noteName ? 'wrong' : undefined
}

/** A graded tap's marks: the tap, and where the note is beside a wrong one. */
const boardMarks = computed<CellMark[]>(() => {
  const given = props.answer
  if (!given || given.answer.response_type !== 'find_the_note') return []
  const tapped: CellPlace = { string: given.answer.string, fret: given.answer.fret }
  if (given.correct) return [{ ...tapped, mark: 'right' }]
  return [
    { ...tapped, mark: 'wrong' },
    { string: cell.value.string, fret: cell.value.fret, mark: 'right' },
  ]
})

function nameNote(noteName: string) {
  if (!props.answer) emit('answer', { response_type: 'name_the_note', note_name: noteName })
}

function findNote(place: CellPlace) {
  if (!props.answer) emit('answer', { response_type: 'find_the_note', string: place.string, fret: place.fret })
}

const { next } = useAdvanceAfterAnswer(
  () => props.answer,
  () => emit('next'),
)

function onKeydown(event: KeyboardEvent) {
  if (props.answer || !naming.value || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
  if (!/^[a-g]$/i.test(event.key)) return
  const letter = event.key.toUpperCase()
  nameNote(event.shiftKey ? `${letter}#` : letter)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="flex flex-col gap-4" data-test="session-fretboard-cell">
    <span data-test="item-reason" class="self-start rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium">
      {{ t(pickReasonKeys[item.reason]) }}
    </span>

    <p v-if="instrumentName" data-test="item-instrument" class="text-sm font-medium text-ink-muted">{{ instrumentName }}</p>
    <p data-test="cell-prompt" class="text-lg font-semibold">{{ prompt }}</p>

    <DrillFretboard
      :tuning="tuning"
      :max-fret="LAST_FRET"
      :label="t('sessionFretboardCell.board')"
      :lit="naming ? cell : null"
      :asked-string="naming ? null : cell.string"
      :tap-strings="naming ? [] : [cell.string]"
      :locked="answer !== null"
      :marks="boardMarks"
      @tap="findNote"
    />

    <div v-if="naming" class="grid grid-cols-6 gap-2" role="group" :aria-label="t('sessionFretboardCell.notes')">
      <button
        v-for="noteName in CHROMATIC_SCALE"
        :key="noteName"
        type="button"
        data-test="note-choice"
        :data-mark="noteMark(noteName)"
        :disabled="answer !== null"
        class="relative flex h-12 items-center justify-center rounded-md border text-base font-semibold"
        :class="{
          'border-success bg-success-muted': noteMark(noteName) === 'right',
          'border-danger bg-danger-muted': noteMark(noteName) === 'wrong',
          'border-border hover:border-accent': !noteMark(noteName),
        }"
        @click="nameNote(noteName)"
      >
        {{ shown(noteName) }}
        <CircleCheck v-if="noteMark(noteName) === 'right'" :size="14" class="absolute right-1 top-1 text-success" aria-hidden="true" />
        <CircleX v-else-if="noteMark(noteName) === 'wrong'" :size="14" class="absolute right-1 top-1 text-danger" aria-hidden="true" />
        <span v-if="noteMark(noteName)" class="sr-only">
          {{ noteMark(noteName) === 'right' ? t('sessionFretboardCell.markedRight') : t('sessionFretboardCell.markedWrong') }}
        </span>
      </button>
    </div>

    <PracticeActionBar>
      <template v-if="answer">
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
      </template>
    </PracticeActionBar>
  </div>
</template>
