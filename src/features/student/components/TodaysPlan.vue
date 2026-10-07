<script setup lang="ts">
/**
 * Today's plan, before a session's first item: what the session holds, in order, and why each
 * was picked, so the student knows what they're about to practise. Let's go starts the session.
 */
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { pickReasonKeys } from '@/features/student/utils/pickReason'
import { planRows } from '@/features/student/utils/planRows'
import type { PlanRow } from '@/features/student/utils/planRows'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

type Item = components['schemas']['PracticeSessionItem']

const props = defineProps<{
  items: Item[]
  minutes: number
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
      <span class="text-sm text-ink-muted">{{ t('sessionPlan.minutes', { minutes }) }}</span>
    </header>

    <ol class="flex flex-col divide-y divide-border rounded-lg border border-border">
      <li v-for="(row, index) in rows" :key="row.key" data-test="plan-row" class="flex items-center gap-3 px-3 py-2.5">
        <span class="w-5 shrink-0 text-right text-sm tabular-nums text-ink-subtle">{{ index + 1 }}</span>
        <div class="flex min-w-0 flex-col">
          <span data-test="plan-row-name" class="truncate font-medium">{{ rowName(row) }}</span>
          <span data-test="plan-row-reason" class="text-xs text-ink-muted">{{ t(pickReasonKeys[row.item.reason]) }}</span>
        </div>
      </li>
    </ol>

    <PracticeActionBar>
      <PrimaryButton data-test="lets-go" data-primary-action class="h-12 w-full" @click="emit('start')">
        {{ t('sessionPlan.start') }}
      </PrimaryButton>
    </PracticeActionBar>
  </section>
</template>
