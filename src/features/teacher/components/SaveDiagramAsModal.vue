<script setup lang="ts">
/**
 * Asks for the name of a new diagram saved from the one being edited —
 * "Save as…" (a custom copy) or, for admins, "Save as template…" (a basic
 * one). Only collects the name; the caller does the saving.
 */
import { computed, ref, watch } from 'vue'

import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{
  open: boolean
  initialName: string
  asTemplate: boolean
  saving: boolean
}>()
const emit = defineEmits<{ confirm: [name: string]; close: [] }>()

const { t } = useTypedT()

const name = ref(props.initialName)
watch(
  () => props.open,
  (open) => {
    if (open) name.value = props.initialName
  },
)

const canConfirm = computed(() => name.value.trim() !== '' && !props.saving)

function confirm() {
  if (canConfirm.value) emit('confirm', name.value.trim())
}
</script>

<template>
  <ModalOverlay
    :open="open"
    panel-class="flex w-[440px] max-w-[95vw] flex-col overflow-hidden rounded-xl bg-surface-raised shadow-level2"
    @close="emit('close')"
  >
    <form data-test="save-as-form" class="flex flex-col" @submit.prevent="confirm">
      <div class="flex items-center justify-between border-b border-border px-5 py-[18px]">
        <span class="text-base font-bold text-ink">{{
          asTemplate ? t('saveDiagramAsModal.templateTitle') : t('saveDiagramAsModal.copyTitle')
        }}</span>
        <ModalCloseButton @close="emit('close')" />
      </div>

      <div class="flex flex-col gap-2 p-5">
        <label for="save-as-name" class="text-sm font-semibold">{{ t('saveDiagramAsModal.nameLabel') }}</label>
        <input
          id="save-as-name"
          v-model="name"
          type="text"
          data-test="save-as-name"
          class="rounded-md border border-border bg-surface px-3 py-2 text-sm"
        />
        <p class="text-sm text-ink-subtle">
          {{ asTemplate ? t('saveDiagramAsModal.templateHint') : t('saveDiagramAsModal.copyHint') }}
        </p>
      </div>

      <div class="flex justify-end gap-2 border-t border-border px-5 py-4">
        <button
          type="button"
          data-test="save-as-cancel"
          class="rounded-md border border-border px-3.5 py-2 text-sm font-semibold text-ink-muted"
          @click="emit('close')"
        >
          {{ t('saveDiagramAsModal.cancel') }}
        </button>
        <button
          type="submit"
          data-test="save-as-confirm"
          :disabled="!canConfirm"
          class="rounded-md bg-accent px-3.5 py-2 text-sm font-semibold text-accent-fg disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ t('saveDiagramAsModal.confirm') }}
        </button>
      </div>
    </form>
  </ModalOverlay>
</template>
