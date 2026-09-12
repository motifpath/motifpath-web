<script setup lang="ts">
/**
 * Generic step-row primitive (ADR-018 phase 2 component library): a
 * position marker, title content, an optional trailing status, and an
 * optional trailing action. Carries no domain concept of its own (no
 * "locked"/"completed") so it is reusable outside the student path —
 * `PathStep` composes it with that domain logic.
 */
defineProps<{
  position: number | string
  /** Visually emphasises the row (e.g. the current step). */
  emphasis?: boolean
  /** Visually de-emphasises the row (e.g. a locked step). */
  muted?: boolean
}>()
</script>

<template>
  <li
    class="flex items-baseline gap-3"
    :class="{ 'font-medium text-ink': emphasis, 'text-ink-subtle': muted }"
  >
    <span data-test="step-position" class="tabular-nums text-xs text-ink-muted">{{
      position
    }}</span>
    <span class="flex-1"><slot /></span>
    <slot name="status" />
    <slot name="action" />
  </li>
</template>
