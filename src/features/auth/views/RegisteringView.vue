<script setup lang="ts">
import { useRegistrationRedirect } from '@/features/auth/composables/useRegistrationRedirect'
import { useCurrentUserStore } from '@/stores/currentUser'

const currentUser = useCurrentUserStore()

// Defensive: normally App.vue already triggered this on sign-in, but a direct
// or reloaded visit to this route may land here before that watcher has run.
void currentUser.ensure()

useRegistrationRedirect()
</script>

<template>
  <section class="flex flex-col items-start gap-4">
    <h1 class="text-2xl font-semibold text-motif-blue">MotifPath</h1>
    <p data-test="loading" class="text-motif-ink/60">Setting up your account…</p>
  </section>
</template>
