<script setup lang="ts">
/**
 * Where Google sends a visitor back. Clerk finishes the sign-in or sign-up and sends them on: to set
 * the account up, to the name step when Google gave no full name, or back to the landing when
 * Google's sign-in didn't finish. Where the visitor was heading travels with every outcome. The
 * landing stays on screen meanwhile, its button busy once this takes 300 ms.
 */
import { AuthenticateWithRedirectCallback } from '@clerk/vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import LandingScreen from '@/features/auth/components/LandingScreen.vue'
import { readRedirectQuery } from '@/features/auth/utils/redirectQuery'
import { useShownAfter } from '@/shared/composables/useShownAfter'

const route = useRoute()
const router = useRouter()
const busy = useShownAfter(300)

const urls = computed(() => {
  const redirect = readRedirectQuery(route.query.redirect)
  const keep = redirect ? { redirect } : {}
  const setUp = router.resolve({ name: 'registering', query: keep }).href
  const unfinished = router.resolve({ name: 'home', query: { google: 'unfinished', ...keep } }).href
  return {
    signInForceRedirectUrl: setUp,
    signUpForceRedirectUrl: setUp,
    continueSignUpUrl: router.resolve({ name: 'name-step', query: keep }).href,
    signInUrl: unfinished,
    signUpUrl: unfinished,
  }
})
</script>

<template>
  <LandingScreen :busy="busy" />
  <AuthenticateWithRedirectCallback v-bind="urls" />
</template>
