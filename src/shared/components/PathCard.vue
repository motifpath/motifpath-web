<script setup lang="ts">
/**
 * An invitation to continue the student's path: its name, how far along it is, and the next step.
 * The whole card is one tap target, never a second primary button beside the screen's own.
 */
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import Icon from '@/shared/components/Icon.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{
  pathName: string
  completed: number
  total: number
  /** The next step's title and what kind of step it is; null once every step is done. */
  next: { title: string; meta: string } | null
  to: RouteLocationRaw
}>()

const { t } = useTypedT()

const percent = computed(() => (props.total === 0 ? 0 : (props.completed / props.total) * 100))
</script>

<template>
  <RouterLink
    :to="to"
    data-test="path-card"
    class="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
  >
    <div class="flex items-center gap-2">
      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-muted text-accent-text">
        <Icon name="path" :size="18" />
      </span>
      <span class="flex min-w-0 flex-1 flex-col">
        <span class="text-xs font-semibold uppercase tracking-wide text-accent-text">{{ t('pathCard.eyebrow') }}</span>
        <span data-test="path-card-name" class="text-base font-bold text-ink">{{ pathName }}</span>
      </span>
      <span data-test="path-card-count" class="shrink-0 text-sm font-semibold tabular-nums text-ink-muted" aria-hidden="true">
        {{ t('progressMeter.short', { completed, total }) }}
      </span>
    </div>

    <div
      role="progressbar"
      class="h-2 overflow-hidden rounded-full bg-surface-sunken"
      :aria-valuenow="completed"
      aria-valuemin="0"
      :aria-valuemax="total"
      :aria-label="t('progressMeter.summary', { completed, total })"
    >
      <div class="h-full rounded-full bg-accent" :style="{ width: `${percent}%` }" />
    </div>

    <div v-if="next" class="flex items-center gap-3 rounded-md bg-accent-muted py-2.5 pl-3 pr-2">
      <span class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span data-test="path-card-next-title" class="text-base font-semibold text-ink">{{ next.title }}</span>
        <span data-test="path-card-next-meta" class="text-xs font-medium text-ink-muted">{{ next.meta }}</span>
      </span>
      <Icon name="chevron-right" :size="20" class="shrink-0 text-accent-text" />
    </div>
  </RouterLink>
</template>
