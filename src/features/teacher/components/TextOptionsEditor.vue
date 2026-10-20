<script setup lang="ts">
import { Check, Plus, X } from 'lucide-vue-next'
import { useTypedT } from '@/shared/composables/useTypedT'

import type { TextOption } from '@/features/teacher/composables/useExerciseForm'

defineProps<{ options: TextOption[] }>()
const emit = defineEmits<{
  edit: [id: string, label: string]
  toggle: [id: string]
  remove: [id: string]
  add: []
}>()

const { t } = useTypedT()
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <div v-for="option in options" :key="option.id" class="flex items-center gap-2.5">
      <button
        type="button"
        data-test="option-correct"
        :aria-pressed="option.correct"
        :aria-label="option.correct ? t('textOptionsEditor.markedCorrectAriaLabel') : t('textOptionsEditor.markCorrectAriaLabel')"
        class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm border-2"
        :class="option.correct ? 'border-success bg-success text-success-fg' : 'border-border bg-surface-raised'"
        @click="emit('toggle', option.id)"
      >
        <Check v-if="option.correct" :size="13" aria-hidden="true" />
      </button>
      <input
        type="text"
        :placeholder="t('textOptionsEditor.optionPlaceholder')"
        class="flex-1 rounded-md border border-border bg-surface-raised px-3 py-[10px] text-[0.9375rem]"
        :value="option.label"
        @change="emit('edit', option.id, ($event.target as HTMLInputElement).value)"
      />
      <button
        type="button"
        data-test="option-remove"
        :aria-label="t('common.removeOption')"
        class="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-sm text-ink-subtle"
        @click="emit('remove', option.id)"
      >
        <X :size="14" aria-hidden="true" />
      </button>
    </div>
    <button
      type="button"
      data-test="add-option"
      class="mt-1 flex items-center gap-1.5 self-start rounded-md border border-dashed border-border px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-text"
      @click="emit('add')"
    >
      <Plus :size="14" aria-hidden="true" /> {{ t('textOptionsEditor.addOption') }}
    </button>
  </div>
</template>
