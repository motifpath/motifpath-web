<script setup lang="ts">
/** One student on a wide screen: this week, the weeks so far, the first path and last activity. */
import { ChevronRight } from 'lucide-vue-next'
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

import type { components } from '@/api/generated/core-domain'
import FirstPathBar from '@/features/admin/components/alpha/FirstPathBar.vue'
import WeeklyBars from '@/features/admin/components/alpha/WeeklyBars.vue'
import { useEngagementLabels } from '@/features/admin/composables/useEngagementLabels'
import StatusChip from '@/shared/components/StatusChip.vue'

type AlphaStudent = components['schemas']['AlphaStudent']

const props = defineProps<{ student: AlphaStudent; now: Date; to: RouteLocationRaw }>()

const { t, chip, joined, lastActiveShort } = useEngagementLabels()

const weekChip = computed(() => chip(props.student.finished_sessions_in_week))
const nodes = computed(() =>
  t('engagement.student.firstPathNodes', {
    completed: props.student.first_path.completed_nodes,
    total: props.student.first_path.total_nodes,
    percent: props.student.first_path.completed_percent,
  }),
)
</script>

<template>
  <RouterLink
    :to="to"
    :aria-label="t('engagement.student.open', { name: student.display_name })"
    class="grid grid-cols-[200px_130px_150px_1fr_84px_20px] items-center gap-4 rounded-lg bg-surface-raised px-4 py-3 hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
  >
    <span class="flex min-w-0 flex-col gap-0.5">
      <span class="truncate text-sm font-semibold text-ink">{{ student.display_name }}</span>
      <span class="text-xs text-ink-muted">{{ joined(student) }}</span>
    </span>
    <span class="flex flex-col items-start gap-1">
      <span data-test="week-sessions" class="text-sm font-semibold text-ink">
        {{ t('engagement.student.sessions', { count: student.finished_sessions_in_week }) }}
      </span>
      <StatusChip data-test="week-chip" :label="weekChip.label" :tone="weekChip.tone" />
    </span>
    <WeeklyBars :weeks="student.weeks_so_far" :weeks-at-target="student.weeks_at_target_count" :weeks-so-far="student.weeks_so_far_count" />
    <span class="flex min-w-0 flex-col gap-1">
      <span class="truncate text-xs text-ink-muted">{{ student.first_path.title }}</span>
      <FirstPathBar :percent="student.first_path.completed_percent" :label="nodes" />
      <span class="text-xs text-ink">{{ nodes }}</span>
    </span>
    <span data-test="last-active" class="text-sm" :class="student.quiet ? 'text-danger' : 'text-ink-muted'">
      {{ lastActiveShort(student, now) }}
    </span>
    <ChevronRight :size="20" class="text-ink-muted" aria-hidden="true" />
  </RouterLink>
</template>
