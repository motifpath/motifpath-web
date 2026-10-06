<script setup lang="ts">
/**
 * The Practice Shell: the one layout of every practice run (ADR-049). An exit, the student's
 * place in the run and its progress on top; what is played or shown and what the student does
 * below; the action in a PracticeActionBar at the bottom. No other navigation.
 *
 * Keys, so a keyboard or a page-turner pedal can drive a run: Escape exits, and Enter or Space
 * presses the primary action (the button marked `data-primary-action`) unless a control has the
 * focus and takes the key itself.
 */
import { X } from 'lucide-vue-next'
import { onBeforeUnmount, onMounted, ref } from 'vue'

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
const root = ref<HTMLElement | null>(null)

const CONTROLS = 'button, a, input, select, textarea, [contenteditable], [role="button"], [role="radio"], [role="checkbox"]'

function onKeydown(event: KeyboardEvent) {
  if (event.defaultPrevented) return
  if (event.key === 'Escape') {
    emit('exit')
    return
  }
  if (event.key !== 'Enter' && event.key !== ' ') return
  if (event.target instanceof Element && event.target.closest(CONTROLS)) return
  const primary = root.value?.querySelector<HTMLButtonElement>('[data-primary-action]')
  if (!primary || primary.disabled) return
  event.preventDefault()
  primary.click()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div ref="root" data-test="practice-shell" class="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4">
    <div class="sticky top-0 z-10 flex flex-col gap-2 bg-surface pt-2 pb-3">
      <div class="relative flex h-12 items-center">
        <button
          type="button"
          data-test="shell-exit"
          class="-ml-2 flex h-12 w-12 items-center justify-center rounded-full text-ink-muted hover:text-ink"
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

    <!-- Room under the content for the fixed action bar. -->
    <div class="flex flex-1 flex-col gap-4 pb-32">
      <slot />
    </div>
  </div>
</template>
