<script setup lang="ts">
/**
 * The song charts admins author, in Teach under Admin: a title with New song chart, status chips
 * (All · Drafts · Published · Withdrawn) and a search by title or artist, a count, then one row
 * per chart with its artist, language and revision and a status chip. A search with no match says
 * so in place, with Clear search.
 */
import { Plus } from 'lucide-vue-next'
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useSongChartLibrary } from '@/features/admin/composables/useSongChartLibrary'
import { isSameDay, songChartRowStatus } from '@/features/admin/utils/songChartListing'
import type { SongChartRowStatus } from '@/features/admin/utils/songChartListing'
import AuthoringRow from '@/shared/components/AuthoringRow.vue'
import ChoiceChip from '@/shared/components/ChoiceChip.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import LoadMoreButton from '@/shared/components/LoadMoreButton.vue'
import SearchField from '@/shared/components/SearchField.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import TeachShell from '@/shared/components/TeachShell.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { languageLabelKey } from '@/shared/utils/languageLabels'

type SongChartSummary = components['schemas']['SongChartSummary']
type SongChartStatus = components['schemas']['SongChartStatus']

const { t, locale } = useTypedT()
const { charts, total, status, searchText, hasActiveFilters, isLoading, isLoadingMore, error, loadMoreError, reload, loadMore } =
  useSongChartLibrary()

const statusChips: { value: SongChartStatus | null; label: string }[] = [
  { value: null, label: t('songChartList.allStatuses') },
  { value: 'draft', label: t('songChartList.status.draft') },
  { value: 'published', label: t('songChartList.status.published') },
  { value: 'withdrawn', label: t('songChartList.status.withdrawn') },
]

const ROW_STATUS: Record<SongChartRowStatus, { labelKey: 'songChartList.status.draft' | 'songChartList.status.published' | 'songChartList.status.withdrawn' | 'songChartList.unpublishedChanges'; tone: 'accent' | 'success' | 'neutral' | 'warning' }> = {
  draft: { labelKey: 'songChartList.status.draft', tone: 'accent' },
  published: { labelKey: 'songChartList.status.published', tone: 'success' },
  withdrawn: { labelKey: 'songChartList.status.withdrawn', tone: 'neutral' },
  unpublishedChanges: { labelKey: 'songChartList.unpublishedChanges', tone: 'warning' },
}

const dayFormat = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short' }))

function statusOf(chart: SongChartSummary) {
  const { labelKey, tone } = ROW_STATUS[songChartRowStatus(chart)]
  return { label: t(labelKey), tone }
}

/** "John Newton · English · Revision 2 · updated by Ana, today", with what matters for its state. */
function metaOf(chart: SongChartSummary): string {
  const languageKey = languageLabelKey(chart.language)
  const parts = [chart.artist, languageKey ? t(languageKey) : chart.language]
  const rowStatus = songChartRowStatus(chart)
  if (chart.published_revision_number === null) {
    parts.push(t('songChartList.neverPublished'))
    if (!chart.rights_confirmed) parts.push(t('songChartList.rightsNotConfirmed'))
    return parts.join(' · ')
  }
  parts.push(t('songChartList.revision', { revision: chart.published_revision_number }))
  if (rowStatus === 'withdrawn') parts.push(t('songChartList.withdrawnMeta'))
  if (rowStatus === 'unpublishedChanges') {
    const updated = new Date(chart.updated_at)
    const when = isSameDay(updated, new Date()) ? t('songChartList.today') : dayFormat.value.format(updated)
    parts.push(t('songChartList.updatedBy', { name: chart.updated_by.display_name, when }))
  }
  return parts.join(' · ')
}
</script>

<template>
  <TeachShell section="admin-song-charts">
    <main class="mx-auto flex w-full max-w-[880px] flex-1 flex-col gap-4 px-4 pb-20 pt-4 lg:px-0 lg:pt-8">
      <div class="flex items-center gap-3">
        <h1 class="flex-1 text-[28px] font-bold leading-[34px] text-ink">{{ t('songChartList.heading') }}</h1>
        <RouterLink
          :to="{ name: 'admin-song-chart-new' }"
          data-test="new-song-chart"
          class="flex h-10 items-center gap-1.5 rounded-full bg-accent pl-3.5 pr-4 text-sm font-semibold text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Plus :size="18" aria-hidden="true" />
          {{ t('songChartList.newChart') }}
        </RouterLink>
      </div>

      <div class="flex flex-col gap-3 md:flex-row md:items-center">
        <div class="flex flex-wrap gap-2" role="group" :aria-label="t('songChartList.statusLabel')">
          <ChoiceChip
            v-for="chip in statusChips"
            :key="chip.value ?? 'all'"
            :data-test="`status-${chip.value ?? 'all'}`"
            :label="chip.label"
            :selected="status === chip.value"
            @toggle="status = chip.value"
          />
        </div>
        <SearchField v-model="searchText" data-test="song-chart-search" class="flex-1" :placeholder="t('songChartList.searchPlaceholder')" />
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
      >
        <template v-if="searchText" #action>
          <button type="button" data-test="clear-search" class="h-12 rounded-full border border-border px-6 text-base font-semibold text-ink hover:bg-surface-sunken" @click="searchText = ''">
            {{ t('songChartList.clearSearch') }}
          </button>
        </template>
      </StateBlock>
      <StateBlock v-else-if="charts.length === 0" data-test="empty" kind="empty" :title="t('songChartList.emptyHeading')" :message="t('songChartList.emptyMessage')" />
      <template v-else>
        <p data-test="song-chart-count" class="text-xs font-medium text-ink-muted">{{ t('songChartList.count', { count: total }) }}</p>
        <ul class="flex flex-col gap-3">
          <li v-for="chart in charts" :key="chart.song_chart_id" data-test="song-chart-row">
            <AuthoringRow
              :title="chart.title"
              :meta="metaOf(chart)"
              :status="statusOf(chart)"
              :to="{ name: 'admin-song-chart', params: { songChartId: chart.song_chart_id } }"
            />
          </li>
        </ul>
        <LoadMoreButton :loaded="charts.length" :total="total" :loading="isLoadingMore" :failed="loadMoreError" @load="loadMore" />
      </template>
    </main>
  </TeachShell>
</template>
