<script setup lang="ts">
/**
 * Asks for the names of a new diagram saved from the one being edited —
 * "Save as…" (a custom copy, in the languages it is named in) or, for admins,
 * "Save as template…" (a basic diagram, named in every language). Only
 * collects the names; the caller does the saving.
 */
import { computed, ref, watch } from 'vue'

import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { languageLabelKey } from '@/shared/utils/languageLabels'

const props = defineProps<{
  open: boolean
  /** The Language.code of every language to ask a name in, in display order. */
  languages: string[]
  initialNames: Record<string, string>
  asTemplate: boolean
  saving: boolean
}>()
const emit = defineEmits<{ confirm: [names: Record<string, string>]; close: [] }>()

const { t } = useTypedT()

function suggestedNames(): Record<string, string> {
  return Object.fromEntries(props.languages.map((code) => [code, props.initialNames[code] ?? '']))
}

const names = ref<Record<string, string>>(suggestedNames())
watch(
  () => props.open,
  (open) => {
    if (open) names.value = suggestedNames()
  },
)

function languageLabel(code: string): string {
  const key = languageLabelKey(code)
  return key === null ? code : t(key)
}

const canConfirm = computed(
  () => !props.saving && props.languages.every((code) => (names.value[code] ?? '').trim() !== ''),
)

function confirm() {
  if (!canConfirm.value) return
  emit('confirm', Object.fromEntries(props.languages.map((code) => [code, (names.value[code] ?? '').trim()])))
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

      <div class="flex flex-col gap-3 p-5">
        <div v-for="code in languages" :key="code" class="flex flex-col gap-1.5">
          <label :for="`save-as-name-${code}`" class="text-sm font-semibold">
            {{ t('saveDiagramAsModal.nameLabel') }} ({{ languageLabel(code) }})
          </label>
          <input
            :id="`save-as-name-${code}`"
            v-model="names[code]"
            type="text"
            :data-test="`save-as-name-${code}`"
            class="rounded-md border border-border bg-surface px-3 py-2 text-sm"
          />
        </div>
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
