<script setup lang="ts">
import RegistrationFailedNotice from '@/features/auth/components/RegistrationFailedNotice.vue'
import { useRegistrationRedirect } from '@/features/auth/composables/useRegistrationRedirect'

// This route is only ever reached with registration genuinely 'failed' —
// the guard itself now redirects here only for that state (and away again
// to /welcome for any other), so there's no "reached before App.vue's
// watcher ran" case left to defend against, unlike RegisteringView.
//
// Handles moving on once a retry succeeds (or the visitor signs out while
// sitting here) — nothing else re-evaluates the guard on this route.
useRegistrationRedirect()
</script>

<template>
  <section class="flex flex-col items-start gap-4">
    <h1 class="text-2xl font-semibold text-accent-text">MotifPath</h1>
    <RegistrationFailedNotice />
  </section>
</template>
