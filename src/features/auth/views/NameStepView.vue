<script setup lang="ts">
/**
 * Where Clerk sends a sign-up that cannot finish without a full name, before any session exists.
 * Continue completes the sign-up and goes on to set the account up; with no sign-up waiting, there is
 * nothing to do here.
 */
import { watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import LandingLayout from '@/features/auth/components/LandingLayout.vue'
import LandingScreen from '@/features/auth/components/LandingScreen.vue'
import NameStepForm from '@/features/auth/components/NameStepForm.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { readRedirectQuery } from '@/features/auth/utils/redirectQuery'
import { routeWithRedirect } from '@/features/auth/utils/routeWithRedirect'

const route = useRoute()
const router = useRouter()
const { isLoaded, pendingSignUp, completeSignUpName } = useAuth()

watchEffect(() => {
  if (isLoaded.value && !pendingSignUp.value) void router.replace({ name: 'home' })
})

async function completeAndContinue(firstName: string, lastName: string) {
  await completeSignUpName(firstName, lastName)
  await router.replace(routeWithRedirect('registering', readRedirectQuery(route.query.redirect)))
}
</script>

<template>
  <LandingLayout v-if="pendingSignUp">
    <NameStepForm :initial="pendingSignUp" :submit="completeAndContinue" />
  </LandingLayout>
  <LandingScreen v-else busy />
</template>
