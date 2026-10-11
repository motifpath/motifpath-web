<script setup lang="ts">
import AccountBridge from '@/features/auth/components/AccountBridge.vue'
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
  <AccountBridge />
</template>
