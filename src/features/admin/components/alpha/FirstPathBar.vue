<script setup lang="ts">
/** How much of the first path is done, with a mark at the 70% target the alpha aims past. */
defineProps<{ percent: number; label: string }>()

const TARGET_PERCENT = 70
</script>

<template>
  <div
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="percent"
    :aria-label="label"
    class="relative h-3.5 w-full"
  >
    <div class="absolute inset-x-0 top-[3px] h-2 rounded-full bg-accent-muted">
      <!-- The fill and the mark sit at data-driven positions, which only a style binding can express. -->
      <div data-test="first-path-fill" class="h-2 rounded-full bg-accent" :style="{ width: `${percent}%` }" />
    </div>
    <span data-test="first-path-target" class="absolute top-0 h-3.5 w-0.5 rounded-full bg-ink" :style="{ left: `${TARGET_PERCENT}%` }" />
  </div>
</template>
