<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'

import ThemeToggle from '@/shared/components/ThemeToggle.vue'

withDefaults(defineProps<{ nav?: { to: RouteLocationRaw; label: string }[] }>(), {
  nav: () => [],
})
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="border-b border-motif-ink/10">
      <div class="mx-auto flex max-w-4xl items-center gap-6 px-4 py-4">
        <span class="text-lg font-semibold text-motif-blue">MotifPath</span>

        <nav v-if="nav.length" class="flex gap-4 text-sm">
          <RouterLink
            v-for="item in nav"
            :key="item.label"
            :to="item.to"
            class="hover:text-motif-blue"
            >{{ item.label }}</RouterLink
          >
        </nav>

        <ThemeToggle class="ml-auto" />
        <slot name="header-actions" />
      </div>
    </header>

    <main class="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <slot />
    </main>
  </div>
</template>
