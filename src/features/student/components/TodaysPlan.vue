<script setup lang="ts">
/**
 * Today's plan, before a session's first item: what the session holds, in order, and why each
 * was picked, so the student knows what they're about to practise. Let's go starts the session.
 */
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import PlanRowLine from '@/features/student/components/PlanRow.vue'
import { planRows } from '@/features/student/utils/planRows'
import type { PlanRow } from '@/features/student/utils/planRows'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

type Item = components['schemas']['PracticeSessionItem']

const props = defineProps<{
  items: Item[]
  minutes: number
  /** The instrument in the student's hands, or how a session in the head is called. */
  instrumentName: string
  /** What to call an item on screen. */
  labelOf: (item: Item) => string
}>()

const emit = defineEmits<{ start: [] }>()

const { t } = useTypedT()

const rows = computed(() => planRows(props.items))

function rowName(row: PlanRow): string {
  const label = props.labelOf(row.item)
  if (row.cellCount !== undefined) return t('sessionPlan.cells', { drill: label, count: row.cellCount })
  if (row.shapeCount !== undefined) return t('sessionPlan.shapes', { drill: label, count: row.shapeCount })
  return label
}
</script>

<template>
  <section class="flex flex-col gap-4" data-test="todays-plan">
    <header class="flex items-baseline justify-between gap-2">
      <h1 class="text-xl font-semibold">{{ t('sessionPlan.title') }}</h1>
      <span data-test="plan-meta" class="shrink-0 text-sm text-ink-muted">{{ t('sessionPlan.meta', { minutes, instrument: instrumentName }) }}</span>
    </header>

    <ol class="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface-raised">
      <PlanRowLine
        v-for="(row, index) in rows"
        :key="row.key"
        :position="index + 1"
        :name="rowName(row)"
        :reason="row.item.reason"
        :kind="row.item.kind"
      />
    </ol>

    <PracticeActionBar>
      <PrimaryButton data-test="lets-go" data-primary-action class="h-12 w-full" @click="emit('start')">
        {{ t('sessionPlan.start') }}
      </PrimaryButton>
    </PracticeActionBar>
  </section>
</template>
