<script setup lang="ts">
/**
 * How a graded answer marks a choice on a diagram: a ring round the marker and a badge off its
 * top-left, a check for a right choice and a cross for a wrong pick. Shape, not colour alone,
 * tells them apart; the choice's accessible name says it in words.
 */
export type AnswerMarkKind = 'right' | 'wrong'

defineProps<{ mark: AnswerMarkKind; cx: number; cy: number; ringRadius: number; badgeOffset: number }>()
</script>

<template>
  <g data-test="diagram-mark" :data-mark="mark">
    <circle :cx="cx" :cy="cy" :r="ringRadius" fill="none" :class="mark === 'right' ? 'stroke-success' : 'stroke-danger'" stroke-width="3" />
    <circle
      :cx="cx - badgeOffset"
      :cy="cy - badgeOffset"
      r="7.5"
      :class="mark === 'right' ? 'fill-success' : 'fill-danger'"
      class="stroke-surface"
      stroke-width="1.5"
    />
    <polyline
      v-if="mark === 'right'"
      :points="`${cx - badgeOffset - 3.5},${cy - badgeOffset} ${cx - badgeOffset - 1},${cy - badgeOffset + 2.5} ${cx - badgeOffset + 3.5},${cy - badgeOffset - 2.5}`"
      fill="none"
      class="stroke-success-fg"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      v-else
      :d="`M ${cx - badgeOffset - 3} ${cy - badgeOffset - 3} L ${cx - badgeOffset + 3} ${cy - badgeOffset + 3} M ${cx - badgeOffset + 3} ${cy - badgeOffset - 3} L ${cx - badgeOffset - 3} ${cy - badgeOffset + 3}`"
      class="stroke-danger-fg"
      stroke-width="2"
      stroke-linecap="round"
    />
  </g>
</template>
