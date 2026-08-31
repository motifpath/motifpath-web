<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { useAuth } from '@/features/auth/composables/useAuth'

const { isLoaded, isSignedIn } = useAuth()
</script>

<template>
  <section class="flex flex-col items-start gap-4">
    <h1 class="text-2xl font-semibold text-motif-blue">MotifPath</h1>

    <p v-if="!isLoaded" data-test="loading" class="text-motif-ink/60">Loading…</p>

    <template v-else-if="isSignedIn">
      <p class="text-motif-ink/70">You're signed in.</p>
      <RouterLink
        :to="{ name: 'path' }"
        class="rounded bg-motif-blue px-4 py-2 text-sm text-motif-blue-fg"
      >
        Go to my path
      </RouterLink>
    </template>

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
