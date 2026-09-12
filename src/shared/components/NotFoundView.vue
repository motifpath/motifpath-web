<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
    <p class="text-4xl font-semibold text-accent-text">404</p>
    <p class="text-ink-muted">This page doesn't exist.</p>
    <RouterLink :to="{ name: 'home' }" class="text-sm text-accent-text hover:underline">
      Back to home
    </RouterLink>
  </section>
</template>
