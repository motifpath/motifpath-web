<script setup lang="ts">
/**
 * Room for a diagram wider than the Practice Shell's 560 px text column. On a phone it stays in the
 * column; on a wider screen it leaves it, centred on it, as wide as the window allows (keeping the
 * shell's gutters) up to 720 px on Medium and 960 px on Expanded, so a 12-fret neck fits at tap size.
 */
import { computed } from 'vue'

import { useSizeClass } from '@/shared/composables/useSizeClass'

defineSlots<{ default: () => unknown }>()

const { sizeClass } = useSizeClass()

const widthClasses = computed(() => {
  if (sizeClass.value === 'compact') return ['w-full']
  return [
    'relative left-1/2 w-[calc(100vw-2.5rem)]',
    '-translate-x-1/2',
    sizeClass.value === 'medium' ? 'max-w-[45rem]' : 'max-w-[60rem]',
  ]
})
</script>

<template>
  <div data-test="breakout" :data-size-class="sizeClass" :class="widthClasses">
    <slot />
  </div>
</template>
