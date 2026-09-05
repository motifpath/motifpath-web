<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { useAuth } from '@/features/auth/composables/useAuth'
import { useCurrentUserStore } from '@/stores/currentUser'

const { isLoaded, isSignedIn } = useAuth()
const currentUser = useCurrentUserStore()
</script>

<template>
  <section class="flex flex-col items-start gap-4">
    <h1 class="text-2xl font-semibold text-motif-blue">MotifPath</h1>

    <p v-if="!isLoaded" data-test="loading" class="text-motif-ink/60">Loading…</p>

    <template v-else-if="isSignedIn && currentUser.isRegistered">
      <p class="text-motif-ink/70">You're signed in.</p>
      <RouterLink
        :to="{ name: 'path' }"
        class="rounded bg-motif-blue px-4 py-2 text-sm text-motif-blue-fg"
      >
        Go to my path
      </RouterLink>
    </template>

    <p v-else-if="isSignedIn" data-test="registering" class="text-motif-ink/60">
      Setting up your account…
    </p>

    <template v-else>
      <p class="text-motif-ink/70">Sign in to start practising.</p>
      <RouterLink
        :to="{ name: 'sign-in' }"
        class="rounded bg-motif-blue px-4 py-2 text-sm text-motif-blue-fg"
      >
        Sign in
      </RouterLink>
    </template>
  </section>
</template>
