<script setup lang="ts">
/**
 * Picks a published song chart to embed in an article lesson, from the charts learners can read,
 * shown as their latest published revision shows them: title, then artist · key · language.
 * Drafts and withdrawn charts aren't listed. On a phone it is a full-screen layer where a tap on a
 * chart inserts it; on a wide screen it is a two-pane dialog where a tap selects a chart, the right
 * pane shows its card as learners will see it and how it starts, and Insert inserts it. Rendered at
 * the document body, since the editor itself can sit inside another modal.
 */
import { ChevronRight, Search, X } from 'lucide-vue-next'
import { computed, provide, ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { usePublishedSongChartLibrary } from '@/features/teacher/composables/usePublishedSongChartLibrary'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import SongChartCard from '@/shared/components/songChart/SongChartCard.vue'
import SongChartOpeningLines from '@/shared/components/songChart/SongChartOpeningLines.vue'
import { SONG_CHART_OPENER } from '@/shared/components/songChart/songChartOpener'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'
import { languageLabelKey } from '@/shared/utils/languageLabels'

type SongChartSummary = components['schemas']['SongChartSummary']

defineProps<{ open: boolean }>()
const emit = defineEmits<{ pick: [songChartId: string]; close: [] }>()

const { t } = useTypedT()
const { sizeClass } = useSizeClass()
const asDialog = computed(() => sizeClass.value === 'expanded')
const { charts, total, searchText, isLoading, error, reload } = usePublishedSongChartLibrary()

// The preview card is only a picture of what learners will see; tapping it here opens nothing.
provide(SONG_CHART_OPENER, () => {})

/** The chart the dialog previews and Insert inserts: the first listed until another is tapped. */
const selectedId = ref<string | null>(null)
watch(
  charts,
  (list) => {
    if (!list.some((c) => c.song_chart_id === selectedId.value)) selectedId.value = list[0]?.song_chart_id ?? null
  },
  { immediate: true },
)

function titleOf(chart: SongChartSummary): string {
  return chart.published_revision?.title ?? chart.title
}

/** "John Newton · Key G · English", as the published revision shows it. */
function metaOf(chart: SongChartSummary): string {
  const revision = chart.published_revision
  const artist = revision?.artist ?? chart.artist
  const key = revision?.concert_key ? t('songChart.key', { key: revision.concert_key }) : null
  const languageKey = languageLabelKey(revision?.language ?? chart.language)
  return [artist, key, languageKey ? t(languageKey) : null].filter(Boolean).join(' · ')
}

function choose(chart: SongChartSummary) {
  if (asDialog.value) selectedId.value = chart.song_chart_id
  else emit('pick', chart.song_chart_id)
}

function insertSelected() {
  if (selectedId.value) emit('pick', selectedId.value)
}
</script>

<template>
  <ModalOverlay
    :open="open"
    :panel-class="
      asDialog
        ? 'flex h-[min(720px,90vh)] w-[1040px] max-w-[94vw] flex-col overflow-hidden rounded-3xl bg-surface-raised shadow-level2'
        : 'fixed inset-0 flex h-dvh w-full flex-col bg-surface'
    "
    @close="emit('close')"
  >
    <div data-test="song-chart-picker" :data-layout="asDialog ? 'dialog' : 'layer'" class="flex min-h-0 flex-1 flex-col">
      <header class="flex items-center gap-2" :class="asDialog ? 'px-6 pb-2 pt-6' : 'py-1 pl-2 pr-4'">
        <button
          v-if="!asDialog"
          type="button"
          class="flex size-12 items-center justify-center rounded-full text-ink hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          :aria-label="t('songChartPicker.close')"
          @click="emit('close')"
        >
          <X :size="24" aria-hidden="true" />
        </button>
        <h2 class="flex-1 font-semibold text-ink" :class="asDialog ? 'text-xl' : 'text-base'">{{ t('songChartPicker.title') }}</h2>
        <button
          v-if="asDialog"
          type="button"
          class="flex size-10 items-center justify-center rounded-full text-ink hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          :aria-label="t('songChartPicker.close')"
          @click="emit('close')"
        >
          <X :size="22" aria-hidden="true" />
        </button>
      </header>

      <div class="flex min-h-0 flex-1">
        <div class="flex min-h-0 flex-col gap-3 px-4 pb-4 pt-2" :class="asDialog ? 'w-1/2 border-r border-border px-5' : 'w-full'">
          <label class="flex h-12 items-center gap-2 rounded-xl bg-surface-sunken px-3 text-ink-muted">
            <Search :size="20" aria-hidden="true" />
            <input
              v-model="searchText"
              data-test="song-chart-search"
              type="search"
              :placeholder="t('songChartPicker.searchPlaceholder')"
              class="min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-ink-muted focus:outline-none"
            />
          </label>
          <div class="min-h-0 flex-1 overflow-y-auto">
            <LoadingSkeleton v-if="isLoading" />
            <LoadFailed v-else-if="error" :message="t('songChartPicker.loadFailed')" @retry="reload" />
            <p v-else-if="charts.length === 0" data-test="song-chart-none" class="text-sm text-ink-muted">
              {{ t('songChartPicker.none') }}
            </p>
            <template v-else>
              <p data-test="song-chart-count" class="pb-2 text-xs font-medium text-ink-muted">{{ t('songChartPicker.count', { count: total }) }}</p>
              <ul class="flex flex-col gap-2" role="listbox" :aria-label="t('songChartPicker.title')">
                <li v-for="chart in charts" :key="chart.song_chart_id">
                  <button
                    type="button"
                    role="option"
                    data-test="song-chart-option"
                    :aria-selected="asDialog ? chart.song_chart_id === selectedId : undefined"
                    class="flex w-full items-center gap-3 rounded-2xl border bg-surface-raised px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    :class="asDialog && chart.song_chart_id === selectedId ? 'border-2 border-accent' : 'border-border hover:border-accent'"
                    @click="choose(chart)"
                  >
                    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span class="truncate text-base font-semibold text-ink">{{ titleOf(chart) }}</span>
                      <span data-test="song-chart-option-meta" class="truncate text-xs font-medium text-ink-muted">{{ metaOf(chart) }}</span>
                    </span>
                    <ChevronRight :size="20" class="shrink-0 text-ink-muted" aria-hidden="true" />
                  </button>
                </li>
              </ul>
            </template>
            <p data-test="song-chart-picker-note" class="pt-3 text-xs text-ink-muted">{{ t('songChartPicker.note') }}</p>
          </div>
        </div>

        <aside v-if="asDialog" class="flex w-1/2 min-h-0 flex-col gap-3 overflow-y-auto px-5 pb-4 pt-2">
          <template v-if="selectedId">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-ink-subtle">{{ t('songChartPicker.asLearnersSee') }}</h3>
            <SongChartCard :key="selectedId" :song-chart-id="selectedId" />
            <p class="text-xs text-ink-muted">{{ t('songChartPicker.cardNote') }}</p>
            <h3 class="pt-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">{{ t('songChartPicker.openingLines') }}</h3>
            <SongChartOpeningLines :key="`lines-${selectedId}`" :song-chart-id="selectedId" />
          </template>
        </aside>
      </div>

      <footer v-if="asDialog" class="flex justify-end gap-3 border-t border-border px-6 py-3">
        <button type="button" data-test="song-chart-cancel" class="h-12 rounded-full px-6 text-base font-semibold text-accent-text hover:bg-surface-sunken" @click="emit('close')">
          {{ t('songChartPicker.cancel') }}
        </button>
        <button
          type="button"
          data-test="song-chart-insert"
          class="h-12 rounded-full bg-accent px-6 text-base font-semibold text-accent-fg disabled:opacity-50"
          :disabled="!selectedId"
          @click="insertSelected"
        >
          {{ t('songChartPicker.insert') }}
        </button>
      </footer>
    </div>
  </ModalOverlay>
</template>
