<script setup lang="ts">
/**
 * A student's finished weeks as bars against a dashed line at the weekly target, with a caption
 * that counts every week so far, including any older than the bars drawn.
 */
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { WEEKLY_TARGET } from '@/features/admin/utils/alphaObservation'
import { useTypedT } from '@/shared/composables/useTypedT'

type AlphaWeekCount = components['schemas']['AlphaWeekCount']

const props = defineProps<{ weeks: AlphaWeekCount[]; weeksAtTarget: number; weeksSoFar: number }>()

const { t } = useTypedT()

/** Bars are drawn up to this many sessions; a busier week is drawn full height. */
const SCALE_MAX = WEEKLY_TARGET + 2

const bars = computed(() =>
  props.weeks.map((week) => ({
    key: week.week_start,
    atTarget: week.finished_sessions >= WEEKLY_TARGET,
    // A week with no session still shows a sliver, so an empty week reads as a week.
    height: Math.max(Math.min(week.finished_sessions, SCALE_MAX) / SCALE_MAX, 0.12) * 100,
  })),
)

const caption = computed(() =>
  props.weeksSoFar === 0
    ? t('engagement.student.noWeeksYet')
    : t('engagement.student.weeksAtTarget', { count: props.weeksAtTarget, total: props.weeksSoFar }),
)
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="relative flex h-6 w-32 items-end gap-0.5" aria-hidden="true">
      <span data-test="target-line" class="absolute inset-x-0 top-[40%] border-t border-dashed border-ink-subtle" />
      <!-- Each bar's height is its session count, which only a style binding can express. -->
      <span
        v-for="bar in bars"
        :key="bar.key"
        data-test="week-bar"
        :data-at-target="bar.atTarget ? 'true' : 'false'"
        class="w-3 rounded-sm"
        :class="bar.atTarget ? 'bg-accent' : 'bg-accent-muted'"
        :style="{ height: `${bar.height}%` }"
      />
    </div>
    <span data-test="weeks-caption" class="text-xs text-ink-muted">{{ caption }}</span>
  </div>
</template>
