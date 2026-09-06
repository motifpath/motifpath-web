<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SignIn } from '@clerk/vue'

import { readRedirectQuery } from '@/features/auth/utils/redirectQuery'

const route = useRoute()
const router = useRouter()

// The guard preserves the visitor's original destination as ?redirect= on
// this route. Every entry still goes through the registering route first
// (registration bridge), so the target is forwarded as that route's own
// ?redirect= rather than handed straight to Clerk. Resolved via the named
// route, not a hardcoded path, per this repo's CLAUDE.md.
const welcomeUrl = computed(() => {
  const redirect = readRedirectQuery(route.query.redirect)
  return router.resolve({ name: 'registering', query: redirect ? { redirect } : undefined }).href
})
</script>

<template>
  <main class="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
    <div class="flex flex-col items-center gap-1">
      <span class="text-lg font-semibold text-motif-blue">MotifPath</span>
      <p class="text-sm text-motif-ink/60">Sign in to start practising.</p>
    </div>

    <SignIn :force-redirect-url="welcomeUrl" :sign-up-force-redirect-url="welcomeUrl" />
  </main>
</template>
