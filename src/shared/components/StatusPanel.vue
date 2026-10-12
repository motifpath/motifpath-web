<script setup lang="ts">
import { computed } from 'vue'

import AppButton from '@/shared/components/AppButton.vue'
import StatusChip from '@/shared/components/StatusChip.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

/**
 * What opens an authoring editor: the item's status, what learners get now, and the one publishing
 * action. What a publish still needs is listed instead of leaving a button silently disabled.
 * Who may act, and the words for each status, are the editor's to decide.
 */
const props = withDefaults(
  defineProps<{
    status: { label: string; tone: 'neutral' | 'warning' | 'accent' | 'success' }
    /** What learners get now, in one or two sentences. */
    message: string
    /** What a publish still needs; while any is listed the primary action can't be used. */
    missing?: string[]
    /** The publishing action's label; no action is shown without one. */
    primary?: string
    /** A quieter second action (Unpublish, Retire). */
    secondary?: string
    /** An action is running. */
    busy?: boolean
  }>(),
  { missing: () => [], primary: undefined, secondary: undefined, busy: false },
)
const emit = defineEmits<{ primary: []; secondary: [] }>()

const { t } = useTypedT()

const primaryBlocked = computed(() => props.busy || props.missing.length > 0)
</script>

<template>
  <section
    :aria-label="t('statusPanel.label')"
    data-test="status-panel"
    class="flex flex-col gap-3 rounded-2xl border border-border bg-surface-raised p-4"
  >
    <span data-test="status-panel-status" class="self-start">
      <StatusChip :label="status.label" :tone="status.tone" />
    </span>
    <p data-test="status-panel-message" class="text-sm text-ink">{{ message }}</p>

    <div v-if="missing.length" data-test="status-panel-missing" class="flex flex-col gap-1 text-sm text-ink-muted">
      <p>{{ t('statusPanel.beforeYouPublish') }}</p>
      <ul class="list-disc pl-5">
        <li v-for="item in missing" :key="item" data-test="status-panel-missing-item">{{ item }}</li>
      </ul>
    </div>

    <AppButton
      v-if="primary"
      data-test="status-panel-primary"
      block
      :disabled="primaryBlocked"
      :busy="busy"
      @click="emit('primary')"
    >
      {{ primary }}
    </AppButton>
    <AppButton
      v-if="secondary"
      data-test="status-panel-secondary"
      variant="secondary"
      block
      :disabled="busy"
      @click="emit('secondary')"
    >
      {{ secondary }}
    </AppButton>

    <slot />
  </section>
</template>
