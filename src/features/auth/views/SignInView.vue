<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { SignIn } from '@clerk/vue'

const route = useRoute()

// The guard preserves the visitor's original destination as ?redirect= on
// this route. Every entry still goes through /welcome first (registration
// bridge), so the target is forwarded as /welcome's own ?redirect= rather
// than handed straight to Clerk.
const welcomeUrl = computed(() => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
  return redirect ? `/welcome?redirect=${encodeURIComponent(redirect)}` : '/welcome'
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
