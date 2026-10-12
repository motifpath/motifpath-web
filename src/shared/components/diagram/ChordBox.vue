<script setup lang="ts">
/**
 * A chord voicing as a chord box: the strings upright, low string on the left, the frets across
 * from the nut down. Each fretted note is a dot with the finger that plays it, a root note in the
 * darker colour. Open strings are marked "o" and muted strings "x" above the box. A voicing with
 * an open string starts at the nut, so the frets its open strings ring from are never hidden; one
 * without starts at its first fret, labelled beside the box (e.g. "3fr"), with no nut drawn. The box
 * shows at least four frets, and every fret the voicing reaches.
 * `scale` draws it bigger, for practice, where every dot must be big enough to see at arm's length;
 * while the voicing plays, the notes sounding are ringed as on the fretboard. `fit` scales it to its
 * container instead, for a thumbnail.
 *
 * Where its notes are answers the box takes taps, every place at least 48 px each way. Hidden notes
 * are left out, or drawn faded for an author (`revealHidden`), who taps notes (`selectablePositionIds`)
 * to mark them correct or hide them. A student taps cells (`answerCells`), the open strings above the
 * nut included: a pick is a dashed ring, and a graded answer shows right and wrong picks, and a right
 * cell not picked as a dashed success ring. Cells are named by where they sit, never by what they are.
 */
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { AnswerMarkKind } from '@/shared/components/diagram/AnswerMark.vue'
import type { AnswerCell } from '@/shared/components/diagram/FrettedDiagramView.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

type ChordVoicing = components['schemas']['ChordVoicing']
type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']

const props = withDefaults(
  defineProps<{
    voicing: ChordVoicing
    diagram: Diagram
    instrument: Instrument
    /** What the box shows, for screen readers, e.g. "G7". */
    label: string
    /** How many times its own size the box is drawn. */
    scale?: number
    /** The positions sounding right now, while the voicing plays. */
    activePositionIds?: string[]
    /** Scale to fit the container, for a thumbnail, instead of drawing at `scale`. */
    fit?: boolean
    /** Notes a student isn't shown; drawn faded with `revealHidden`, for an author. */
    hiddenPositionIds?: string[]
    revealHidden?: boolean
    /** Notes an author marked as answers. */
    correctPositionIds?: string[]
    /** Notes an author can tap. */
    selectablePositionIds?: string[]
    /** Cells a student can tap, each an answer option; picked ones, and a graded answer's marks. */
    answerCells?: AnswerCell[]
    selectedAnswerIds?: string[]
    answerMarks?: Record<string, AnswerMarkKind>
    multiple?: boolean
  }>(),
  {
    scale: 1,
    activePositionIds: () => [],
    fit: false,
    hiddenPositionIds: () => [],
    revealHidden: false,
    correctPositionIds: () => [],
    selectablePositionIds: () => [],
    answerCells: () => [],
    selectedAnswerIds: () => [],
    answerMarks: () => ({}),
    multiple: false,
  },
)
const emit = defineEmits<{ select: [positionId: string]; selectAnswer: [optionId: string] }>()

const { t } = useTypedT()

const STRING_GAP = 20
const FRET_GAP = 24
const MIN_ROWS = 4
const LEFT = 26
const TOP = 26
const DOT_RADIUS = 8
/** The smallest place a finger can hit, in CSS px. */
const MIN_PLACE = 48
/** The tap zone of an open string, above the nut. */
const OPEN_ZONE = 20

const strings = computed(() => props.instrument.string_count ?? 6)
// The voicing's fret window leaves open strings out, so it alone can't tell an open chord fingered
// at the 2nd fret from a barre there.
const isOpenPosition = computed(() => props.voicing.fret_window.lowest_fret === 0 || notes.value.some((p) => p.fret === 0))
const firstFret = computed(() => (isOpenPosition.value ? 1 : props.voicing.fret_window.lowest_fret))
const highestCellFret = computed(() => Math.max(0, ...props.answerCells.map((cell) => cell.fret)))
const rows = computed(() =>
  Math.max(MIN_ROWS, props.voicing.fret_window.highest_fret - firstFret.value + 1, highestCellFret.value - firstFret.value + 1),
)
const takesTaps = computed(() => props.selectablePositionIds.length > 0 || props.answerCells.length > 0)
/** Drawn big enough that every place is at least MIN_PLACE each way once it takes taps. */
const drawnScale = computed(() => (takesTaps.value ? Math.max(props.scale, MIN_PLACE / Math.min(STRING_GAP, FRET_GAP, OPEN_ZONE)) : props.scale))
const svgRole = computed(() => {
  if (!takesTaps.value) return 'img'
  return props.answerCells.length > 0 && !props.multiple ? 'radiogroup' : 'group'
})
const width = computed(() => LEFT + (strings.value - 1) * STRING_GAP + 14)
const height = computed(() => TOP + rows.value * FRET_GAP + 8)

/** Strings are numbered 1 (highest) to N (lowest); the lowest is drawn on the left. */
function xOf(string: number): number {
  return LEFT + (strings.value - string) * STRING_GAP
}

function rowY(fret: number): number {
  return fret > 0 ? TOP + (fret - firstFret.value + 0.5) * FRET_GAP : TOP - 13
}

const fingerOf = computed(() => new Map(props.voicing.fingering.map((f) => [f.position_id, f.finger])))

type NoteState = 'default' | 'correct' | 'hidden' | 'hidden-correct'

/** The diagram's notes on a string and fret; a chord voicing has only these. */
const allNotes = computed(() =>
  props.diagram.positions.flatMap((p) =>
    p.position_id && p.string !== undefined && p.fret !== undefined ? [{ position_id: p.position_id, string: p.string, fret: p.fret, interval: p.interval }] : [],
  ),
)
/** The notes drawn: a hidden one only for an author. */
const notes = computed(() => allNotes.value.filter((p) => props.revealHidden || !props.hiddenPositionIds.includes(p.position_id)))

function stateOf(positionId: string): NoteState {
  const correct = props.correctPositionIds.includes(positionId)
  if (props.hiddenPositionIds.includes(positionId)) return correct ? 'hidden-correct' : 'hidden'
  return correct ? 'correct' : 'default'
}

function placeName(string: number, fret: number): string {
  return t('exerciseView.diagramChoice', { string, fret })
}

/** Pointer and keyboard wiring for a note an author can tap, named by where it sits and the finger
 *  drawn on it; none for any other. */
function noteAttrs(note: { id: string; string: number; fret: number; finger?: string }): Record<string, string | number> {
  if (!props.selectablePositionIds.includes(note.id)) return {}
  const name = note.finger ? t('chordView.fingeredNote', { string: note.string, fret: note.fret, finger: note.finger }) : placeName(note.string, note.fret)
  return { tabindex: 0, role: 'button', 'aria-label': name, class: 'group cursor-pointer outline-none' }
}

function onNoteTap(positionId: string) {
  if (props.selectablePositionIds.includes(positionId)) emit('select', positionId)
}

function onKey(event: KeyboardEvent, tap: () => void) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  tap()
}

type CellState = 'empty' | 'asked' | 'right' | 'wrong' | 'missed'

const cellTargets = computed(() =>
  props.answerCells.map((cell) => {
    const selected = props.selectedAnswerIds.includes(cell.optionId)
    const mark = props.answerMarks[cell.optionId]
    const state: CellState = mark === 'right' ? (selected ? 'right' : 'missed') : mark === 'wrong' ? 'wrong' : selected ? 'asked' : 'empty'
    const height = cell.fret > 0 ? FRET_GAP : OPEN_ZONE
    const label = placeName(cell.string, cell.fret)
    return {
      ...cell,
      selected,
      state,
      x: xOf(cell.string),
      y: rowY(cell.fret),
      target: { x: xOf(cell.string) - STRING_GAP / 2, y: cell.fret > 0 ? TOP + (cell.fret - firstFret.value) * FRET_GAP : TOP - OPEN_ZONE - 2, width: STRING_GAP, height },
      label: mark ? t(mark === 'right' ? 'exerciseView.choiceMarkedRight' : 'exerciseView.choiceMarkedWrong', { choice: label }) : label,
    }
  }),
)

const dots = computed(() =>
  notes.value
    .filter((p) => p.fret > 0)
    .sort((a, b) => b.string - a.string)
    .map((p) => ({
      id: p.position_id,
      string: p.string,
      fret: p.fret,
      x: xOf(p.string),
      y: TOP + (p.fret - firstFret.value + 0.5) * FRET_GAP,
      finger: fingerOf.value.get(p.position_id) ?? '',
      root: p.interval === 'R',
      state: stateOf(p.position_id),
    })),
)

/** Where a sounding note is ringed: on its dot, or on the "o" of an open string. */
const soundingRings = computed(() =>
  notes.value
    .filter((p) => props.activePositionIds.includes(p.position_id))
    .sort((a, b) => b.string - a.string)
    .map((p) => ({
      id: p.position_id,
      string: p.string,
      x: xOf(p.string),
      y: rowY(p.fret),
    })),
)

/** Each open string once, by the note that rings it. */
const openStrings = computed(() => {
  const byString = new Map<number, string>()
  for (const p of notes.value) if (p.fret === 0 && !byString.has(p.string)) byString.set(p.string, p.position_id)
  return [...byString]
    .sort(([a], [b]) => b - a)
    .map(([string, id]) => ({ string, id, state: stateOf(id) }))
})
const mutedStrings = computed(() => [...props.voicing.muted_strings].sort((a, b) => b - a))
</script>

<template>
  <svg
    :viewBox="`0 0 ${width} ${height}`"
    :width="fit ? undefined : width * drawnScale"
    :height="fit ? undefined : height * drawnScale"
    :role="svgRole"
    :aria-label="label"
    class="text-ink"
    :class="{ 'h-auto w-full': fit }"
  >
    <text
      v-if="!isOpenPosition"
      data-test="fret-label"
      :x="LEFT - 10"
      :y="TOP + FRET_GAP / 2 + 4"
      text-anchor="end"
      class="fill-ink-muted text-[11px] font-semibold"
    >{{ firstFret }}fr</text>

    <line
      v-if="isOpenPosition"
      data-test="nut"
      :x1="LEFT"
      :x2="xOf(1)"
      :y1="TOP"
      :y2="TOP"
      class="stroke-ink"
      stroke-width="4"
    />
    <line
      v-for="row in rows + 1"
      :key="`fret-${row}`"
      :data-test="row <= rows ? 'fret-row' : undefined"
      :x1="LEFT"
      :x2="xOf(1)"
      :y1="TOP + (row - 1) * FRET_GAP"
      :y2="TOP + (row - 1) * FRET_GAP"
      class="stroke-ink-subtle"
      stroke-width="1"
    />
    <line
      v-for="string in strings"
      :key="`string-${string}`"
      :x1="xOf(string)"
      :x2="xOf(string)"
      :y1="TOP"
      :y2="TOP + rows * FRET_GAP"
      class="stroke-ink-subtle"
      stroke-width="1"
    />

    <g
      v-for="open in openStrings"
      :key="`open-${open.string}`"
      data-test="string-open"
      :data-string="open.string"
      :data-state="open.state"
      v-bind="noteAttrs({ id: open.id, string: open.string, fret: 0 })"
      @click="onNoteTap(open.id)"
      @keydown="onKey($event, () => onNoteTap(open.id))"
    >
      <circle
        v-if="selectablePositionIds.includes(open.id)"
        data-test="focus-ring"
        :cx="xOf(open.string)"
        :cy="TOP - 13"
        :r="DOT_RADIUS + 3"
        fill="none"
        class="stroke-focus opacity-0 group-focus:opacity-100"
        stroke-width="2"
      />
      <circle
        v-if="open.state !== 'default'"
        :cx="xOf(open.string)"
        :cy="TOP - 13"
        :r="DOT_RADIUS - 1"
        fill="none"
        :class="open.state === 'hidden' ? 'stroke-ink-subtle' : 'stroke-success'"
        :stroke-width="open.state === 'correct' ? 2.5 : 1.5"
        :stroke-dasharray="open.state === 'correct' ? undefined : '3 2'"
      />
      <text
        :x="xOf(open.string)"
        :y="TOP - 9"
        text-anchor="middle"
        class="text-[12px]"
        :class="open.state === 'hidden' ? 'fill-ink-subtle' : open.state === 'default' ? 'fill-ink-muted' : 'fill-success'"
      >o</text>
    </g>
    <text
      v-for="string in mutedStrings"
      :key="`muted-${string}`"
      data-test="string-muted"
      :data-string="string"
      :x="xOf(string)"
      :y="TOP - 9"
      text-anchor="middle"
      class="fill-ink-muted text-[12px]"
    >x</text>

    <g
      v-for="dot in dots"
      :key="dot.id"
      data-test="finger-dot"
      :data-string="dot.string"
      :data-fret="dot.fret"
      :data-row="dot.fret - firstFret + 1"
      :data-x="dot.x"
      :data-state="dot.state"
      v-bind="noteAttrs(dot)"
      @click="onNoteTap(dot.id)"
      @keydown="onKey($event, () => onNoteTap(dot.id))"
    >
      <circle
        v-if="selectablePositionIds.includes(dot.id)"
        data-test="focus-ring"
        :cx="dot.x"
        :cy="dot.y"
        :r="DOT_RADIUS + 5"
        fill="none"
        class="stroke-focus opacity-0 group-focus:opacity-100"
        stroke-width="2"
      />
      <template v-if="dot.state === 'hidden' || dot.state === 'hidden-correct'">
        <circle
          :cx="dot.x"
          :cy="dot.y"
          :r="DOT_RADIUS"
          class="fill-surface"
          :class="dot.state === 'hidden' ? 'stroke-ink-subtle' : 'stroke-success'"
          stroke-width="1.5"
          stroke-dasharray="3 2"
        />
        <text
          :x="dot.x"
          :y="dot.y + 4"
          text-anchor="middle"
          class="text-[11px] font-bold"
          :class="dot.state === 'hidden' ? 'fill-ink-subtle' : 'fill-success'"
        >{{ dot.finger }}</text>
      </template>
      <template v-else>
        <circle v-if="dot.state === 'correct'" :cx="dot.x" :cy="dot.y" :r="DOT_RADIUS + 2" fill="none" class="stroke-success" stroke-width="2.5" />
        <circle :cx="dot.x" :cy="dot.y" :r="DOT_RADIUS" :class="dot.root ? 'fill-ink' : 'fill-accent'" />
        <text :x="dot.x" :y="dot.y + 4" text-anchor="middle" class="text-[11px] font-bold" :class="dot.root ? 'fill-surface' : 'fill-accent-fg'">
          {{ dot.finger }}
        </text>
      </template>
    </g>

    <g
      v-for="cell in cellTargets"
      :key="cell.optionId"
      data-test="chord-cell"
      :data-option-id="cell.optionId"
      :data-state="cell.state"
      tabindex="0"
      :role="multiple ? 'checkbox' : 'radio'"
      :aria-checked="cell.selected"
      :aria-label="cell.label"
      class="group cursor-pointer outline-none"
      @click="emit('selectAnswer', cell.optionId)"
      @keydown="onKey($event, () => emit('selectAnswer', cell.optionId))"
    >
      <rect data-test="chord-cell-target" v-bind="cell.target" fill="transparent" />
      <circle
        v-if="cell.state === 'empty'"
        :cx="cell.x"
        :cy="cell.y"
        :r="DOT_RADIUS"
        fill="none"
        class="stroke-focus opacity-0 group-hover:opacity-60 group-focus:opacity-100"
        stroke-width="1.5"
        stroke-dasharray="3 2"
      />
      <circle
        v-else-if="cell.state === 'asked' || cell.state === 'missed'"
        :cx="cell.x"
        :cy="cell.y"
        :r="DOT_RADIUS"
        class="fill-surface"
        :class="cell.state === 'asked' ? 'stroke-accent' : 'stroke-success'"
        stroke-width="2"
        stroke-dasharray="3 2"
      />
      <circle v-else :cx="cell.x" :cy="cell.y" :r="DOT_RADIUS" :class="cell.state === 'right' ? 'fill-success' : 'fill-danger'" />
    </g>

    <circle
      v-for="ring in soundingRings"
      :key="`sounding-${ring.id}`"
      data-test="chord-sounding"
      :data-string="ring.string"
      :cx="ring.x"
      :cy="ring.y"
      :r="DOT_RADIUS + 3"
      fill="none"
      class="stroke-fretboard-sounding"
      stroke-width="2"
      stroke-dasharray="3 2"
    />
  </svg>
</template>
