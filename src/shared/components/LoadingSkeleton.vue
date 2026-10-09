<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

import { useTypedT } from '@/shared/composables/useTypedT'

withDefaults(
  defineProps<{
    /** `cards` for a list of cards or rows, `lines` for a page of text. */
    shape?: 'cards' | 'lines'
    count?: number
  }>(),
  { shape: 'cards', count: 3 },
)

// Placeholders only appear once a load has taken 300 ms: a faster load never flashes them.
const SHOW_AFTER_MS = 300

const { t } = useTypedT()
const visible = ref(false)
const timer = setTimeout(() => {
  visible.value = true
}, SHOW_AFTER_MS)
onBeforeUnmount(() => clearTimeout(timer))

// Text lines get ragged widths, as a paragraph's last line would.
const LINE_WIDTHS = ['w-full', 'w-11/12', 'w-4/5', 'w-2/3']
function lineWidth(index: number): string {
  return LINE_WIDTHS[index % LINE_WIDTHS.length]
}
</script>

<template>
  <div role="status" aria-busy="true" class="flex flex-col" :class="shape === 'cards' ? 'gap-3' : 'gap-2'">
    <span data-test="skeleton-label" class="sr-only">{{ t('states.loading') }}</span>
    <template v-if="visible">
      <template v-if="shape === 'cards'">
        <div
          v-for="index in count"
          :key="index"
          data-test="skeleton-block"
          class="flex flex-col gap-2 rounded-lg border border-border bg-surface-raised p-4"
          aria-hidden="true"
        >
          <div class="h-3 w-1/2 animate-pulse rounded-full bg-surface-sunken" />
          <div class="h-3 w-1/3 animate-pulse rounded-full bg-surface-sunken" />
        </div>
      </template>
      <template v-else>
        <div
          v-for="index in count"
          :key="index"
          data-test="skeleton-block"
          class="h-3 animate-pulse rounded-full bg-surface-sunken"
          :class="lineWidth(index - 1)"
          aria-hidden="true"
        />
      </template>
    </template>
  </div>
</template>
