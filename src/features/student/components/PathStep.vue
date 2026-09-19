<script setup lang="ts">
import { computed } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'

import FocusCard from '@/shared/components/FocusCard.vue'
import Icon from '@/shared/components/Icon.vue'
import StepRow from '@/shared/components/StepRow.vue'
import type { PathStepView } from '@/features/student/utils/pathProgress'

const props = defineProps<PathStepView>()

const { t } = useTypedT()

const isLocked = computed(() => props.status === 'locked')

/** Only reached for non-current steps — `current` is Icon's other role. */
const iconRole = computed(() => {
  if (props.status === 'completed') return 'completed'
  if (isLocked.value) return 'locked'
  return 'todo'
})

const statusLabel = computed(
  () =>
    ({
      completed: t('pathStep.status.completed'),
      in_progress: t('pathStep.status.in_progress'),
      not_started: t('pathStep.status.not_started'),
      locked: t('pathStep.status.locked'),
    })[props.status],
)

const pillClass = computed(
  () =>
    ({
      completed: 'bg-success-muted text-success',
      in_progress: 'bg-accent-muted text-accent-text',
      not_started: 'bg-surface-sunken text-ink-muted',
      locked: 'bg-surface-sunken text-ink-subtle',
    })[props.status],
)

/** A completed step can be revisited; nothing else gets an affordance here — the current step is a FocusCard instead. */
const affordance = computed(() => (props.status === 'completed' ? t('pathStep.review') : null))

/** The current step's eyebrow reads "Continue" if already started, "Start" otherwise. */
const focusEyebrow = computed(() => (props.status === 'in_progress' ? t('pathStep.continue') : t('pathStep.start')))
const focusSubtitle = computed(() =>
  props.status === 'in_progress' ? t('pathStep.continueSubtitle') : t('pathStep.startSubtitle'),
)
</script>

<template>
  <FocusCard
    v-if="isCurrent"
    data-test="path-step"
    :position="position"
    :eyebrow="focusEyebrow"
    :title="title"
    :subtitle="focusSubtitle"
    :cta-label="t('pathStep.openLesson')"
    :to="{ name: 'node', params: { nodeId: contentNodeId } }"
  />
  <StepRow
    v-else
    data-test="path-step"
    card
    :position="position"
    :muted="isLocked"
    :aria-disabled="isLocked ? 'true' : undefined"
  >
    {{ title }}
    <template #status>
      <span data-test="step-status" class="inline-flex items-center gap-1.5">
        <Icon :name="iconRole" badge :size="14" />
        <span
          class="rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
          :class="pillClass"
          >{{ statusLabel }}</span
        >
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
