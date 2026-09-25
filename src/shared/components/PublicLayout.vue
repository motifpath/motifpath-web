<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'

import { useAuth } from '@/features/auth/composables/useAuth'
import AppBar from '@/shared/components/AppBar.vue'
import AppShell from '@/shared/components/AppShell.vue'
import { useIsCompact } from '@/shared/composables/useIsCompact'
import { useCurrentUserStore } from '@/stores/currentUser'

const { isSignedIn } = useAuth()
const currentUser = useCurrentUserStore()
const { isCompact } = useIsCompact()

// Once signed in and registered, the public pages (home included) get the
// same app bar as the rest of the app — logo, every section the user's role
// can reach, and the hamburger menu on a narrow screen — instead of the
// signed-out header.
const hasAppBar = computed(
  () => isSignedIn.value && currentUser.isRegistered && !!currentUser.profile,
)
</script>

<template>
  <div v-if="hasAppBar" class="flex min-h-screen flex-col">
    <AppBar context="overview" :compact="isCompact" />

    <main class="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <RouterView />
    </main>
  </div>

  <AppShell v-else>
    <RouterView />
  </AppShell>
</template>
