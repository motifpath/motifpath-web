<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
    <p class="text-4xl font-semibold text-motif-blue">404</p>
    <p class="text-motif-ink/70">This page doesn't exist.</p>
    <RouterLink :to="{ name: 'home' }" class="text-sm text-motif-blue hover:underline">
      Back to home
    </RouterLink>
  </section>
</template>
