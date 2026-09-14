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
import { ChevronRight, Circle, CircleCheck, CircleDot, Lock, Menu, Moon, Sun } from 'lucide-vue-next'
import { computed } from 'vue'

type IconName = 'completed' | 'current' | 'locked' | 'todo' | 'menu' | 'chevron-right' | 'sun' | 'moon'

const props = withDefaults(
  defineProps<{
    name: IconName
    label?: string
    size?: number
    /** Wraps the glyph in a role-coloured circular badge (PB-35 Direction B/D card look). */
    badge?: boolean
  }>(),
  { size: 16 },
)

const glyph = computed(
  () =>
    ({
      completed: CircleCheck,
      current: CircleDot,
      locked: Lock,
      todo: Circle,
      menu: Menu,
      'chevron-right': ChevronRight,
      sun: Sun,
      moon: Moon,
    })[props.name],
)

const badgeClassByName: Partial<Record<IconName, string>> = {
  completed: 'bg-success text-success-fg',
  current: 'bg-accent text-accent-fg',
  locked: 'bg-surface-sunken text-ink-subtle',
  todo: 'bg-surface-sunken text-ink-subtle',
}
const badgeClass = computed(() => badgeClassByName[props.name])
</script>

<template>
  <span
    v-if="badge"
    data-test="icon-badge"
    class="inline-flex items-center justify-center rounded-full p-1"
    :class="badgeClass"
  >
    <component
      :is="glyph"
      :size="size"
      :aria-hidden="label ? undefined : 'true'"
      :role="label ? 'img' : undefined"
      :aria-label="label"
    />
  </span>
  <component
    v-else
    :is="glyph"
    :size="size"
    :aria-hidden="label ? undefined : 'true'"
    :role="label ? 'img' : undefined"
    :aria-label="label"
  />
</template>
