<script setup lang="ts">
/**
 * A published song chart on its own page, opened from a link. Closing it goes back to where the
 * learner came from, or to the home when the link was opened directly.
 */
import { useRouter } from 'vue-router'

import SongChartScreen from '@/shared/components/songChart/SongChartScreen.vue'

defineProps<{ songChartId: string }>()

const router = useRouter()

function close() {
  if (window.history.state?.back) router.back()
  else void router.push({ name: 'home' })
}
</script>

<template>
  <SongChartScreen :song-chart-id="songChartId" @close="close" />
</template>
