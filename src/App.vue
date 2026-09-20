<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue'
import { updateClerkOptions } from '@clerk/vue'
import { RouterView } from 'vue-router'

import { updateAuthBridge, updateRegistrationBridge, updateRoleBridge } from '@/features/auth/authBridge'
import { useAuth } from '@/features/auth/composables/useAuth'
import { i18n, type SupportedLocale } from '@/i18n'
import ToastStack from '@/shared/components/ToastStack.vue'
import { loadClerkLocalization } from '@/shared/utils/clerkLocalization'
import { useCurrentUserStore } from '@/stores/currentUser'

const { isLoaded, isSignedIn, getToken } = useAuth()
const currentUser = useCurrentUserStore()

// `main.ts` already synced this value, at Clerk's plugin-install time.
const lastSyncedClerkLocale = ref<SupportedLocale>(i18n.global.locale.value)

// `main.ts` only sets Clerk's *initial* localization — Clerk itself has no
// reactive prop for it, so this keeps it in sync with later in-app locale
// changes via `updateClerkOptions`, which reaches into Clerk's already-mounted
// UI directly instead of needing a remount. Depends on both the locale and
// `isLoaded`, not just the locale, so a locale change that happens before
// Clerk has finished loading — e.g. a signed-out visitor switching language
// on /sign-in while Clerk's SDK is still resolving — isn't dropped: it's
// caught up as soon as `isLoaded` itself flips true, instead of only ever
// being applied by a second, later locale change.
watchEffect(() => {
  const locale = i18n.global.locale.value
  if (!isLoaded.value || locale === lastSyncedClerkLocale.value) return

  loadClerkLocalization(locale)
    .then((localization) => {
      updateClerkOptions({ localization })
      lastSyncedClerkLocale.value = locale
    })
    .catch(() => {
      // Left unsynced — the next locale change (or the next time isLoaded
      // re-evaluates this effect) will retry, same as any other transient
      // chunk-load failure in this codebase's locale loaders.
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
