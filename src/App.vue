<script setup lang="ts">
import { watch, watchEffect } from 'vue'
import { updateClerkOptions } from '@clerk/vue'
import { RouterView } from 'vue-router'

import { updateAuthBridge, updateRegistrationBridge, updateRoleBridge } from '@/features/auth/authBridge'
import { useAuth } from '@/features/auth/composables/useAuth'
import { i18n } from '@/i18n'
import ToastStack from '@/shared/components/ToastStack.vue'
import { loadClerkLocalization } from '@/shared/utils/clerkLocalization'
import { useCurrentUserStore } from '@/stores/currentUser'

const { isLoaded, isSignedIn, getToken } = useAuth()
const currentUser = useCurrentUserStore()

// `main.ts` only sets Clerk's *initial* localization — Clerk itself has no
// reactive prop for it, so this keeps it in sync with later in-app locale
// changes via `updateClerkOptions`, which reaches into Clerk's already-mounted
// UI directly instead of needing a remount. Skipped before Clerk has loaded:
// its instance doesn't exist yet, and the initial value is already correct.
watch(i18n.global.locale, (locale) => {
  if (!isLoaded.value) return
  void loadClerkLocalization(locale).then((localization) => {
    updateClerkOptions({ localization })
  })
})

watchEffect(() => {
  updateAuthBridge({
    isLoaded: isLoaded.value,
    isSignedIn: isSignedIn.value,
    getToken,
  })
})

watchEffect(() => {
  updateRegistrationBridge(currentUser.state)
})

watchEffect(() => {
  updateRoleBridge(currentUser.profile?.role ?? null)
})

watch(
  isSignedIn,
  (signedIn) => {
    if (signedIn) {
      void currentUser.ensure()
    } else {
      currentUser.reset()
    }
  },
  { immediate: true },
)
</script>

<template>
  <RouterView />
  <ToastStack />
</template>
