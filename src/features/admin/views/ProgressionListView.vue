<script setup lang="ts">
/**
 * Every progression, in Teach under Admin, and the only place one is removed: chips for where it
 * stands, a search by name or numerals, a count, then one row per progression, the drills first.
 */
import { computed, onMounted, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import ProgressionRemoveDialog from '@/features/admin/components/progressions/ProgressionRemoveDialog.vue'
import ProgressionRow from '@/features/admin/components/progressions/ProgressionRow.vue'
import { useProgressionRemoval } from '@/features/admin/composables/useProgressionRemoval'
import { progressionMatches } from '@/features/admin/utils/progressionDraft'
import { isSameDay } from '@/features/admin/utils/songChartListing'
import ChoiceChip from '@/shared/components/ChoiceChip.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import SearchField from '@/shared/components/SearchField.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import TeachShell from '@/shared/components/TeachShell.vue'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useProgressionCatalog } from '@/shared/composables/useProgressionCatalog'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'

type Progression = components['schemas']['Progression']
type Filter = 'all' | 'in-drills' | 'chart-only'

const { t, locale } = useTypedT()
const { localizedName } = useLocalizedName()
const { isCompact } = useSizeClass()
const toast = useToast()
const { current: progressions, refresh } = useProgressionCatalog()

const removal = useProgressionRemoval((progression) => toast.success(t('progressionList.remove.removed', { name: localizedName(progression.names) })))
const { target, step, uses, deleting, deleteFailed } = removal

const isLoading = ref(progressions.value.length === 0)
const loadFailed = ref(false)
const filter = ref<Filter>('all')
const searchText = ref('')

const filterChips = computed<{ value: Filter; label: string }[]>(() => [
  { value: 'all', label: t('progressionList.all') },
  { value: 'in-drills', label: t('progressionList.inDrills') },
  { value: 'chart-only', label: t('songChartEditor.chartOnly') },
])

const shown = computed(() => {
  const inDrills = progressions.value.filter((p) => p.in_drills)
  const chartOnly = progressions.value.filter((p) => !p.in_drills)
  const standing = filter.value === 'in-drills' ? inDrills : filter.value === 'chart-only' ? chartOnly : [...inDrills, ...chartOnly]
  return standing.filter((p) => progressionMatches(p, localizedName(p.names), searchText.value))
})

const dayFormat = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short' }))

/** "Major · 4 bars · created by Ana Souza, today · tagged in 2 charts"; on a phone, "Major · 4 bars · 2 charts". */
function metaOf(progression: Progression): string {
  const barCount = progression.bars.length
  const parts = [
    t(progression.mode === 'major' ? 'progressionForm.major' : 'progressionForm.minor'),
    barCount === 1 ? t('progressionForm.oneBar') : t('progressionForm.manyBars', { count: barCount }),
  ]
  const catalog = progression.created_by === null
  const charts = progression.song_chart_count
  if (isCompact.value) {
    if (catalog) parts.push(t('progressionList.catalog'))
    else parts.push(charts > 0 ? t('progressionList.charts', { count: charts }) : t('progressionList.notTagged'))
    return parts.join(' · ')
  }
  parts.push(catalog ? t('progressionList.catalog') : createdLabel(progression))
  if (charts > 0) parts.push(t('progressionList.taggedIn', { count: charts }))
  else if (!catalog) parts.push(t('progressionList.notTaggedAnywhere'))
  return parts.join(' · ')
}

function createdLabel(progression: Progression): string {
  const created = progression.created_at ? new Date(progression.created_at) : null
  const when = created === null ? '' : isSameDay(created, new Date()) ? t('progressionList.today') : dayFormat.value.format(created)
  return t('progressionList.createdBy', { name: progression.created_by?.display_name ?? '', when })
}

async function load() {
  isLoading.value = progressions.value.length === 0
  loadFailed.value = false
  const list = await refresh()
  loadFailed.value = list === null && progressions.value.length === 0
  isLoading.value = false
}

function retryRemoval() {
  if (target.value) void removal.begin(target.value)
}

onMounted(load)
</script>

<template>
  <TeachShell section="admin-progressions">
    <main class="mx-auto flex w-full max-w-[880px] flex-1 flex-col gap-4 px-4 pb-20 pt-4 lg:px-0 lg:pt-8">
      <h1 class="text-[28px] font-bold leading-[34px] text-ink">{{ t('progressionList.heading') }}</h1>

      <div class="flex flex-col gap-3 md:flex-row md:items-center">
        <div class="flex flex-wrap gap-2" role="group" :aria-label="t('progressionList.filterLabel')">
          <ChoiceChip
            v-for="chip in filterChips"
            :key="chip.value"
            :data-test="`filter-${chip.value}`"
            :label="chip.label"
            :selected="filter === chip.value"
            @toggle="filter = chip.value"
          />
        </div>
        <SearchField v-model="searchText" data-test="progression-list-search" class="md:flex-1" :placeholder="t('progressionList.searchPlaceholder')" />
      </div>

      <LoadingSkeleton v-if="isLoading" data-test="loading" />
      <div v-else-if="loadFailed" data-test="error">
        <LoadFailed :message="t('progressionList.loadFailed')" @retry="load" />
      </div>
      <StateBlock
        v-else-if="shown.length === 0"
        data-test="no-matches"
        kind="empty"
        :title="t('progressionList.noMatchesHeading')"
        :message="t('progressionList.noMatchesMessage')"
      >
        <template v-if="searchText" #action>
          <button type="button" data-test="clear-search" class="h-12 rounded-full border border-border px-6 text-base font-semibold text-ink hover:bg-surface-sunken" @click="searchText = ''">
            {{ t('progressionList.clearSearch') }}
          </button>
        </template>
      </StateBlock>
      <template v-else>
        <p data-test="progression-count" class="text-xs font-medium text-ink-muted">
          {{ t('progressionList.count', { count: shown.length }) }}<template v-if="!isCompact"> · {{ t('progressionList.countNote') }}</template>
        </p>
        <ul class="flex flex-col gap-3">
          <li v-for="progression in shown" :key="progression.progression_id">
            <ProgressionRow
              :name="localizedName(progression.names)"
              :meta="metaOf(progression)"
              :in-drills="progression.in_drills"
              @remove="removal.begin(progression)"
            />
          </li>
        </ul>
      </template>

      <ProgressionRemoveDialog
        :open="target !== null"
        :name="target ? localizedName(target.names) : ''"
        :step="step"
        :uses="uses"
        :deleting="deleting"
        :delete-failed="deleteFailed"
        @close="removal.close"
        @remove="removal.confirm"
        @retry="retryRemoval"
      />
    </main>
  </TeachShell>
</template>
