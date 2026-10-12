<script setup lang="ts">
import { ref, useId, watch } from 'vue'

import AppButton from '@/shared/components/AppButton.vue'
import OverlayPanel from '@/shared/components/OverlayPanel.vue'

/** One short line of text to set (a name, a label): a sheet on a phone, a dialog on anything wider. */
const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    label: string
    /** The text as it is now. */
    value: string
    confirmLabel: string
    hint?: string
    placeholder?: string
  }>(),
  { hint: undefined, placeholder: undefined },
)
const emit = defineEmits<{ confirm: [value: string]; close: [] }>()

const draft = ref(props.value)
const inputId = useId()

watch(
  () => props.open,
  (open) => {
    if (open) draft.value = props.value
  },
)

function confirm() {
  emit('confirm', draft.value.trim())
}
</script>

<template>
  <OverlayPanel :open="open" :title="title" @close="emit('close')">
    <form class="flex flex-col gap-2" @submit.prevent="confirm">
      <label :for="inputId" class="text-sm font-semibold text-ink">{{ label }}</label>
      <input
        :id="inputId"
        v-model="draft"
        data-test="text-entry-input"
        type="text"
        :placeholder="placeholder"
        class="h-12 rounded-xl border border-border bg-surface-sunken px-3 text-base text-ink"
      />
      <p v-if="hint" class="text-xs text-ink-muted">{{ hint }}</p>
    </form>
    <template #actions>
      <AppButton data-test="text-entry-confirm" block @click="confirm">{{ confirmLabel }}</AppButton>
    </template>
  </OverlayPanel>
</template>
