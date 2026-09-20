<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

import { useAuth } from '@/features/auth/composables/useAuth'
import LocaleSwitcher from '@/shared/components/LocaleSwitcher.vue'
import SignOutLink from '@/shared/components/SignOutLink.vue'
import ThemeToggle from '@/shared/components/ThemeToggle.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

withDefaults(defineProps<{ nav?: { to: RouteLocationRaw; label: string }[] }>(), {
  nav: () => [],
})

const { isSignedIn, displayInitial } = useAuth()
const { t } = useTypedT()

const accountMenuOpen = ref(false)
function toggleAccountMenu(): void {
  accountMenuOpen.value = !accountMenuOpen.value
}
function closeAccountMenu(): void {
  accountMenuOpen.value = false
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="border-b border-border">
      <div class="relative mx-auto flex max-w-4xl items-center gap-6 px-4 py-4">
        <span class="text-lg font-semibold text-accent-text">MotifPath</span>

        <nav v-if="nav.length" class="flex gap-4 text-sm">
          <RouterLink
            v-for="item in nav"
            :key="item.label"
            :to="item.to"
            class="hover:text-accent-text"
            >{{ item.label }}</RouterLink
          >
        </nav>

        <!-- Signed out: the language switcher is the only account-scoped
             control, so it's shown inline. Signed in: it moves into the
             account menu behind the avatar, matching AppBar's pattern
             elsewhere in the app, instead of sitting in the header on its
             own with no other account controls next to it. -->
        <LocaleSwitcher v-if="!isSignedIn" class="ml-auto" />
        <ThemeToggle :class="{ 'ml-auto': isSignedIn }" />

        <button
          v-if="isSignedIn"
          type="button"
          data-test="app-shell-account-avatar"
          :aria-label="t('appBar.accountMenuAriaLabel')"
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-accent-fg"
          @click="toggleAccountMenu"
        >
          {{ displayInitial }}
        </button>

        <template v-if="isSignedIn && accountMenuOpen">
          <div
            data-test="app-shell-account-menu-overlay"
            class="fixed inset-0 z-30"
            @click="closeAccountMenu"
          />
          <div
            data-test="app-shell-account-menu"
            class="absolute right-0 top-full z-40 mt-2 rounded-lg border border-border bg-surface-raised p-1.5 shadow-level2"
            @click="closeAccountMenu"
          >
            <LocaleSwitcher />
            <div class="my-1 h-px bg-border" />
            <SignOutLink class="block w-full px-2.5 py-1.5 text-left" />
          </div>
        </template>

        <slot name="header-actions" />
      </div>
    </header>

    <main class="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <slot />
    </main>
  </div>
</template>
