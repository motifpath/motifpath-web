<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useTypedT } from '@/shared/composables/useTypedT'

const { t } = useTypedT()
</script>

<template>
  <section class="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
    <p class="text-4xl font-semibold text-accent-text">404</p>
    <p class="text-ink-muted">{{ t('notFoundView.message') }}</p>
    <RouterLink :to="{ name: 'home' }" class="text-sm text-accent-text hover:underline">
      {{ t('notFoundView.backToHome') }}
    </RouterLink>
  </section>
</template>
