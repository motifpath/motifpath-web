<script setup lang="ts">
import { SignIn } from '@clerk/vue'
</script>

<template>
  <main class="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
    <div class="flex flex-col items-center gap-1">
      <span class="text-lg font-semibold text-motif-blue">MotifPath</span>
      <p class="text-sm text-motif-ink/60">Sign in to start practising.</p>
    </div>

    <SignIn force-redirect-url="/welcome" sign-up-force-redirect-url="/welcome" />
  </main>
</template>
