<script setup lang="ts">
/**
 * An admin's preview of a song chart's draft, exactly as a learner would read it. Nothing done
 * here counts as a learner's reading.
 */
import { useSongChartPreview } from '@/features/admin/composables/useSongChartPreview'
import AppBar from '@/shared/components/AppBar.vue'
import SongChartReader from '@/shared/components/songChart/SongChartReader.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import { useIsCompact } from '@/shared/composables/useIsCompact'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{ songChartId: string }>()

const { t } = useTypedT()
const { isCompact } = useIsCompact()
const { chart, instrument, isLoading, error, notFound, retry } = useSongChartPreview(props.songChartId)
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <AppBar :compact="isCompact" />

    <main class="mx-auto flex w-full max-w-[430px] flex-1 flex-col gap-4 px-4 pb-10 pt-6">
      <div v-if="isLoading" data-test="preview-loading">
        <LoadingSkeleton />
      </div>
      <div v-else-if="notFound" data-test="preview-not-found">
        <StateBlock kind="notFound" :title="t('songChartPreview.notFoundHeading')" :message="t('songChartPreview.notFoundMessage')" />
      </div>
      <div v-else-if="error || !chart" data-test="preview-error">
        <LoadFailed :message="t('songChartPreview.loadFailed')" @retry="retry" />
      </div>
      <template v-else>
        <p data-test="preview-note" class="rounded-md bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
          {{ t('songChartPreview.note') }}
        </p>
        <SongChartReader :chart="chart" :instrument="instrument" />
      </template>
    </main>
  </div>
</template>
