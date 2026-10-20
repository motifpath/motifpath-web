<script setup lang="ts">
/**
 * An option that is a picture or a diagram, with its key and an optional label beneath, in the same
 * states as a text option.
 */
import { CircleCheck, CircleX } from 'lucide-vue-next'
import { computed } from 'vue'

import { useTypedT } from '@/shared/composables/useTypedT'
import { isSettled, OPTION_STATE_CLASSES } from '@/shared/utils/optionState'
import type { OptionState } from '@/shared/utils/optionState'

const props = withDefaults(defineProps<{ keyHint: number; label?: string; state?: OptionState }>(), { label: undefined, state: 'default' })

defineEmits<{ click: [event: MouseEvent] }>()

const { t } = useTypedT()

const settled = computed(() => isSettled(props.state))
</script>

<template>
  <button
    type="button"
    :data-state="state"
    :aria-pressed="state === 'selected'"
    :disabled="settled"
    class="flex w-full flex-col gap-2 rounded-lg p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    :class="OPTION_STATE_CLASSES[state]"
    @click="$emit('click', $event)"
  >
    <span data-test="option-media" class="flex min-h-[112px] w-full items-center justify-center overflow-hidden rounded-md bg-surface-sunken">
      <slot />
    </span>
    <span class="flex w-full items-center gap-1.5">
      <span data-test="key-hint" aria-hidden="true" class="text-xs font-medium text-ink-muted">{{ keyHint }}</span>
      <span v-if="label" data-test="option-label" class="min-w-0 flex-1 text-sm font-semibold text-ink">{{ label }}</span>
      <span v-if="state === 'right' || state === 'wrong'" data-test="answer-mark" class="ml-auto" :class="state === 'right' ? 'text-success' : 'text-danger'">
        <CircleCheck v-if="state === 'right'" :size="20" aria-hidden="true" />
        <CircleX v-else :size="20" aria-hidden="true" />
        <span class="sr-only">{{ state === 'right' ? t('optionTile.markRight') : t('optionTile.markWrong') }}</span>
      </span>
    </span>
  </button>
</template>
