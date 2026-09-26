<script setup lang="ts">
import { useTypedT } from '@/shared/composables/useTypedT'
import { DIFFICULTY_LEVELS, type DifficultyLevel } from '@/shared/utils/levels'

withDefaults(
  defineProps<{
    /** Labels the group for assistive technology. */
    label?: string
    disabled?: boolean
  }>(),
  { label: undefined, disabled: false },
)

/** The chosen level, or null while none is. */
const level = defineModel<DifficultyLevel | null>({ required: true })

const { t } = useTypedT()
</script>

<template>
  <div role="radiogroup" :aria-label="label" class="flex flex-wrap gap-1 rounded-md bg-surface-sunken p-1">
    <button
      v-for="option in DIFFICULTY_LEVELS"
      :key="option"
      type="button"
      role="radio"
      :data-test="`level-option-${option}`"
      :aria-checked="level === option ? 'true' : 'false'"
      :disabled="disabled"
      class="rounded px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed"
      :class="level === option ? 'bg-surface-raised text-ink shadow-level1' : 'text-ink-muted'"
      @click="level = option"
    >
      {{ t(`levels.${option}`) }}
    </button>
  </div>
</template>
