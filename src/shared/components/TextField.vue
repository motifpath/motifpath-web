<script setup lang="ts">
/**
 * A labelled single-line text input. An error replaces nothing: it shows under the input, is
 * announced with it, and marks it invalid.
 */
import { onMounted, useId, useTemplateRef } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    error?: string
    autofocus?: boolean
    autocomplete?: string
  }>(),
  { error: '', autofocus: false, autocomplete: undefined },
)
const model = defineModel<string>({ required: true })

const inputId = useId()
const errorId = useId()
const input = useTemplateRef<HTMLInputElement>('input')

onMounted(() => {
  if (props.autofocus) input.value?.focus()
})
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="inputId" class="text-sm font-semibold text-ink">{{ label }}</label>
    <input
      :id="inputId"
      ref="input"
      v-model="model"
      type="text"
      :autocomplete="autocomplete"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? errorId : undefined"
      class="min-h-12 rounded-md border bg-surface-raised px-4 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      :class="error ? 'border-danger' : 'border-border'"
    />
    <p v-if="error" :id="errorId" data-test="text-field-error" class="text-sm text-danger">{{ error }}</p>
  </div>
</template>
