<script setup lang="ts">
/** One node of the first path: done with its date, in progress with its start, or not started. */
import { CircleCheck, CirclePlay, Circle } from 'lucide-vue-next'
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { alphaDay } from '@/features/admin/utils/alphaObservation'
import { useTypedT } from '@/shared/composables/useTypedT'

type AlphaPathNode = components['schemas']['AlphaPathNode']

const props = defineProps<{ node: AlphaPathNode }>()

const { t, locale } = useTypedT()

const date = computed(() => {
  if (props.node.status === 'completed' && props.node.completed_at) return alphaDay(props.node.completed_at, locale.value)
  if (props.node.status === 'in_progress' && props.node.started_at) {
    return t('engagement.studentScreen.nodeStarted', { date: alphaDay(props.node.started_at, locale.value) })
  }
  return null
})
</script>

<template>
  <div :data-status="node.status" class="flex min-h-8 items-center gap-2.5">
    <CircleCheck v-if="node.status === 'completed'" :size="20" class="shrink-0 text-success" aria-hidden="true" />
    <CirclePlay v-else-if="node.status === 'in_progress'" :size="20" class="shrink-0 text-accent" aria-hidden="true" />
    <Circle v-else :size="20" class="shrink-0 text-ink-subtle" aria-hidden="true" />
    <span data-test="node-status" class="sr-only">{{ t(`engagement.studentScreen.nodeStatus.${node.status}`) }}</span>
    <span
      class="min-w-0 flex-1 truncate text-sm"
      :class="{ 'text-ink': node.status === 'completed', 'font-semibold text-ink': node.status === 'in_progress', 'text-ink-muted': node.status === 'not_started' }"
    >
      {{ node.title }}
    </span>
    <span
      v-if="date"
      data-test="node-date"
      class="shrink-0 text-xs tabular-nums"
      :class="node.status === 'in_progress' ? 'text-accent-text' : 'text-ink-muted'"
    >
      {{ date }}
    </span>
  </div>
</template>
