<script setup lang="ts">
import RegistrationFailedNotice from '@/features/auth/components/RegistrationFailedNotice.vue'
import { useRegistrationRedirect } from '@/features/auth/composables/useRegistrationRedirect'

// Handles moving on once a retry succeeds (or the visitor signs out while
// sitting here) — nothing else re-evaluates the guard on this route.
useRegistrationRedirect()
</script>

<template>
  <section class="flex flex-col items-start gap-4">
    <h1 class="text-2xl font-semibold text-motif-blue">MotifPath</h1>
    <RegistrationFailedNotice />
  </section>
</template>
