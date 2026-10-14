<script setup lang="ts">
/**
 * The raw event log, newest first, 12 at a time, for every student or one. Read-only: the only
 * control is "Load 12 more".
 */
import { computed, toRef } from 'vue'

import EventRow from '@/features/admin/components/alpha/EventRow.vue'
import { useLoggedEvents } from '@/features/admin/composables/useAlphaObservation'
import { useFitsColumns } from '@/features/admin/composables/useFitsColumns'
import { shortId, type EventTypeGroup } from '@/features/admin/utils/alphaObservation'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import LoadMoreButton from '@/shared/components/LoadMoreButton.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{
  studentId: string | null
  typeGroup: EventTypeGroup | null
  /** Display names by student id, to say whose each event is. */
  names: Record<string, string>
}>()

const { t } = useTypedT()
const fitsColumns = useFitsColumns()
const { events, total, isLoading, isLoadingMore, error, loadMoreError, reload, loadMore } = useLoggedEvents(
  toRef(props, 'studentId'),
  toRef(props, 'typeGroup'),
)

// Teachers who also learn, and students without a path, send events too but aren't in the alpha.
const nameOf = (studentId: string) => props.names[studentId] ?? t('engagement.events.otherUser', { id: shortId(studentId) })

const countLabel = computed(() =>
  props.studentId
    ? t('engagement.events.countFor', { count: total.value, name: nameOf(props.studentId), shown: events.value.length })
    : t('engagement.events.count', { count: total.value, shown: events.value.length }),
)
</script>

<template>
  <div class="flex flex-col gap-3">
    <LoadingSkeleton v-if="isLoading" data-test="events-loading" />
    <div v-else-if="error" data-test="events-error">
      <LoadFailed :message="t('engagement.eventsLoadFailed')" @retry="reload" />
    </div>
    <p v-else-if="events.length === 0" data-test="no-events" class="text-sm text-ink-muted">{{ t('engagement.events.none') }}</p>
    <template v-else>
      <p data-test="event-count" class="text-xs font-medium text-ink-muted">{{ countLabel }}</p>
      <div class="overflow-hidden rounded-lg border border-border bg-surface-raised">
        <div
          v-if="fitsColumns"
          data-test="event-columns"
          class="grid grid-cols-[120px_140px_240px_1fr] gap-4 border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink-muted"
          aria-hidden="true"
        >
          <span>{{ t('engagement.events.columns.received') }}</span>
          <span>{{ t('engagement.events.columns.student') }}</span>
          <span>{{ t('engagement.events.columns.event') }}</span>
          <span>{{ t('engagement.events.columns.details') }}</span>
        </div>
        <EventRow
          v-for="logged in events"
          :key="logged.event.event_id"
          data-test="event-row"
          :logged="logged"
          :student-name="nameOf(logged.event.student_id)"
          :layout="fitsColumns ? 'columns' : 'stacked'"
        />
      </div>
      <LoadMoreButton :loaded="events.length" :total="total" :loading="isLoadingMore" :failed="loadMoreError" :label="t('engagement.events.loadMore')" @load="loadMore" />
    </template>
  </div>
</template>
