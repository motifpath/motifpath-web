<script setup lang="ts">
/**
 * A published song chart taking the whole screen, for whatever opened it to put away: its own
 * page, or a lesson that opened it over itself. The close control is there from the start; while
 * the chart loads, placeholder lines stand in for it. A chart that can't be read says it isn't
 * available, without saying why, and offers the way home; a failed load offers to try again.
 */
import { X } from 'lucide-vue-next'

import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import SongChartReader from '@/shared/components/songChart/SongChartReader.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import { usePublishedSongChart } from '@/shared/composables/usePublishedSongChart'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{ songChartId: string }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useTypedT()
const { chart, instrument, isLoading, error, notFound, retry } = usePublishedSongChart(props.songChartId)
</script>

<template>
  <SongChartReader v-if="!isLoading && !error && chart" :chart="chart" :instrument="instrument" @close="emit('close')" />

  <div v-else class="flex min-h-dvh flex-col bg-surface">
    <header class="flex items-center py-1 pl-2 pr-4">
      <button
        type="button"
        data-test="close-song-chart"
        class="flex size-12 items-center justify-center rounded-full text-ink hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        :aria-label="t('songChartPage.close')"
        @click="emit('close')"
      >
        <X :size="24" aria-hidden="true" />
      </button>
    </header>

    <main class="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-6 pt-1">
      <div v-if="isLoading" data-test="song-chart-loading">
        <LoadingSkeleton />
      </div>
      <div v-else-if="notFound" data-test="song-chart-unavailable">
        <StateBlock kind="notFound" :title="t('songChartPage.unavailableHeading')" :message="t('songChartPage.unavailableMessage')">
          <template #action>
            <RouterLink
              :to="{ name: 'home' }"
              data-test="song-chart-go-home"
              class="flex h-12 items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              {{ t('songChartPage.goHome') }}
            </RouterLink>
          </template>
        </StateBlock>
      </div>
      <div v-else data-test="song-chart-error">
        <LoadFailed :message="t('songChartPage.loadFailed')" @retry="retry" />
      </div>
    </main>
  </div>
</template>
