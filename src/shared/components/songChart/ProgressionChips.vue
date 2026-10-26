<script setup lang="ts">
/**
 * Progressions a song plays, as chips by their names in the progression catalog. The catalog is
 * only asked for once a chip is shown.
 */
import { useProgressionNames } from '@/shared/composables/useProgressionNames'

defineProps<{ keys: string[] }>()

const { nameOf } = useProgressionNames()
</script>

<template>
  <ul class="flex flex-wrap gap-2">
    <li v-for="key in keys" :key="key" data-test="progression-chip" class="rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-semibold text-ink-muted">
      {{ nameOf(key) }}
    </li>
  </ul>
</template>
