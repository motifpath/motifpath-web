<script setup lang="ts">
/**
 * Everything a visitor sees before they're in the app keeps this one layout — the landing and every
 * step while their account is set up — so they never see a blank page or a different screen. No
 * app navigation: the small mark and name on top, the screen's content in the middle, the language
 * at the bottom. On a wide screen a brand panel stands beside the same column.
 */
import BrandMark from '@/shared/components/BrandMark.vue'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { SupportedLocale } from '@/i18n'
import { useCurrentUserStore } from '@/stores/currentUser'

const { t } = useTypedT()
const { sizeClass } = useSizeClass()
const currentUser = useCurrentUserStore()

// Each language is named in itself, so a visitor who can't read the current one still finds theirs.
const OTHER: Record<SupportedLocale, { locale: SupportedLocale; name: string }> = {
  en: { locale: 'pt-BR', name: 'Português (Brasil)' },
  'pt-BR': { locale: 'en', name: 'English' },
}
</script>

<template>
  <div class="flex min-h-screen bg-surface" :class="{ 'items-stretch': sizeClass === 'expanded' }">
    <aside
      v-if="sizeClass === 'expanded'"
      data-test="landing-brand-panel"
      class="flex flex-1 items-center justify-center bg-brand-ground"
    >
      <BrandMark size="xl" />
    </aside>

    <div
      class="mx-auto flex min-h-screen w-full flex-col px-4 py-5"
      :class="sizeClass === 'compact' ? '' : 'max-w-[26.25rem]'"
    >
      <header class="flex items-center gap-2">
        <BrandMark size="sm" />
        <span class="text-base font-semibold text-ink">{{ t('appBar.brand') }}</span>
      </header>

      <main class="flex flex-1 flex-col justify-center gap-5 py-8">
        <slot />
      </main>

      <footer class="flex justify-center">
        <button
          type="button"
          data-test="landing-language"
          :lang="OTHER[currentUser.locale].locale"
          class="inline-flex min-h-12 items-center px-3 text-sm font-semibold text-accent-text"
          @click="currentUser.setLocale(OTHER[currentUser.locale].locale)"
        >
          {{ OTHER[currentUser.locale].name }}
        </button>
      </footer>
    </div>
  </div>
</template>
