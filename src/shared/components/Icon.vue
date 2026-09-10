<script setup lang="ts">
/**
 * PB-34 spike — the `Icon` wrapper (ADR-018 decision 3). Screens name an icon by
 * a MotifPath role, not by a lucide symbol, so the icon set stays swappable and
 * only the icons actually referenced are bundled (per-icon tree-shaking).
 *
 * An icon is decorative by default; pass `label` when it carries meaning that is
 * not otherwise in the DOM — it becomes the accessible name and the SVG is
 * hidden from AT.
 */
import { CircleCheck, CircleDot, Circle, Lock } from 'lucide-vue-next'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ name: 'completed' | 'current' | 'locked' | 'todo'; label?: string; size?: number }>(),
  { size: 16 },
)

const glyph = computed(
  () => ({ completed: CircleCheck, current: CircleDot, locked: Lock, todo: Circle })[props.name],
)
</script>

<template>
  <component
    :is="glyph"
    :size="size"
    :aria-hidden="label ? undefined : 'true'"
    :aria-label="label"
    :role="label ? 'img' : undefined"
  />
</template>
