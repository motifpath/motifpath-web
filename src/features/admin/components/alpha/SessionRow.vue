<script setup lang="ts">
/** One practice session in any state, with how it ended, so a short week can be explained. */
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { alphaDayTime } from '@/features/admin/utils/alphaObservation'
import StatusChip from '@/shared/components/StatusChip.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

type AlphaSession = components['schemas']['AlphaSession']

const props = defineProps<{ session: AlphaSession }>()

const { t, locale } = useTypedT()

const STATE_TONE = {
  finished: 'success',
  ended_early: 'warning',
  abandoned: 'neutral',
  in_progress: 'accent',
} as const

const minutesRun = computed(() =>
  props.session.ended_at === null
    ? null
    : Math.round((new Date(props.session.ended_at).getTime() - new Date(props.session.started_at).getTime()) / 60_000),
)

const summary = computed(() => {
  const parts = [t('engagement.session.planned', { minutes: props.session.planned_minutes })]
  if (minutesRun.value !== null) {
    if (props.session.state === 'finished') parts.push(t('engagement.session.took', { minutes: minutesRun.value }))
    if (props.session.state === 'ended_early') parts.push(t('engagement.session.leftAfter', { minutes: minutesRun.value }))
    if (props.session.state === 'abandoned') parts.push(t('engagement.session.silentAfter', { minutes: minutesRun.value }))
  }
  parts.push(t('engagement.session.items', { count: props.session.items_answered }))
  return parts.join(' · ')
})
</script>

<template>
  <div class="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0">
    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="text-sm font-semibold tabular-nums text-ink">{{ alphaDayTime(session.started_at, locale) }}</span>
      <span class="text-xs text-ink-muted">{{ summary }}</span>
    </div>
    <StatusChip data-test="session-state" :label="t(`engagement.session.state.${session.state}`)" :tone="STATE_TONE[session.state]" />
  </div>
</template>
