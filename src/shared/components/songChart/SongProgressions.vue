<script setup lang="ts">
/**
 * The progressions in this song, each once, under the chords in this song: in the chart's column,
 * or in the side pane on a wide screen.
 */
import ProgressionChips from '@/shared/components/songChart/ProgressionChips.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

defineProps<{ keys: string[] }>()

const { t } = useTypedT()
</script>

<template>
  <section data-test="song-progressions" class="flex flex-col gap-2" :aria-label="t('songChart.progressionsInSong')">
    <h2 class="text-xs font-semibold uppercase tracking-wider text-ink-subtle">{{ t('songChart.progressionsInSong') }}</h2>
    <ProgressionChips :keys="keys" />
  </section>
</template>
