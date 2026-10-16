<script setup lang="ts">
/**
 * The icon of a note value the music is played at (quarters, eighths, triplets…), drawn in the
 * current text colour like the app's other icons. It is decoration: whatever shows it names the
 * value in words.
 */
import { computed } from 'vue'

import { NOTE_VALUE_GLYPHS } from '@/shared/components/tempoNoteValueGlyphs'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'

const props = defineProps<{ value: TempoNoteValue }>()

const paths = computed(() => NOTE_VALUE_GLYPHS[props.value])
</script>

<template>
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true" :data-note-value="value" class="shrink-0">
    <path
      v-for="(path, i) in paths"
      :key="i"
      :d="path.d"
      :fill="path.filled ? 'currentColor' : 'none'"
      :stroke="path.filled ? undefined : 'currentColor'"
      :stroke-width="path.strokeWidth"
      :stroke-linecap="path.round ? 'round' : undefined"
      :stroke-linejoin="path.round ? 'round' : undefined"
    />
  </svg>
</template>
