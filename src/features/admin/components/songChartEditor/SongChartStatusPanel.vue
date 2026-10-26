<script setup lang="ts">
/**
 * Where a song chart stands, at the top of its editor's side column: a status chip and a sentence
 * saying what learners see. While anything stops the draft from being published, the panel lists
 * every reason, the rights and each chord with its section and line, and Publish waits until there
 * is none. A published chart offers Withdraw…; a withdrawn one says who withdrew it, when and why,
 * and offers to publish it again.
 */
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { PublishBlocker } from '@/features/admin/utils/publishBlockers'
import StatusChip from '@/shared/components/StatusChip.vue'
import { useProgressionNames } from '@/shared/composables/useProgressionNames'
import { useTypedT } from '@/shared/composables/useTypedT'
import { formatDate } from '@/shared/utils/formatDate'

type SongChart = components['schemas']['SongChart']

const props = defineProps<{
  /** The chart as saved; null for a new one not saved yet. */
  chart: SongChart | null
  blockers: PublishBlocker[]
  busy: boolean
}>()
const emit = defineEmits<{ publish: []; withdraw: [] }>()

const { t, locale } = useTypedT()
const { nameOf } = useProgressionNames()

const chip = computed(() => {
  const status = props.chart?.status ?? 'draft'
  const tone = status === 'published' ? 'success' : status === 'withdrawn' ? 'neutral' : 'accent'
  return { label: t(`songChartList.status.${status}`), tone } as const
})

const statusText = computed(() => {
  const c = props.chart
  if (!c) return t('songChartStatus.new')
  if (c.status === 'withdrawn' && c.withdrawal) {
    const { withdrawn_by, withdrawn_at, reason } = c.withdrawal
    return t('songChartStatus.withdrawn', { name: withdrawn_by.display_name, date: formatDate(withdrawn_at, locale.value), reason })
  }
  if (c.status === 'published' && c.published_revision) return t('songChartStatus.published', { revision: c.published_revision.revision_number })
  return t('songChartStatus.draft')
})

function sectionName(section: Exclude<PublishBlocker, { kind: 'rights' }>['section']): string {
  return section.label ?? t(`songChart.sectionKind.${section.kind}`)
}

function blockerText(blocker: PublishBlocker): string {
  if (blocker.kind === 'rights') return t('songChartStatus.confirmRights')
  if (blocker.kind === 'progression') return t('songChartStatus.notPlayed', { section: sectionName(blocker.section), progression: nameOf(blocker.progressionKey) })
  const where = { symbol: blocker.symbol, section: sectionName(blocker.section), line: blocker.line }
  return blocker.problem === 'not_in_catalog' ? t('songChartStatus.notInCatalog', where) : t('songChartStatus.notAChord', where)
}
</script>

<template>
  <section data-test="status-panel" class="flex flex-col gap-3 rounded-2xl border border-border bg-surface-raised p-4">
    <StatusChip data-test="status-chip" class="self-start" :label="chip.label" :tone="chip.tone" />
    <p data-test="status-text" class="text-sm text-ink">{{ statusText }}</p>

    <div v-if="blockers.length" class="flex flex-col gap-1 text-sm text-ink-muted">
      <p>{{ t('songChartStatus.beforeYouPublish') }}</p>
      <ul class="flex list-disc flex-col gap-0.5 pl-5">
        <li v-for="(blocker, i) in blockers" :key="i" data-test="blocker">{{ blockerText(blocker) }}</li>
      </ul>
    </div>

    <template v-if="chart">
      <button
        type="button"
        data-test="publish"
        class="h-12 rounded-full bg-accent px-6 text-base font-semibold text-accent-fg disabled:opacity-50"
        :disabled="busy || blockers.length > 0"
        @click="emit('publish')"
      >
        {{ chart.status === 'withdrawn' ? t('songChartStatus.publishAgain') : t('songChartEditorView.publish') }}
      </button>
      <button
        v-if="chart.status === 'published'"
        type="button"
        data-test="withdraw"
        class="h-12 rounded-full border border-border px-6 text-base font-semibold text-danger hover:bg-surface-sunken disabled:opacity-50"
        :disabled="busy"
        @click="emit('withdraw')"
      >
        {{ t('songChartStatus.withdraw') }}
      </button>
    </template>
  </section>
</template>
