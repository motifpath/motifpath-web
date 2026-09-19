<script setup lang="ts">
import { useTypedT } from '@/shared/composables/useTypedT'
import { useCurrentUserStore } from '@/stores/currentUser'
import type { MessageKey } from '@/i18n'
import type { SupportedLocale } from '@/i18n'

interface LocaleOption {
  code: SupportedLocale
  labelKey: MessageKey
}

const options: LocaleOption[] = [
  { code: 'en', labelKey: 'localeSwitcher.en' },
  { code: 'pt-BR', labelKey: 'localeSwitcher.ptBr' },
]

const { t } = useTypedT()
const currentUser = useCurrentUserStore()

function select(code: SupportedLocale): void {
  void currentUser.setLocale(code)
}
</script>

<template>
  <div data-test="locale-switcher" role="group" :aria-label="t('localeSwitcher.label')">
    <p class="px-2.5 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
      {{ t('localeSwitcher.label') }}
    </p>
    <div class="flex gap-1 px-2.5 pb-1.5">
      <button
        v-for="option in options"
        :key="option.code"
        type="button"
        :data-test="`locale-option-${option.code}`"
        :aria-pressed="currentUser.locale === option.code"
        class="rounded-md px-2 py-1 text-sm"
        :class="
          currentUser.locale === option.code
            ? 'bg-accent-muted font-semibold text-accent-text'
            : 'text-ink-muted hover:text-accent-text'
        "
        @click="select(option.code)"
      >
        {{ t(option.labelKey) }}
      </button>
    </div>
  </div>
</template>
