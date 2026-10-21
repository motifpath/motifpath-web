<script setup lang="ts">
/**
 * One fretboard cell of a practice session, asked the way its drill says. Naming the note: the cell
 * is lit and the student taps one of four near notes, or presses its number; the answer keeps the
 * four in the order shown. Finding the note: the note, its string and its fret window are named and the student taps
 * where it is on that string, within the window. The tap is the answer, since latency counts from the prompt.
 * Finding every instance: the cell's note and its window are named, nothing is marked and how many
 * places it has is never said; taps toggle places on any string, and Check answers with those tapped.
 * The parent records and grades it; feedback shows in place, a wrong answer revealing where the right one was.
 */
import { CircleCheck, CircleX } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useAdvanceAfterAnswer } from '@/features/student/composables/useAdvanceAfterAnswer'
import type { GradedCellAnswer } from '@/features/student/composables/usePracticeSessionRun'
import ItemHeader from '@/features/student/components/ItemHeader.vue'
import OptionTile from '@/shared/components/OptionTile.vue'
import DrillFretboard from '@/shared/components/diagram/DrillFretboard.vue'
import type { CellMark } from '@/shared/components/diagram/DrillFretboard.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PracticeBreakout from '@/shared/components/PracticeBreakout.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { cellNoteName } from '@/shared/utils/fretboardCell'
import type { CellAnswer, CellPlace } from '@/shared/utils/fretboardCell'
import { fretWindowRange } from '@/shared/utils/fretWindow'
import { nameTheNoteChoices } from '@/shared/utils/noteChoices'
import { optionState } from '@/shared/utils/optionState'

type Item = components['schemas']['PracticeSessionItem']
type Cell = NonNullable<Item['fretboard_cell']>

/** Generated cells run from the open string to fret 11, so the whole neck shows up to fret 12. */
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
const everyInstance = computed(() => cell.value.drill === 'find_every_instance')
const allStrings = computed(() => props.tuning.map((_, i) => i + 1))
const fretWindow = computed(() => fretWindowRange(cell.value.fret_window.from_fret))

/** The cell's note, spelled with sharps. */
const rightNote = computed(() => cellNoteName(props.tuning, cell.value) ?? '')

/** The four notes offered, drawn once per cell so they never reshuffle under the student. */
const choices = ref<string[]>([])
watch(
  () => [props.item.item_key, props.tuning] as const,
  () => {
    choices.value = naming.value ? (nameTheNoteChoices(props.tuning, cell.value) ?? []) : []
  },
  { immediate: true },
)

/** A note name as the student reads it: a real sharp sign. */
const shown = (noteName: string) => noteName.replace('#', '♯')

const prompt = computed(() => {
  if (naming.value) return t('sessionFretboardCell.nameTheNote')
  const where = { note: shown(rightNote.value), from: fretWindow.value.from, to: fretWindow.value.to }
  if (everyInstance.value) return t('sessionFretboardCell.findEveryInstance', where)
  return t('sessionFretboardCell.findTheNote', { ...where, string: cell.value.string })
})

/** The places toggled on while finding every instance, in the order tapped; cleared for each cell. */
const taps = ref<CellPlace[]>([])
watch(
  () => props.item.item_key,
  () => {
    taps.value = []
  },
)

/** The places ringed as tapped: those toggled on, then those the graded answer sent. */
const selectedPlaces = computed<CellPlace[]>(() => {
  const given = props.answer?.answer
  return given?.response_type === 'multi_tap' ? given.cells : taps.value
})

function togglePlace(place: CellPlace) {
  if (props.answer) return
  const at = taps.value.findIndex((t) => t.string === place.string && t.fret === place.fret)
  taps.value = at === -1 ? [...taps.value, place] : taps.value.filter((_, i) => i !== at)
}

function checkEveryInstance() {
  if (!props.answer) emit('answer', { response_type: 'multi_tap', fret_window: { from_fret: cell.value.fret_window.from_fret }, cells: taps.value })
}

/** A wrong answer to finding every instance says how many places were found, and any extra taps. */
const feedback = computed(() => {
  const given = props.answer
  if (!given) return ''
  if (given.correct) return t('sessionExercise.right')
  const grade = given.grade
  if (!grade) return t('sessionExercise.wrong')
  const counts = { found: grade.found, places: grade.places, extra: grade.extra }
  return grade.extra > 0 ? t('sessionFretboardCell.foundWithExtra', counts) : t('sessionFretboardCell.found', counts)
})

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
  if (given?.grade) {
    // Every place of the note shows as right, found or missed; a tap on any other cell as wrong.
    const tapped = selectedPlaces.value
    return given.grade.cells.map((c) => {
      const extra = !c.correct && tapped.some((t) => t.string === c.string && t.fret === c.fret)
      return { string: c.string, fret: c.fret, mark: extra ? 'wrong' : 'right' }
    })
  }
  if (!given || given.answer.response_type !== 'find_the_note') return []
  const tapped: CellPlace = { string: given.answer.string, fret: given.answer.fret }
  if (given.correct) return [{ ...tapped, mark: 'right' }]
  return [
    { ...tapped, mark: 'wrong' },
    { string: cell.value.string, fret: cell.value.fret, mark: 'right' },
  ]
})

function nameNote(noteName: string) {
  if (!props.answer) emit('answer', { response_type: 'name_the_note', note_name: noteName, choices: choices.value })
}

function findNote(place: CellPlace) {
  if (!props.answer) emit('answer', { response_type: 'find_the_note', string: place.string, fret: place.fret })
}

function onTap(place: CellPlace) {
  if (everyInstance.value) togglePlace(place)
  else findNote(place)
}

const { next } = useAdvanceAfterAnswer(
  () => props.answer,
  () => emit('next'),
)

function onKeydown(event: KeyboardEvent) {
  if (props.answer || !naming.value || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
  const noteName = /^[1-9]$/.test(event.key) ? choices.value[Number(event.key) - 1] : undefined
  if (noteName) nameNote(noteName)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="flex flex-col gap-4" data-test="session-fretboard-cell">
    <p v-if="instrumentName" data-test="item-instrument" class="-mb-2 text-sm font-medium text-ink-muted">{{ instrumentName }}</p>
    <ItemHeader :title="prompt" :reason="item.reason" />

    <PracticeBreakout>
      <DrillFretboard
        :tuning="tuning"
        :max-fret="LAST_FRET"
        :fret-window="fretWindow"
        :label="t('sessionFretboardCell.board')"
        :lit="naming ? cell : null"
        :asked-string="naming || everyInstance ? null : cell.string"
        :tap-strings="naming ? [] : everyInstance ? allStrings : [cell.string]"
        :locked="answer !== null"
        :marks="boardMarks"
        :selectable="everyInstance"
        :selected="everyInstance ? selectedPlaces : []"
        @tap="onTap"
      />
    </PracticeBreakout>

    <div v-if="naming" class="grid grid-cols-2 gap-2" role="group" :aria-label="t('sessionFretboardCell.notes')">
      <OptionTile
        v-for="(noteName, i) in choices"
        :key="noteName"
        data-test="note-choice"
        :data-mark="noteMark(noteName)"
        :key-hint="i + 1"
        :label="shown(noteName)"
        :state="optionState({ selected: false, mark: noteMark(noteName), settled: answer !== null })"
        @click="nameNote(noteName)"
      />
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
          {{ feedback }}
        </p>
        <PrimaryButton data-test="next-item" data-primary-action class="ml-auto h-12 px-6" @click="next">
          {{ t('sessionExercise.next') }}
        </PrimaryButton>
      </template>
      <PrimaryButton v-else-if="everyInstance" data-test="check-answer" data-primary-action class="h-12 w-full px-6" @click="checkEveryInstance">
        {{ t('sessionExercise.check') }}
      </PrimaryButton>
    </PracticeActionBar>
  </div>
</template>
