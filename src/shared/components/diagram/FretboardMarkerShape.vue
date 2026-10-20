<script setup lang="ts">
/**
 * A position marker's authored shape — dot, square or star — centred on (cx, cy) and outlined so
 * an authored color close to the wood stays distinguishable. The student's viewer and the
 * teacher's editor both draw markers with it; the fill (a class or style) is the parent's.
 */
import type { components } from '@/api/generated/core-domain'
import { starPolygonPoints } from '@/shared/utils/diagramMarkerShapes'
import { MARKER_RADIUS } from '@/shared/utils/fretboardGeometry'

defineProps<{
  cx: number
  cy: number
  shape: components['schemas']['DiagramPosition']['shape']
}>()

// Inside the dot's outline, so a square looks as big as a dot.
const SQUARE_HALF = MARKER_RADIUS - 2
const STAR_OUTER = 21
const STAR_INNER = 10
</script>

<template>
  <circle v-if="shape === 'dot'" :cx="cx" :cy="cy" :r="MARKER_RADIUS" class="stroke-surface" stroke-width="2" />
  <rect
    v-else-if="shape === 'square'"
    :x="cx - SQUARE_HALF"
    :y="cy - SQUARE_HALF"
    :width="2 * SQUARE_HALF"
    :height="2 * SQUARE_HALF"
    rx="3"
    class="stroke-surface"
    stroke-width="2"
  />
  <polygon
    v-else
    :points="starPolygonPoints(cx, cy, STAR_OUTER, STAR_INNER)"
    class="stroke-surface"
    stroke-width="2"
    stroke-linejoin="round"
  />
</template>
