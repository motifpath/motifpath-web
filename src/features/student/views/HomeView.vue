<script setup lang="ts">
import AccountBridge from '@/features/auth/components/AccountBridge.vue'
import LandingScreen from '@/features/auth/components/LandingScreen.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import RegisteredHome from '@/features/student/components/RegisteredHome.vue'
import { useCurrentUserStore } from '@/stores/currentUser'

const { isLoaded, isSignedIn } = useAuth()
const currentUser = useCurrentUserStore()
</script>

<template>
  <!-- Every signed-in user lands on their home, or its first run: every role can learn. -->
  <RegisteredHome v-if="isLoaded && isSignedIn && currentUser.isRegistered" />
  <!-- Signed in but not set up yet: the same bridge /welcome shows, on the landing's layout. -->
  <AccountBridge v-else-if="isLoaded && isSignedIn" />
  <!-- Signed out, or still finding out: the landing, never a blank page. -->
  <LandingScreen v-else />
</template>
