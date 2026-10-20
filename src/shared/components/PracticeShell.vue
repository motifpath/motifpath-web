<script setup lang="ts">
/**
 * The Practice Shell: the one layout of every practice run. An exit, the student's
 * place in the run and its progress on top; what is played or shown and what the student does
 * below; the action in a PracticeActionBar at the bottom. No other navigation, at any size: on a
 * wider screen the content stays in one centred 560 px column.
 *
 * Keys, so a keyboard or a page-turner pedal can drive a run: Escape exits, and Enter or Space
 * presses the primary action (the button marked `data-primary-action`) unless a control has the
 * focus and takes the key itself.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

import PracticeHeader from '@/shared/components/PracticeHeader.vue'

defineProps<{
  /** The exit's accessible name: what × does here. */
  exitLabel: string
  /** The item on, counted from 1, during a run. */
  position?: { current: number; total: number }
  /** How full each item's segment is, from 0 to 1, during a run. */
  progress?: number[]
  /** The name of a page pushed inside the shell, such as a tool; its way out is then an arrow back. */
  title?: string
}>()

const emit = defineEmits<{ exit: [] }>()

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
  <div ref="root" data-test="practice-shell" class="mx-auto flex w-full max-w-[35rem] flex-1 flex-col px-5">
    <PracticeHeader :exit-label="exitLabel" :position="position" :progress="progress" :title="title" @exit="emit('exit')">
      <template v-if="$slots.options" #options>
        <slot name="options" />
      </template>
    </PracticeHeader>

    <!-- Room under the content for the fixed action bar. -->
    <div class="flex flex-1 flex-col gap-4 pb-32">
      <slot />
    </div>
  </div>
</template>
