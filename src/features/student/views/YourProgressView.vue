<script setup lang="ts">
/**
 * Your progress: a page pushed onto the home, so Back returns to the home where the student left
 * it. Opened directly, with no page behind it, Back goes to the home instead.
 */
import { useRouter } from 'vue-router'

import Icon from '@/shared/components/Icon.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const { t } = useTypedT()
const router = useRouter()

function goBack() {
  if (router.options.history.state.back) router.back()
  else void router.push({ name: 'home' })
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <header class="flex items-center gap-2">
      <button
        type="button"
        data-test="your-progress-back"
        class="-ml-3 flex h-12 w-12 items-center justify-center rounded-full text-ink hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        :aria-label="t('yourProgressView.back')"
        @click="goBack"
      >
        <Icon name="chevron-left" :size="24" />
      </button>
      <h1 class="text-lg font-semibold text-ink">{{ t('yourProgressView.title') }}</h1>
    </header>
    <p class="text-sm text-ink-muted">{{ t('yourProgressView.comingSoon') }}</p>
  </section>
</template>
