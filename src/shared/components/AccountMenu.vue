<script setup lang="ts">
import { ref } from 'vue'

import { useAuth } from '@/features/auth/composables/useAuth'
import LocaleSwitcher from '@/shared/components/LocaleSwitcher.vue'
import SignOutLink from '@/shared/components/SignOutLink.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const { displayInitial } = useAuth()
const { t } = useTypedT()

const open = ref(false)
function toggle(): void {
  open.value = !open.value
}
function close(): void {
  open.value = false
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      data-test="account-menu-avatar"
      :aria-label="t('appBar.accountMenuAriaLabel')"
      class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-accent-fg"
      @click="toggle"
    >
      {{ displayInitial }}
    </button>

    <template v-if="open">
      <div data-test="account-menu-overlay" class="fixed inset-0 z-30" @click="close" />
      <div
        data-test="account-menu"
        class="absolute right-0 top-full z-40 mt-2 rounded-lg border border-border bg-surface-raised p-1.5 shadow-level2"
        @click="close"
      >
        <LocaleSwitcher />
        <div class="my-1 h-px bg-border" />
        <SignOutLink class="block w-full px-2.5 py-1.5 text-left" />
      </div>
    </template>
  </div>
</template>
