<script setup lang="ts">
/**
 * The top of the Practice Shell: the way out, and during a run where the student is in it. Each
 * item has a segment of the progress bar, filled as far as it went; a play-along's fills take by
 * take. No other navigation.
 */
import { X } from 'lucide-vue-next'

import { useTypedT } from '@/shared/composables/useTypedT'

defineProps<{
  /** The exit's accessible name: what × does here. */
  exitLabel: string
  /** The item on, counted from 1, during a run. */
  position?: { current: number; total: number }
  /** How full each item's segment is, from 0 to 1, during a run. */
  progress?: number[]
}>()

const emit = defineEmits<{ exit: [] }>()

const { t } = useTypedT()
</script>

<template>
  <div data-test="practice-header" class="sticky top-0 z-10 flex flex-col gap-2 bg-surface pt-2 pb-3">
    <div class="relative flex h-12 items-center">
      <button
        type="button"
        data-test="shell-exit"
        class="-ml-3 flex h-12 w-12 items-center justify-center rounded-full text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        :aria-label="exitLabel"
        @click="emit('exit')"
      >
        <X :size="24" aria-hidden="true" />
      </button>
      <span
        v-if="position"
        data-test="shell-position"
        class="absolute left-1/2 -translate-x-1/2 text-sm font-semibold tabular-nums text-ink-muted"
      >
        {{ position.current }} / {{ position.total }}
      </span>
    </div>
    <div
      v-if="progress && position"
      class="flex gap-1"
      role="progressbar"
      :aria-label="t('practiceShell.progressLabel')"
      aria-valuemin="0"
      :aria-valuemax="position.total"
      :aria-valuenow="position.current"
    >
      <div
        v-for="(filled, i) in progress"
        :key="i"
        data-test="session-segment"
        :data-filled="Math.round(filled * 100)"
        class="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken"
      >
        <div class="h-full bg-accent transition-all motion-reduce:transition-none" :style="{ width: `${filled * 100}%` }" />
      </div>
    </div>
  </div>
</template>
