<script setup lang="ts">
/**
 * One option of a practice item, in the one look every exercise type shares: its key (1–9, for a
 * keyboard or a pedal) and its label. Right and wrong carry an icon and words, never colour alone.
 * Once the answer is in, every option stops taking taps: the graded ones show their mark, the
 * others are locked.
 */
import { CircleCheck, CircleX } from 'lucide-vue-next'
import { computed } from 'vue'

import { useTypedT } from '@/shared/composables/useTypedT'

export type OptionTileState = 'default' | 'selected' | 'right' | 'wrong' | 'locked'

const props = withDefaults(
  defineProps<{
    /** The number key that chooses it. */
    keyHint: number
    label: string
    state?: OptionTileState
  }>(),
  { state: 'default' },
)

defineEmits<{ click: [event: MouseEvent] }>()

const { t } = useTypedT()

const STATE_CLASSES: Record<OptionTileState, string> = {
  default: 'border border-border bg-surface hover:border-accent',
  selected: 'border-2 border-accent bg-accent-muted',
  right: 'border-2 border-success bg-success-muted',
  wrong: 'border-2 border-danger bg-danger-muted',
  locked: 'border border-border bg-surface opacity-55',
}

const settled = computed(() => props.state === 'right' || props.state === 'wrong' || props.state === 'locked')
</script>

<template>
  <button
    type="button"
    :data-state="state"
    :aria-pressed="state === 'selected'"
    :disabled="settled"
    class="flex min-h-[56px] w-full items-center gap-3 rounded-lg px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    :class="STATE_CLASSES[state]"
    @click="$emit('click', $event)"
  >
    <span
      data-test="key-hint"
      aria-hidden="true"
      class="flex size-[28px] shrink-0 items-center justify-center rounded-md bg-surface-sunken text-xs font-medium text-ink-muted"
    >
      {{ keyHint }}
    </span>
    <span data-test="option-label" class="min-w-0 flex-1 text-base text-ink">
      <slot>{{ label }}</slot>
    </span>
    <span v-if="state === 'right' || state === 'wrong'" data-test="answer-mark" :class="state === 'right' ? 'text-success' : 'text-danger'">
      <CircleCheck v-if="state === 'right'" :size="24" aria-hidden="true" />
      <CircleX v-else :size="24" aria-hidden="true" />
      <span class="sr-only">{{ state === 'right' ? t('optionTile.markRight') : t('optionTile.markWrong') }}</span>
    </span>
  </button>
</template>
