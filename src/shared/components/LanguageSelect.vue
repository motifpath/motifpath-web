<script setup lang="ts">
import { OFFERED_LANGUAGE_CODES } from '@/i18n'
import { useTypedT } from '@/shared/composables/useTypedT'
import { languageLabelKey } from '@/shared/utils/languageLabels'

withDefaults(
  defineProps<{
    /** Offers an empty choice with this label, emitted as null; omit to require a language. */
    emptyLabel?: string
    disabled?: boolean
  }>(),
  { emptyLabel: undefined, disabled: false },
)

/** A Language.code, or null for the empty choice. */
const languageCode = defineModel<string | null>({ required: true })

const { t } = useTypedT()

function label(code: string): string {
  const key = languageLabelKey(code)
  return key ? t(key) : code
}

function onChange(event: Event) {
  if (!(event.target instanceof HTMLSelectElement)) return
  languageCode.value = event.target.value || null
}
</script>

<template>
  <select
    :value="languageCode ?? ''"
    :disabled="disabled"
    class="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm disabled:cursor-not-allowed"
    @change="onChange"
  >
    <option v-if="emptyLabel !== undefined" value="">{{ emptyLabel }}</option>
    <option v-for="code in OFFERED_LANGUAGE_CODES" :key="code" :value="code">{{ label(code) }}</option>
  </select>
</template>
