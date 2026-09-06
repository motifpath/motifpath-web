<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

import SignOutLink from '@/shared/components/SignOutLink.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="border-b border-motif-ink/10">
      <div class="mx-auto flex max-w-4xl items-center gap-6 px-4 py-4">
        <span class="text-lg font-semibold text-motif-blue">MotifPath</span>

        <nav class="flex gap-4 text-sm">
          <RouterLink :to="{ name: 'home' }" class="hover:text-motif-blue">Home</RouterLink>
          <RouterLink :to="{ name: 'path' }" class="hover:text-motif-blue">My path</RouterLink>
        </nav>

        <SignOutLink class="ml-auto" />
      </div>
    </header>

    <main class="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <RouterView />
    </main>
  </div>
</template>
