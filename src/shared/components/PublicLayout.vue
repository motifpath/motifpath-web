<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'

import { useAuth } from '@/features/auth/composables/useAuth'
import AppShell from '@/shared/components/AppShell.vue'
import LearnerShell from '@/shared/components/LearnerShell.vue'
import { useCurrentUserStore } from '@/stores/currentUser'

const { isSignedIn } = useAuth()
const currentUser = useCurrentUserStore()

// Once signed in and registered, the public pages (Home included) sit in the same App Shell as the
// rest of the app; before that there is no learner navigation, only the signed-out header.
const inAppShell = computed(() => isSignedIn.value && currentUser.isRegistered && !!currentUser.profile)
</script>

<template>
  <LearnerShell v-if="inAppShell">
    <RouterView />
  </LearnerShell>

  <AppShell v-else>
    <RouterView />
  </AppShell>
</template>
