<script setup lang="ts">
import { useId } from 'vue'

import { useTypedT } from '@/shared/composables/useTypedT'

withDefaults(defineProps<{ size?: 'sm' | 'md' }>(), { size: 'sm' })

const { t } = useTypedT()
// One gradient per mark: two marks on a page (app bar and rail) must not share an id.
const gradientId = useId()
</script>

<template>
  <div
    class="flex shrink-0 items-center justify-center rounded-md bg-accent-muted"
    :class="size === 'sm' ? 'h-[1.875rem] w-[1.875rem]' : 'h-9 w-9'"
  >
    <svg :width="size === 'sm' ? 16 : 20" :height="size === 'sm' ? 16 : 20" viewBox="200 100 860 860" role="img" :aria-label="t('appBar.brand')">
      <defs>
        <linearGradient :id="gradientId" x1="309" y1="190" x2="938" y2="890" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#a14cff" />
          <stop offset=".27" stop-color="#8134ff" />
          <stop offset=".62" stop-color="#6421fa" />
          <stop offset="1" stop-color="#4714df" />
        </linearGradient>
      </defs>
      <path
        d="M346 203C314 203 290 218 279 243c-4 9-6 19-6 30v526c0 41 32 74 73 74h85c40 0 80-11 108-33 20-16 19-38 8-57-8-16-23-32-41-49l-53-50c-32-31-47-58-40-84 8-30 38-58 81-82l46-27c36-21 49-45 41-71-3-13-10-23-21-34L397 225c-14-14-32-22-51-22Z"
        :fill="`url(#${gradientId})`"
      />
      <path
        d="M689 873c38-24 49-54 35-85-13-30-42-55-83-80l-71-44c-50-31-77-58-73-86 4-29 29-55 69-84 34-24 63-50 89-77l191-193c18-18 41-25 64-25 42 0 76 33 76 77v522c0 42-33 75-75 75H689Z"
        :fill="`url(#${gradientId})`"
      />
    </svg>
  </div>
</template>
