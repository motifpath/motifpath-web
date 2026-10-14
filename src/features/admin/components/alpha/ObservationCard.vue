<script setup lang="ts">
/** One student on a phone or a tablet: the same measures as a row, stacked in a card. */
import { ChevronRight } from 'lucide-vue-next'
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

import type { components } from '@/api/generated/core-domain'
import FirstPathBar from '@/features/admin/components/alpha/FirstPathBar.vue'
import { useEngagementLabels } from '@/features/admin/composables/useEngagementLabels'
import StatusChip from '@/shared/components/StatusChip.vue'

type AlphaStudent = components['schemas']['AlphaStudent']

const props = defineProps<{ student: AlphaStudent; now: Date; to: RouteLocationRaw }>()

const { t, chip, lastActiveShort, weeksAtTarget } = useEngagementLabels()

const weekChip = computed(() => chip(props.student.finished_sessions_in_week))
const path = computed(() => props.student.first_path)
</script>

<template>
  <RouterLink
    :to="to"
    class="flex flex-col gap-2 rounded-lg border border-border bg-surface-raised p-4 hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
  >
    <span class="flex items-center gap-2">
      <span class="min-w-0 flex-1 truncate text-base font-semibold text-ink">{{ student.display_name }}</span>
      <StatusChip data-test="week-chip" :label="weekChip.label" :tone="weekChip.tone" />
      <ChevronRight :size="20" class="text-ink-muted" aria-hidden="true" />
    </span>
    <span class="text-xs text-ink-muted">
      {{ t('engagement.student.sessionsThisWeek', { count: student.finished_sessions_in_week }) }} · {{ weeksAtTarget(student) }}
    </span>
    <FirstPathBar :percent="path.completed_percent" :label="t('engagement.student.firstPathNodes', { completed: path.completed_nodes, total: path.total_nodes, percent: path.completed_percent })" />
    <span class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
      <span class="text-ink">
        {{ t('engagement.student.firstPathCard', { title: path.title, completed: path.completed_nodes, total: path.total_nodes, percent: path.completed_percent }) }}
      </span>
      <span data-test="last-active" :class="student.quiet ? 'text-danger' : 'text-ink-muted'">{{ lastActiveShort(student, now) }}</span>
    </span>
  </RouterLink>
</template>
