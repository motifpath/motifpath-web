<script setup lang="ts">
import { useId } from 'vue'

import AppButton from '@/shared/components/AppButton.vue'
import OverlayLayer from '@/shared/components/OverlayLayer.vue'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'

withDefaults(
  defineProps<{
    open: boolean
    /** "Verb the thing?" */
    title: string
    /** One sentence: what is lost, and what stays. */
    message: string
    /** The verb itself ("Leave course"), never "OK" or "Yes". */
    confirmLabel: string
    /** The safe choice; "Cancel" unless the screen has a better word for staying. */
    cancelLabel?: string
    /** Disables the confirm button while the confirmed action runs. */
    busy?: boolean
  }>(),
  { cancelLabel: undefined, busy: false },
)
const emit = defineEmits<{ confirm: []; cancel: [] }>()

const { t } = useTypedT()
const { isCompact } = useSizeClass()
const titleId = useId()
const messageId = useId()
</script>

<template>
  <!-- Only for what can't be undone. No ×, and a tap beside it isn't an answer; Esc (and Back)
       are the safe choice, which also holds focus first. -->
  <OverlayLayer :open="open" :close-on-scrim="false" :placement="isCompact ? 'bottom' : 'center'" @close="emit('cancel')">
    <div
      role="alertdialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="messageId"
      :data-test="isCompact ? 'overlay-sheet' : 'overlay-dialog'"
      class="flex flex-col gap-3 bg-surface-raised shadow-level3"
      :class="isCompact ? 'w-full rounded-t-xl px-5 pb-safe pt-2' : 'w-[min(25rem,calc(100vw-2rem))] rounded-xl p-5'"
    >
      <div v-if="isCompact" class="mx-auto mb-2 h-1 w-9 rounded-full bg-border" aria-hidden="true" />
      <h2 :id="titleId" class="text-lg font-semibold text-ink">{{ title }}</h2>
      <p :id="messageId" class="text-sm text-ink-muted">{{ message }}</p>
      <!-- Phone: destructive on top, safe at the bottom where the thumb rests, so a slip lands on
           the safe choice. Wider: safe left, destructive right. -->
      <div v-if="isCompact" class="mt-2 flex flex-col gap-2">
        <AppButton data-test="confirm-dialog-confirm" variant="destructive" block :busy="busy" @click="emit('confirm')">
          {{ confirmLabel }}
        </AppButton>
        <AppButton data-test="confirm-dialog-cancel" variant="secondary" block data-autofocus @click="emit('cancel')">
          {{ cancelLabel ?? t('confirmDialog.cancel') }}
        </AppButton>
      </div>
      <div v-else class="mt-2 flex justify-end gap-2">
        <AppButton data-test="confirm-dialog-cancel" variant="secondary" data-autofocus @click="emit('cancel')">
          {{ cancelLabel ?? t('confirmDialog.cancel') }}
        </AppButton>
        <AppButton data-test="confirm-dialog-confirm" variant="destructive" :busy="busy" @click="emit('confirm')">
          {{ confirmLabel }}
        </AppButton>
      </div>
    </div>
  </OverlayLayer>
</template>
