<script setup lang="ts">
import { computed } from 'vue'

import Icon from '@/shared/components/Icon.vue'
import type { PathStepView } from '@/features/student/utils/pathProgress'

const props = defineProps<PathStepView>()

const isLocked = computed(() => props.status === 'locked')

const iconRole = computed(() => {
  if (props.status === 'completed') return 'completed'
  if (props.isCurrent) return 'current'
  if (isLocked.value) return 'locked'
  return 'todo'
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
      'font-medium text-ink': isCurrent,
      'text-ink-subtle': isLocked,
    }"
    :aria-disabled="isLocked ? 'true' : undefined"
  >
    <span data-test="step-position" class="tabular-nums text-xs text-ink-muted">{{
      position
    }}</span>
    <span class="flex-1">{{ title }}</span>
    <span
      data-test="step-status"
      class="inline-flex items-center text-xs"
      :class="status === 'completed' ? 'text-success' : 'text-ink-muted'"
    >
      <Icon :name="iconRole" :size="14" />
      <span class="sr-only">{{ statusLabel }}</span>
    </span>
    <RouterLink
      v-if="affordance"
      data-test="step-affordance"
      :to="{ name: 'node', params: { nodeId: contentNodeId } }"
      class="text-xs font-medium text-accent-text underline"
      >{{ affordance }}</RouterLink
    >
  </li>
</template>
