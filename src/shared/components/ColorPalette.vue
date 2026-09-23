<script setup lang="ts">
import { Ban } from 'lucide-vue-next'

import { useTypedT } from '@/shared/composables/useTypedT'
import { COLOR_PALETTE } from '@/shared/utils/colorPalette'

const props = defineProps<{ modelValue?: string | null }>()
defineEmits<{ select: [color: string | null] }>()

const { t } = useTypedT()

function isSelected(hex: string): boolean {
  return props.modelValue?.toUpperCase() === hex
}
</script>

<template>
  <div data-test="color-palette" class="grid grid-cols-6 gap-1.5">
    <button
      v-for="color in COLOR_PALETTE"
      :key="color.key"
      type="button"
      :data-test="`color-swatch-${color.key}`"
      :aria-label="t(`colorPalette.colors.${color.key}`)"
      :aria-pressed="isSelected(color.hex)"
      :style="{ backgroundColor: color.hex }"
      class="h-6 w-6 rounded-full border border-border"
      :class="isSelected(color.hex) ? 'ring-2 ring-focus ring-offset-1' : ''"
      @click="$emit('select', color.hex)"
    />
    <button
      type="button"
      data-test="color-palette-clear"
      :aria-label="t('colorPalette.clear')"
      :title="t('colorPalette.clear')"
      :aria-pressed="!modelValue"
      class="flex h-6 w-6 items-center justify-center rounded-full border border-border text-ink-muted"
      :class="!modelValue ? 'ring-2 ring-focus ring-offset-1' : ''"
      @click="$emit('select', null)"
    >
      <Ban :size="14" aria-hidden="true" />
    </button>
  </div>
</template>
