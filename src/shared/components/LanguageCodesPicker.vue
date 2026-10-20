<script setup lang="ts">
import { Check } from 'lucide-vue-next'

import { OFFERED_LANGUAGE_CODES } from '@/i18n'
import { useTypedT } from '@/shared/composables/useTypedT'
import { languageLabelKey } from '@/shared/utils/languageLabels'

withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false })

/**
 * The chosen Language.codes: ['any'] for language-agnostic content, otherwise
 * one or more languages. Never empty — the API rejects an empty set, so
 * removing the last language goes back to ['any'].
 */
const languageCodes = defineModel<string[]>({ required: true })

const ANY = 'any'
const { t } = useTypedT()

const isAny = () => languageCodes.value.includes(ANY)

function label(code: string): string {
  const key = languageLabelKey(code)
  return key ? t(key) : code
}

function toggle(code: string) {
  const chosen = languageCodes.value.filter((c) => c !== ANY)
  const next = chosen.includes(code) ? chosen.filter((c) => c !== code) : [...chosen, code]
  languageCodes.value = next.length > 0 ? next : [ANY]
}

function chipClass(chosen: boolean): string {
  return chosen ? 'border-accent bg-accent text-accent-fg' : 'border-border bg-surface text-ink-muted'
}
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      type="button"
      data-test="language-any"
      :aria-pressed="isAny() ? 'true' : 'false'"
      :disabled="disabled"
      class="flex items-center gap-1 rounded-full border px-3 py-1 text-sm disabled:cursor-not-allowed"
      :class="chipClass(isAny())"
      @click="languageCodes = [ANY]"
    >
      <Check v-if="isAny()" :size="14" aria-hidden="true" />
      {{ t('languageCodesPicker.any') }}
    </button>
    <button
      v-for="code in OFFERED_LANGUAGE_CODES"
      :key="code"
      type="button"
      :data-test="`language-option-${code}`"
      :aria-pressed="languageCodes.includes(code) ? 'true' : 'false'"
      :disabled="disabled"
      class="flex items-center gap-1 rounded-full border px-3 py-1 text-sm disabled:cursor-not-allowed"
      :class="chipClass(languageCodes.includes(code))"
      @click="toggle(code)"
    >
      <Check v-if="languageCodes.includes(code)" :size="14" aria-hidden="true" />
      {{ label(code) }}
    </button>
  </div>
</template>
