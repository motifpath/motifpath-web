<script setup lang="ts">
import { ArrowLeft, X } from 'lucide-vue-next'

import { useTypedT } from '@/shared/composables/useTypedT'

withDefaults(
  defineProps<{
    title: string
    /** The id the layer's `aria-labelledby` points at. */
    titleId: string
    kind: 'sheet' | 'dialog'
    /** Shows × (close). Off for a confirm, whose buttons are the way out. */
    closable?: boolean
    /** A sub-step: a back arrow before the title instead of ×. */
    back?: boolean
  }>(),
  { closable: true, back: false },
)
const emit = defineEmits<{ close: []; back: [] }>()

const { t } = useTypedT()
</script>

<template>
  <div class="flex flex-col">
    <div v-if="kind === 'sheet'" data-test="sheet-grabber" class="mx-auto mt-2 h-1 w-9 rounded-full bg-border" aria-hidden="true" />
    <div class="flex min-h-12 items-center gap-1 pl-2 pr-2 pt-2" :class="{ 'pl-5': !back }">
      <button
        v-if="back"
        type="button"
        data-test="overlay-back"
        :aria-label="t('sheetHeader.back')"
        class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        @click="emit('back')"
      >
        <ArrowLeft :size="20" aria-hidden="true" />
      </button>
      <h2 :id="titleId" class="flex-1 font-semibold text-ink" :class="kind === 'sheet' ? 'text-lg' : 'text-base'">
        {{ title }}
      </h2>
      <button
        v-if="closable && !back"
        type="button"
        data-test="overlay-close"
        :aria-label="t('sheetHeader.close')"
        class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        @click="emit('close')"
      >
        <X :size="20" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
