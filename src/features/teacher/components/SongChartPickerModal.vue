<script setup lang="ts">
/**
 * Picks a published song chart to embed in lesson content, from the charts learners can read,
 * shown as their latest published revision shows them. Rendered at the document body, since the
 * editor itself can sit inside another modal.
 */
import { Music } from 'lucide-vue-next'

import { usePublishedSongChartLibrary } from '@/features/teacher/composables/usePublishedSongChartLibrary'
import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ pick: [songChartId: string]; close: [] }>()

const { t } = useTypedT()
const { charts, searchText, isLoading, error, reload } = usePublishedSongChartLibrary()
</script>

<template>
  <Teleport to="body">
    <ModalOverlay
      :open="open"
      panel-class="flex h-[70vh] w-[560px] max-w-[92vw] flex-col gap-4 rounded-xl bg-surface-raised p-5 shadow-level2"
      @close="emit('close')"
    >
      <div class="flex items-center justify-between">
        <span class="text-base font-bold">{{ t('songChartPicker.title') }}</span>
        <ModalCloseButton @close="emit('close')" />
      </div>
      <input
        v-model="searchText"
        data-test="song-chart-search"
        type="search"
        :placeholder="t('songChartPicker.searchPlaceholder')"
        class="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-ink"
      />
      <div class="min-h-0 flex-1 overflow-y-auto">
        <LoadingSkeleton v-if="isLoading" />
        <LoadFailed v-else-if="error" :message="t('songChartPicker.loadFailed')" @retry="reload" />
        <p v-else-if="charts.length === 0" data-test="song-chart-none" class="text-sm text-ink-muted">
          {{ t('songChartPicker.none') }}
        </p>
        <ul v-else class="flex flex-col gap-2">
          <li v-for="chart in charts" :key="chart.song_chart_id">
            <button
              type="button"
              data-test="song-chart-option"
              class="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2 text-left hover:border-accent"
              @click="emit('pick', chart.song_chart_id)"
            >
              <Music :size="16" class="text-accent-text" aria-hidden="true" />
              <span class="flex flex-col">
                <span class="font-semibold text-ink">{{ chart.published_revision?.title ?? chart.title }}</span>
                <span class="text-sm text-ink-muted">{{ chart.published_revision?.artist ?? chart.artist }}</span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </ModalOverlay>
  </Teleport>
</template>
