<script setup lang="ts">
import { RouterView } from 'vue-router'

import AppBar from '@/shared/components/AppBar.vue'
import { useIsCompact } from '@/shared/composables/useIsCompact'

const { isCompact } = useIsCompact()
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <div class="sticky top-0 z-20">
      <AppBar context="student" :compact="isCompact" :primary-nav-to="{ name: 'path' }" />
    </div>

    <main class="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <RouterView />
    </main>
  </div>
</template>
