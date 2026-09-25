<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'

import { useAuth } from '@/features/auth/composables/useAuth'
import AppShell from '@/shared/components/AppShell.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { sectionsFor } from '@/shared/navigation'
import { useCurrentUserStore } from '@/stores/currentUser'

const { isSignedIn } = useAuth()
const currentUser = useCurrentUserStore()
const { t } = useTypedT()

// Once signed in and registered, the public pages (home included) link to
// every section the user's role can reach, so they never end in a dead end.
const nav = computed(() => {
  const role = currentUser.profile?.role
  if (!isSignedIn.value || !currentUser.isRegistered || !role) return []
  return sectionsFor(role).map((section) => ({
    to: { name: section.name },
    label: t(section.labelKey),
  }))
})
</script>

<template>
  <AppShell :nav="nav">
    <RouterView />
  </AppShell>
</template>
