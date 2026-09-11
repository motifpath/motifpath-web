<script setup lang="ts">
/**
 * ADR-018 decision 3. Screens name an icon by a MotifPath role, not by a
 * lucide symbol, so the icon set stays swappable and only the icons actually
 * referenced are bundled (per-icon tree-shaking).
 *
 * Decorative by default; pass `label` when the icon carries meaning not
 * otherwise present in the DOM — it becomes the accessible name and the SVG
 * is exposed to assistive tech as an image instead of hidden.
 */
import { Circle, CircleCheck, CircleDot, Lock } from 'lucide-vue-next'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name: 'completed' | 'current' | 'locked' | 'todo'
    label?: string
    size?: number
  }>(),
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
    :role="label ? 'img' : undefined"
    :aria-label="label"
  />
</template>
