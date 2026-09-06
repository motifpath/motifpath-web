<script setup lang="ts">
import RegisteringNotice from '@/features/auth/components/RegisteringNotice.vue'
import { useRegistrationRedirect } from '@/features/auth/composables/useRegistrationRedirect'
import { useCurrentUserStore } from '@/stores/currentUser'

const currentUser = useCurrentUserStore()

// Defensive: normally App.vue already triggered this on sign-in, but a direct
// or reloaded visit to this route may land here before that watcher has run.
// Safe to call unconditionally — ensure() itself no-ops once registered or
// failed, and reuses the in-flight attempt if one is already running.
void currentUser.ensure()

useRegistrationRedirect()
</script>

<template>
  <section class="flex flex-col items-start gap-4">
    <h1 class="text-2xl font-semibold text-motif-blue">MotifPath</h1>
    <RegisteringNotice test-id="loading" />
  </section>
</template>
