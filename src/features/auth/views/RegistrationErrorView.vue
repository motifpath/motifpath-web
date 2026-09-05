<script setup lang="ts">
import RegistrationFailedNotice from '@/features/auth/components/RegistrationFailedNotice.vue'
import { useRegistrationRedirect } from '@/features/auth/composables/useRegistrationRedirect'
import { ensureIfIdle } from '@/features/auth/utils/ensureIfIdle'
import { useCurrentUserStore } from '@/stores/currentUser'

const currentUser = useCurrentUserStore()

// Defensive: this route is normally only reached once state has already
// settled to 'failed'. But that relies on App.vue's own watcher having run
// first — an implicit ordering assumption, not a guaranteed one. Only acts
// when idle — never restarts an already-in-flight or genuinely failed
// attempt. "Try again" is the retry, not a silent one here.
ensureIfIdle(currentUser)

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
