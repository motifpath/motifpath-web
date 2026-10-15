<script setup lang="ts">
/**
 * A bar of the metronome as a dot a beat: the downbeat larger, so the bar's start reads without
 * colour, and the sounding beat lit.
 */
defineProps<{
  beats: number
  /** The sounding beat, from 0; null while silent. */
  lit: number | null
}>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-3.5" aria-hidden="true">
    <span
      v-for="beat in beats"
      :key="beat"
      data-test="beat-dot"
      :data-kind="beat === 1 ? 'downbeat' : 'beat'"
      :data-lit="lit === beat - 1 ? 'true' : 'false'"
      class="flex size-6 items-center justify-center"
    >
      <span
        class="rounded-full"
        :class="[
          beat === 1 ? 'size-[1.75rem]' : 'size-[1.125rem]',
          lit === beat - 1 ? 'bg-accent' : 'border-[1.5px] border-border bg-surface-sunken',
        ]"
      />
    </span>
  </div>
</template>
