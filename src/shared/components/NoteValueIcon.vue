<script setup lang="ts">
/**
 * A note or rest of one written length, drawn as in standard notation: the
 * whole note or rest (base 1) through the thirty-second (base 32), with the
 * dot of a dotted value or the number of a tuplet. Drawn in the current text
 * color, like the app's other icons, and named by `label` for screen readers.
 */
import { computed } from 'vue'

import type { BaseNoteValue } from '@/shared/utils/sequence'

const props = withDefaults(
  defineProps<{
    kind: 'note' | 'rest'
    base: BaseNoteValue
    dotted?: boolean
    tuplet?: number | null
    label: string
  }>(),
  { dotted: false, tuplet: null },
)

const FLAG_COUNT: Record<BaseNoteValue, number> = { 1: 0, 2: 0, 4: 0, 8: 1, 16: 2, 32: 3 }

const hollow = computed(() => props.base <= 2)
const flags = computed(() => Array.from({ length: FLAG_COUNT[props.base] }, (_, i) => i))
// The dot sits beside a note's head (a whole note's is higher up, having no stem), and halfway up a rest.
const dotY = computed(() => {
  if (props.kind === 'rest') return 15
  return props.base === 1 ? 18 : 26
})
</script>

<template>
  <svg viewBox="0 0 24 32" role="img" :aria-label="label" class="h-6 w-[18px]" fill="none">
    <title>{{ label }}</title>
    <template v-if="kind === 'note'">
      <ellipse
        v-if="base === 1"
        data-test="note-head"
        cx="11"
        cy="18"
        rx="6"
        ry="4"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
      />
      <ellipse
        v-else
        data-test="note-head"
        cx="10"
        cy="25"
        rx="5.2"
        ry="3.8"
        transform="rotate(-20 10 25)"
        :fill="hollow ? 'none' : 'currentColor'"
        stroke="currentColor"
        :stroke-width="hollow ? 1.8 : 0"
      />
      <line v-if="base !== 1" data-test="note-stem" x1="14.9" y1="24" x2="14.9" y2="4" stroke="currentColor" stroke-width="1.6" />
      <path
        v-for="flag in flags"
        :key="flag"
        data-test="note-flag"
        :d="`M14.9 ${4 + flag * 4.5} c0 3.5 5.5 4.5 5 10`"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
      />
    </template>
    <template v-else>
      <g v-if="base === 1" data-test="rest-1" fill="currentColor">
        <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="1.2" />
        <rect x="8" y="12" width="8" height="4" />
      </g>
      <g v-else-if="base === 2" data-test="rest-2" fill="currentColor">
        <line x1="5" y1="18" x2="19" y2="18" stroke="currentColor" stroke-width="1.2" />
        <rect x="8" y="14" width="8" height="4" />
      </g>
      <path
        v-else-if="base === 4"
        data-test="rest-4"
        d="M9 5 L14.5 11 L10.5 16 L15.5 22 C12 20.5 9 22 11.5 27"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
      <g v-else-if="base === 8" data-test="rest-8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
        <circle cx="9.5" cy="12" r="2.2" fill="currentColor" stroke="none" />
        <path d="M10 13.5 C12.5 14.5 14.5 13.5 16 11 L11 27" />
      </g>
      <g v-else-if="base === 16" data-test="rest-16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
        <circle cx="10.5" cy="9" r="2.1" fill="currentColor" stroke="none" />
        <circle cx="8.5" cy="15" r="2.1" fill="currentColor" stroke="none" />
        <path d="M11 10.5 C13.5 11.5 15.5 10.5 17 8 L11 28" />
        <path d="M9 16.5 C11.5 17.5 13.5 16.5 15.2 14" />
      </g>
      <g v-else data-test="rest-32" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <circle cx="11" cy="6" r="1.9" fill="currentColor" stroke="none" />
        <circle cx="9.5" cy="12" r="1.9" fill="currentColor" stroke="none" />
        <circle cx="8" cy="18" r="1.9" fill="currentColor" stroke="none" />
        <path d="M11.5 7.3 C13.8 8.2 15.8 7.2 17.5 4 L10.5 29" />
        <path d="M10 13.3 C12.3 14.2 14.3 13.2 15.8 10" />
        <path d="M8.5 19.3 C10.8 20.2 12.8 19.2 14.1 16" />
      </g>
    </template>
    <circle v-if="dotted" data-test="value-dot" cx="21" :cy="dotY" r="1.7" fill="currentColor" />
    <text
      v-if="tuplet"
      data-test="tuplet-number"
      x="1"
      y="9"
      font-size="9"
      font-weight="700"
      font-style="italic"
      fill="currentColor"
    >{{ tuplet }}</text>
  </svg>
</template>
