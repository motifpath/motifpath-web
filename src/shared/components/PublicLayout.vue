<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="border-b border-motif-ink/10">
      <div class="mx-auto max-w-4xl px-4 py-4">
        <span class="text-lg font-semibold text-motif-blue">MotifPath</span>
      </div>
    </header>

    <main class="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <RouterView />
    </main>
  </div>
</template>
