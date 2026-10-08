<script setup lang="ts">
/**
 * A published song chart taking the whole screen, with only a close control, for whatever opened
 * it to put away: its own page, or a lesson that opened it over itself. A chart that can't be
 * read says it isn't available, without saying why.
 */
import { X } from 'lucide-vue-next'

import SongChartReader from '@/shared/components/songChart/SongChartReader.vue'
import StateEmpty from '@/shared/components/StateEmpty.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { usePublishedSongChart } from '@/shared/composables/usePublishedSongChart'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{ songChartId: string }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useTypedT()
const { chart, instrument, isLoading, error, notFound, retry } = usePublishedSongChart(props.songChartId)
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-surface">
    <header class="mx-auto flex w-full max-w-[430px] items-center px-4 pt-4">
      <button
        type="button"
        data-test="close-song-chart"
        class="rounded-md p-1 text-ink hover:bg-surface-sunken"
        :aria-label="t('songChartPage.close')"
        @click="emit('close')"
      >
        <X :size="24" aria-hidden="true" />
      </button>
    </header>

    <main class="mx-auto flex w-full max-w-[430px] flex-1 flex-col px-4 pt-4">
      <StateLoading v-if="isLoading" :noun="t('songChartPage.loadingNoun')" />
      <div v-else-if="notFound" data-test="song-chart-unavailable">
        <StateEmpty :heading="t('songChartPage.unavailableHeading')" :message="t('songChartPage.unavailableMessage')" />
      </div>
      <div v-else-if="error || !chart" data-test="song-chart-error">
        <StateError :message="t('songChartPage.loadFailed')" @retry="retry" />
      </div>
      <SongChartReader v-else :chart="chart" :instrument="instrument" />
    </main>
  </div>
</template>
