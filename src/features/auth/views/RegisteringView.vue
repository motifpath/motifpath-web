<script setup lang="ts">
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useCurrentUserStore } from '@/stores/currentUser'

const route = useRoute()
const router = useRouter()
const currentUser = useCurrentUserStore()

// Defensive: normally App.vue already triggered this on sign-in, but a direct
// or reloaded visit to this route may land here before that watcher has run.
void currentUser.ensure()

watch(
  () => currentUser.state,
  (state) => {
    if (state === 'registered') {
      const redirect =
        typeof route.query.redirect === 'string' && route.query.redirect.length > 0
          ? route.query.redirect
          : undefined
      void router.push(redirect ?? { name: 'path' })
    } else if (state === 'failed') {
      void router.push({ name: 'registration-error' })
    }
  },
  { immediate: true },
)
</script>

<template>
  <section class="flex flex-col items-start gap-4">
    <h1 class="text-2xl font-semibold text-motif-blue">MotifPath</h1>
    <p data-test="loading" class="text-motif-ink/60">Setting up your account…</p>
  </section>
</template>
