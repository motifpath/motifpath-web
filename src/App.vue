<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import { updateClerkOptions } from '@clerk/vue'
import { RouterView } from 'vue-router'

import { updateAuthBridge, updateRegistrationBridge, updateRoleBridge } from '@/features/auth/authBridge'
import { useAuth } from '@/features/auth/composables/useAuth'
import { i18n, type SupportedLocale } from '@/i18n'
import ToastStack from '@/shared/components/ToastStack.vue'
import { isNativeApp } from '@/shared/platform/platform'
import { holdSplashUntilReady } from '@/shared/platform/splashScreen'
import { followThemeWithSystemBars } from '@/shared/platform/systemBars'
import { loadClerkLocalization } from '@/shared/utils/clerkLocalization'
import { useCurrentUserStore } from '@/stores/currentUser'
import { useThemeStore } from '@/stores/theme'

const { isLoaded, isSignedIn, getToken } = useAuth()
const currentUser = useCurrentUserStore()
const themeStore = useThemeStore()

// Inside the app shell the launch screen and the system bars are the app's own. The first screen
// can render once sign-in is known and, for a signed-in student, once their account is known
// (registered, or failed, which the screen shows in place).
if (isNativeApp()) {
  const firstScreenReady = computed(
    () => isLoaded.value && (!isSignedIn.value || currentUser.state === 'registered' || currentUser.state === 'failed'),
  )
  holdSplashUntilReady(firstScreenReady)
  followThemeWithSystemBars(computed(() => themeStore.theme))
}

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
  <!--
    Keyed by path (not fullPath, so query-only changes don't remount): Vue
    Router reuses a component instance across navigations that resolve to the
    same route record with only a param changing (e.g. /teacher/content/A/edit
    -> /teacher/content/B/edit). Several authoring views capture their :id
    param once at setup and never re-derive it, so without this key they'd
    silently keep editing the previous id while the URL shows the new one.
  -->
  <RouterView v-slot="{ Component }">
    <component :is="Component" :key="$route.path" />
  </RouterView>
  <ToastStack />
</template>
