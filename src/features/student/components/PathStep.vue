<script setup lang="ts">
import { computed } from 'vue'

import Icon from '@/shared/components/Icon.vue'
import StepRow from '@/shared/components/StepRow.vue'
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
  <StepRow
    data-test="path-step"
    :position="position"
    :emphasis="isCurrent"
    :muted="isLocked"
    :aria-disabled="isLocked ? 'true' : undefined"
  >
    {{ title }}
    <template #status>
      <span
        data-test="step-status"
        class="inline-flex items-center text-xs"
        :class="status === 'completed' ? 'text-success' : 'text-ink-muted'"
      >
        <Icon :name="iconRole" :size="14" />
        <span class="sr-only">{{ statusLabel }}</span>
      </span>
    </template>
    <template v-if="affordance" #action>
      <RouterLink
        data-test="step-affordance"
        :to="{ name: 'node', params: { nodeId: contentNodeId } }"
        class="text-xs font-medium text-accent-text underline"
        >{{ affordance }}</RouterLink
      >
    </template>
  </StepRow>
</template>
