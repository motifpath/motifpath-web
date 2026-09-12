<script setup lang="ts">
import RegisteringNotice from '@/features/auth/components/RegisteringNotice.vue'
import RegistrationFailedNotice from '@/features/auth/components/RegistrationFailedNotice.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useCurrentUserStore } from '@/stores/currentUser'

const { isLoaded, isSignedIn } = useAuth()
const currentUser = useCurrentUserStore()
</script>

<template>
  <section class="flex flex-col items-start gap-4">
    <h1 class="text-2xl font-semibold text-accent-text">MotifPath</h1>

    <StateLoading v-if="!isLoaded" data-test="loading" />

    <template v-else-if="isSignedIn && currentUser.isRegistered">
      <p class="text-ink-muted">You're signed in.</p>
      <PrimaryButton as="RouterLink" :to="{ name: 'path' }">Go to my path</PrimaryButton>
    </template>

    <RegistrationFailedNotice v-else-if="isSignedIn && currentUser.state === 'failed'" />

    <RegisteringNotice v-else-if="isSignedIn" />

    <template v-else>
      <p class="text-ink-muted">Sign in to start practising.</p>
      <PrimaryButton as="RouterLink" :to="{ name: 'sign-in' }">Sign in</PrimaryButton>
    </template>
  </section>
</template>
