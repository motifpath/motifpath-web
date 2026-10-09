<script setup lang="ts">
import { Plus } from 'lucide-vue-next'

import type { components } from '@/api/generated/core-domain'
import { useSongChartLibrary } from '@/features/admin/composables/useSongChartLibrary'
import AppBar from '@/shared/components/AppBar.vue'
import LoadMoreButton from '@/shared/components/LoadMoreButton.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import { useIsCompact } from '@/shared/composables/useIsCompact'
import { useTypedT } from '@/shared/composables/useTypedT'

type SongChartSummary = components['schemas']['SongChartSummary']
type SongChartStatus = components['schemas']['SongChartStatus']

const { isCompact } = useIsCompact()
const { t } = useTypedT()
const { charts, total, status, searchText, hasActiveFilters, isLoading, isLoadingMore, error, loadMoreError, reload, loadMore } =
  useSongChartLibrary()

const statuses: SongChartStatus[] = ['draft', 'published', 'withdrawn']

function statusText(chart: SongChartSummary): string {
  if (chart.status === 'published' && chart.published_revision_number !== null) {
    return t('songChartList.publishedAt', { revision: chart.published_revision_number })
  }
  return t(`songChartList.status.${chart.status}`)
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <AppBar context="teacher" :compact="isCompact" :primary-nav-to="{ name: 'admin-song-charts' }" />

    <div class="flex flex-1 flex-col gap-6 px-4 pb-[80px] pt-6 sm:px-[48px] sm:pt-10">
      <div class="flex items-center justify-between">
        <h1 class="text-lg font-bold text-ink sm:text-xl">{{ t('songChartList.heading') }}</h1>
        <RouterLink
          :to="{ name: 'admin-song-chart-new' }"
          data-test="new-song-chart"
          class="flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-fg"
        >
          <Plus :size="14" aria-hidden="true" />
          {{ t('songChartList.newChart') }}
        </RouterLink>
      </div>

      <div class="flex flex-wrap items-end gap-4">
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{{ t('songChartList.searchLabel') }}</span>
          <input
            v-model="searchText"
            data-test="song-chart-search"
            type="search"
            :placeholder="t('songChartList.searchPlaceholder')"
            class="w-64 rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-ink"
          />
        </label>
        <div class="flex w-fit gap-1 rounded-lg bg-surface-sunken p-1" role="group" :aria-label="t('songChartList.statusLabel')">
          <button
            type="button"
            data-test="status-all"
            :aria-pressed="status === null"
            class="rounded-md px-3 py-1 text-xs font-semibold"
            :class="status === null ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
            @click="status = null"
          >
            {{ t('songChartList.allStatuses') }}
          </button>
          <button
            v-for="option in statuses"
            :key="option"
            type="button"
            :data-test="`status-${option}`"
            :aria-pressed="status === option"
            class="rounded-md px-3 py-1 text-xs font-semibold"
            :class="status === option ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
            @click="status = option"
          >
            {{ t(`songChartList.status.${option}`) }}
          </button>
        </div>
      </div>

      <LoadingSkeleton v-if="isLoading" data-test="loading" />
      <div v-else-if="error" data-test="error">
        <LoadFailed :message="t('songChartList.loadFailed')" @retry="reload" />
      </div>
      <StateBlock
        v-else-if="charts.length === 0 && hasActiveFilters"
        data-test="no-matches"
        kind="empty"
        :title="t('songChartList.noMatchesHeading')"
        :message="t('songChartList.noMatchesMessage')"
      />
      <StateBlock
        v-else-if="charts.length === 0"
        data-test="empty"
        kind="empty"
        :title="t('songChartList.emptyHeading')"
        :message="t('songChartList.emptyMessage')"
      />
      <template v-else>
        <ul class="flex flex-col gap-2">
          <li v-for="chart in charts" :key="chart.song_chart_id" data-test="song-chart-row">
            <RouterLink
              :to="{ name: 'admin-song-chart', params: { songChartId: chart.song_chart_id } }"
              class="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-raised px-4 py-3 hover:border-accent"
            >
              <span class="flex flex-col">
                <span class="font-semibold text-ink">{{ chart.title }}</span>
                <span class="text-sm text-ink-muted">{{ chart.artist }}</span>
              </span>
              <span class="text-xs font-semibold text-ink-muted">{{ statusText(chart) }}</span>
            </RouterLink>
          </li>
        </ul>
        <LoadMoreButton :loaded="charts.length" :total="total" :loading="isLoadingMore" :failed="loadMoreError" @load="loadMore" />
      </template>
    </div>
  </div>
</template>
