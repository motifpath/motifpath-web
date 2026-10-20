<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'

import { useAuth } from '@/features/auth/composables/useAuth'
import LearnerShell from '@/shared/components/LearnerShell.vue'
import { useCurrentUserStore } from '@/stores/currentUser'

const { isSignedIn } = useAuth()
const currentUser = useCurrentUserStore()

// Once signed in and registered, the public pages (Home included) sit in the same App Shell as the
// rest of the app. Before that there is no shell at all: the landing and every step while the
// account is set up bring their own layout.
const inAppShell = computed(() => isSignedIn.value && currentUser.isRegistered && !!currentUser.profile)
</script>

<template>
  <LearnerShell v-if="inAppShell">
    <RouterView />
  </LearnerShell>

  <RouterView v-else />
</template>
