<script setup lang="ts">
/**
 * An admin's preview of a song chart's draft: the learner's reader, full screen, under a banner
 * saying nothing is recorded. Closing it goes back to the chart's editor.
 */
import { X } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import { useSongChartPreview } from '@/features/admin/composables/useSongChartPreview'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import SongChartReader from '@/shared/components/songChart/SongChartReader.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{ songChartId: string }>()

const { t } = useTypedT()
const router = useRouter()
const { chart, instrument, isLoading, error, notFound, retry } = useSongChartPreview(props.songChartId)

function backToEditor() {
  void router.push({ name: 'admin-song-chart', params: { songChartId: props.songChartId } })
}
</script>

<template>
  <SongChartReader v-if="!isLoading && !error && chart" :chart="chart" :instrument="instrument" preview @close="backToEditor" />

  <div v-else class="flex min-h-dvh flex-col bg-surface">
    <header class="flex items-center py-1 pl-2 pr-4">
      <button
        type="button"
        data-test="close-song-chart"
        class="flex size-12 items-center justify-center rounded-full text-ink hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        :aria-label="t('songChartPage.close')"
        @click="backToEditor"
      >
        <X :size="24" aria-hidden="true" />
      </button>
    </header>
    <main class="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-6 pt-1">
      <div v-if="isLoading" data-test="preview-loading">
        <LoadingSkeleton />
      </div>
      <div v-else-if="notFound" data-test="preview-not-found">
        <StateBlock kind="notFound" :title="t('songChartPreview.notFoundHeading')" :message="t('songChartPreview.notFoundMessage')" />
      </div>
      <div v-else data-test="preview-error">
        <LoadFailed :message="t('songChartPreview.loadFailed')" @retry="retry" />
      </div>
    </main>
  </div>
</template>
