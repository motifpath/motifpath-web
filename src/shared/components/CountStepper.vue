<script setup lang="ts">
/**
 * A count the student enters after a timed drill, such as the clean changes they made in a
 * minute. It starts where the parent sets it (the last count, or 0) and never goes below 0. The
 * buttons are big enough to hit with the instrument still in hand; the arrow keys step it too.
 */
import { Minus, Plus } from 'lucide-vue-next'
import { computed } from 'vue'

import { useTypedT } from '@/shared/composables/useTypedT'

defineProps<{
  /** What is counted, shown under the count, e.g. "clean changes". */
  label: string
}>()

const count = defineModel<number>({ required: true })

const { t } = useTypedT()

const atZero = computed(() => count.value <= 0)

function step(by: number) {
  count.value = Math.max(0, count.value + by)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowUp') step(1)
  else if (event.key === 'ArrowDown') step(-1)
  else return
  event.preventDefault()
}
</script>

<template>
  <div class="flex w-full flex-col items-center gap-2">
    <div class="flex items-center gap-5">
      <button
        type="button"
        data-test="count-fewer"
        :aria-label="t('drill.countStepper.fewer', { label })"
        :disabled="atZero"
        class="flex size-14 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border bg-surface text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
        @click="step(-1)"
      >
        <Minus :size="24" aria-hidden="true" />
      </button>
      <span
        role="spinbutton"
        tabindex="0"
        :aria-valuenow="count"
        aria-valuemin="0"
        :aria-valuetext="t('drill.countStepper.valueText', { count, label })"
        :aria-label="label"
        class="min-w-[3ch] rounded-md text-center text-2xl font-bold tabular-nums text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        @keydown="onKeydown"
      >{{ count }}</span>
      <button
        type="button"
        data-test="count-more"
        :aria-label="t('drill.countStepper.more', { label })"
        class="flex size-14 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border bg-surface text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        @click="step(1)"
      >
        <Plus :size="24" aria-hidden="true" />
      </button>
    </div>
    <span data-test="count-label" class="text-sm text-ink-muted">{{ label }}</span>
  </div>
</template>
