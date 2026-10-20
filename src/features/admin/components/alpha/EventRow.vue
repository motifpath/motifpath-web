<script setup lang="ts">
/** One raw tracking event. Its type stays its exact name in every language. */
import { computed } from 'vue'

import type { components } from '@/api/generated/event-ingestion'
import { alphaReceivedAt, eventDetails } from '@/features/admin/utils/alphaObservation'
import { useTypedT } from '@/shared/composables/useTypedT'

type LoggedEvent = components['schemas']['LoggedEvent']

const props = defineProps<{
  logged: LoggedEvent
  studentName: string
  /** Side by side under the log's column labels, or stacked where the columns don't fit. */
  layout: 'columns' | 'stacked'
}>()

const { t, locale } = useTypedT()

const details = computed(() =>
  eventDetails(props.logged.event)
    .map((part) => t(`engagement.events.detail.${part.key}`, part.params))
    .join(' · '),
)
</script>

<template>
  <div
    :data-layout="layout"
    class="grid border-b border-border px-4 py-2.5 last:border-b-0"
    :class="layout === 'columns' ? 'grid-cols-[120px_140px_240px_1fr] items-center gap-4' : 'grid-cols-1 gap-1'"
  >
    <span data-test="event-received" class="text-xs tabular-nums text-ink-muted">{{ alphaReceivedAt(logged.received_at, locale) }}</span>
    <span data-test="event-student" class="truncate text-sm text-ink">{{ studentName }}</span>
    <span data-test="event-type" class="break-all font-mono text-sm font-semibold text-ink">{{ logged.event.event_type }}</span>
    <span data-test="event-details" class="text-xs text-ink-muted">{{ details }}</span>
  </div>
</template>
