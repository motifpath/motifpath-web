<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'

import { useAuth } from '@/features/auth/composables/useAuth'
import AccountMenu from '@/shared/components/AccountMenu.vue'
import LocaleSwitcher from '@/shared/components/LocaleSwitcher.vue'
import ThemeToggle from '@/shared/components/ThemeToggle.vue'

withDefaults(defineProps<{ nav?: { to: RouteLocationRaw; label: string }[] }>(), {
  nav: () => [],
})

const { isSignedIn } = useAuth()
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="border-b border-border">
      <div class="mx-auto flex max-w-4xl items-center gap-6 px-4 py-4">
        <RouterLink :to="{ name: 'home' }" data-test="app-shell-home" class="text-lg font-semibold text-accent-text"
          >MotifPath</RouterLink
        >

        <nav v-if="nav.length" class="flex gap-4 text-sm">
          <RouterLink
            v-for="item in nav"
            :key="item.label"
            :to="item.to"
            class="hover:text-accent-text"
            >{{ item.label }}</RouterLink
          >
        </nav>

        <!-- Signed out: language and theme are the only account-scoped
             controls, so they're shown inline. Signed in: they move into the
             account menu behind the avatar, matching AppBar's pattern
             elsewhere in the app. -->
        <!-- Signed in, Appearance sits in the account menu too. -->
        <template v-if="!isSignedIn">
          <LocaleSwitcher class="ml-auto" />
          <ThemeToggle />
        </template>
        <AccountMenu v-else class="ml-auto" />

        <slot name="header-actions" />
      </div>
    </header>

    <main class="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <slot />
    </main>
  </div>
</template>
