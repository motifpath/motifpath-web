<script setup lang="ts">
import { RouterView } from 'vue-router'

import AppShell from '@/shared/components/AppShell.vue'
import SignOutLink from '@/shared/components/SignOutLink.vue'

const nav = [
  { to: { name: 'home' }, label: 'Home' },
  { to: { name: 'path' }, label: 'My path' },
]
</script>

<template>
  <AppShell :nav="nav">
    <template #header-actions>
      <SignOutLink />
    </template>

    <RouterView />
  </AppShell>
</template>
