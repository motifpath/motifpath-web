<script setup lang="ts">
import { useTypedT } from '@/shared/composables/useTypedT'
import { useCurrentUserStore } from '@/stores/currentUser'
import type { MessageKey } from '@/i18n'
import type { SupportedLocale } from '@/i18n'

interface LocaleOption {
  code: SupportedLocale
  labelKey: MessageKey
  flag: string
}

const options: LocaleOption[] = [
  { code: 'en', labelKey: 'localeSwitcher.en', flag: '🇺🇸' },
  { code: 'pt-BR', labelKey: 'localeSwitcher.ptBr', flag: '🇧🇷' },
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
        :aria-label="t(option.labelKey)"
        :aria-pressed="currentUser.locale === option.code"
        class="rounded-md px-1.5 py-1 text-base leading-none"
        :class="
          currentUser.locale === option.code
            ? 'bg-accent-muted ring-1 ring-inset ring-accent-text'
            : 'opacity-60 hover:opacity-100'
        "
        @click="select(option.code)"
      >
        <span aria-hidden="true">{{ option.flag }}</span>
      </button>
    </div>
  </div>
</template>
