<script setup lang="ts">
/**
 * The diagram embed picker in its own modal, for a rich-text editor's
 * "insert diagram" and "edit diagram". Rendered at the document body, since
 * the editor itself can sit inside another modal.
 */
import { ref, watch } from 'vue'

import DiagramEmbedPicker from '@/features/teacher/components/DiagramEmbedPicker.vue'
import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { components } from '@/api/generated/core-domain'

type DiagramRef = components['schemas']['DiagramRef']

const props = defineProps<{
  open: boolean
  /** The embedded ref to reopen, or null to start from the list. */
  initial: DiagramRef | null
  /** Whether this replaces an embedded diagram rather than inserting a new one — true even
   *  when there's no ref to reopen, such as a stack. */
  editing: boolean
}>()
const emit = defineEmits<{
  apply: [diagramRef: DiagramRef]
  close: []
}>()

const { t } = useTypedT()

const chosen = ref<DiagramRef | null>(null)
watch(
  () => props.open,
  () => {
    chosen.value = null
  },
)

function apply() {
  if (chosen.value) emit('apply', chosen.value)
}
</script>

<template>
  <ModalOverlay
    :open="open"
    panel-class="flex h-[85vh] w-[720px] max-w-[92vw] flex-col gap-4 rounded-xl bg-surface-raised p-5 shadow-level2"
    @close="emit('close')"
  >
    <div class="flex items-center justify-between">
      <span data-test="embed-picker-title" class="text-base font-bold">
        {{ editing ? t('diagramEmbedPicker.editTitle') : t('diagramEmbedPicker.insertTitle') }}
      </span>
      <ModalCloseButton @close="emit('close')" />
    </div>

    <!-- A fixed-height panel with only this part scrolling, so filtering or configuring never resizes the modal. -->
    <div class="min-h-0 flex-1 overflow-y-auto">
      <DiagramEmbedPicker :initial="initial" @change="chosen = $event" />
    </div>

    <div class="flex justify-end gap-2 border-t border-border pt-4">
      <button
        type="button"
        data-test="embed-picker-cancel"
        class="rounded-md border border-border bg-surface-raised px-3.5 py-2 text-[0.8125rem] font-semibold"
        @click="emit('close')"
      >
        {{ t('diagramEmbedPicker.cancel') }}
      </button>
      <button
        type="button"
        data-test="embed-picker-apply"
        :disabled="!chosen"
        class="rounded-md bg-accent px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-fg disabled:cursor-not-allowed disabled:opacity-60"
        @click="apply"
      >
        {{ editing ? t('diagramEmbedPicker.apply') : t('diagramEmbedPicker.insert') }}
      </button>
    </div>
  </ModalOverlay>
</template>
