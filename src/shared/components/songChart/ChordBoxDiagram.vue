<script setup lang="ts">
/**
 * A chord voicing as a chord box: the strings upright, low string on the left, the frets across
 * from the nut down. Each fretted note is a dot with the finger that plays it, a root note in the
 * darker colour. Open strings are marked "o" and muted strings "x" above the box. A voicing up
 * the neck starts at its first fret, labelled beside the box (e.g. "3fr"), with no nut drawn.
 */
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'

type ChordVoicing = components['schemas']['ChordVoicing']
type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']

const props = defineProps<{
  voicing: ChordVoicing
  diagram: Diagram
  instrument: Instrument
  /** What the box shows, for screen readers, e.g. "G7". */
  label: string
}>()

const STRING_GAP = 20
const FRET_GAP = 24
const MIN_ROWS = 4
const LEFT = 26
const TOP = 26
const DOT_RADIUS = 8

const strings = computed(() => props.instrument.string_count ?? 6)
const isOpenPosition = computed(() => props.voicing.fret_window.lowest_fret === 0)
const firstFret = computed(() => (isOpenPosition.value ? 1 : props.voicing.fret_window.lowest_fret))
const rows = computed(() => Math.max(MIN_ROWS, props.voicing.fret_window.highest_fret - firstFret.value + 1))
const width = computed(() => LEFT + (strings.value - 1) * STRING_GAP + 14)
const height = computed(() => TOP + rows.value * FRET_GAP + 8)

/** Strings are numbered 1 (highest) to N (lowest); the lowest is drawn on the left. */
function xOf(string: number): number {
  return LEFT + (strings.value - string) * STRING_GAP
}

const fingerOf = computed(() => new Map(props.voicing.fingering.map((f) => [f.position_id, f.finger])))

/** The diagram's notes on a string and fret; a chord voicing has only these. */
const notes = computed(() =>
  props.diagram.positions.flatMap((p) =>
    p.position_id && p.string !== undefined && p.fret !== undefined ? [{ position_id: p.position_id, string: p.string, fret: p.fret, interval: p.interval }] : [],
  ),
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
    })),
)

const openStrings = computed(() =>
  [...new Set(notes.value.filter((p) => p.fret === 0).map((p) => p.string))].sort((a, b) => b - a),
)
const mutedStrings = computed(() => [...props.voicing.muted_strings].sort((a, b) => b - a))
</script>

<template>
  <svg
    :viewBox="`0 0 ${width} ${height}`"
    :width="width"
    :height="height"
    role="img"
    :aria-label="label"
    class="text-ink"
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

    <text
      v-for="string in openStrings"
      :key="`open-${string}`"
      data-test="string-open"
      :data-string="string"
      :x="xOf(string)"
      :y="TOP - 9"
      text-anchor="middle"
      class="fill-ink-muted text-[12px]"
    >o</text>
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
      :data-x="dot.x"
    >
      <circle :cx="dot.x" :cy="dot.y" :r="DOT_RADIUS" :class="dot.root ? 'fill-ink' : 'fill-accent'" />
      <text :x="dot.x" :y="dot.y + 4" text-anchor="middle" class="fill-accent-fg text-[11px] font-bold">{{ dot.finger }}</text>
    </g>
  </svg>
</template>
