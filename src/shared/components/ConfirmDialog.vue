<script setup lang="ts">
import { useId } from 'vue'

import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    confirmLabel: string
    /** Disables the confirm button while the confirmed action runs. */
    busy?: boolean
  }>(),
  { busy: false },
)
const emit = defineEmits<{ confirm: []; cancel: [] }>()

const { t } = useTypedT()
const titleId = useId()
</script>

<template>
  <ModalOverlay
    :open="open"
    panel-class="flex w-[min(440px,calc(100vw-32px))] flex-col gap-4 rounded-xl bg-surface-raised p-5 shadow-level2"
    @close="emit('cancel')"
  >
    <div role="alertdialog" aria-modal="true" :aria-labelledby="titleId" class="flex flex-col gap-4">
      <h2 :id="titleId" class="text-base font-bold text-ink">{{ title }}</h2>
      <p class="text-sm text-ink-muted">{{ message }}</p>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          data-test="confirm-dialog-cancel"
          class="rounded-md border border-border bg-surface-raised px-3.5 py-2 text-[0.8125rem] font-semibold text-ink"
          @click="emit('cancel')"
        >
          {{ t('confirmDialog.cancel') }}
        </button>
        <button
          type="button"
          data-test="confirm-dialog-confirm"
          :disabled="busy"
          class="rounded-md bg-accent px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-fg disabled:cursor-not-allowed disabled:opacity-60"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </ModalOverlay>
</template>
