<script setup lang="ts">
import { computed } from 'vue'

import type { PathStepView } from '@/features/student/utils/pathProgress'

const props = defineProps<PathStepView>()

const isLocked = computed(() => props.status === 'locked')

const marker = computed(() => {
  if (props.status === 'completed') return '✓'
  if (props.isCurrent) return '▸'
  if (isLocked.value) return '🔒'
  return '·'
})

const statusLabel = computed(
  () =>
    ({
      completed: 'Completed',
      in_progress: 'In progress',
      not_started: 'Not started',
      locked: 'Locked',
    })[props.status],
)

/** The current step opens; a completed step can be revisited; nothing else. */
const affordance = computed(() => {
  if (props.isCurrent) return 'Open'
  if (props.status === 'completed') return 'Review'
  return null
})
</script>

<template>
  <li
    data-test="path-step"
    class="flex items-baseline gap-3"
    :class="{
      'font-medium text-motif-ink': isCurrent,
      'text-motif-ink/40': isLocked,
    }"
    :aria-disabled="isLocked ? 'true' : undefined"
  >
    <span data-test="step-position" class="tabular-nums text-xs text-motif-ink/50">{{
      position
    }}</span>
    <span aria-hidden="true" class="text-xs">{{ marker }}</span>
    <span class="flex-1">{{ title }}</span>
    <span
      data-test="step-status"
      class="text-xs"
      :class="status === 'completed' ? 'text-motif-success' : 'text-motif-ink/50'"
      >{{ statusLabel }}</span
    >
    <RouterLink
      v-if="affordance"
      data-test="step-affordance"
      :to="{ name: 'node', params: { nodeId: contentNodeId } }"
      class="text-xs font-medium text-motif-blue underline"
      >{{ affordance }}</RouterLink
    >
  </li>
</template>
