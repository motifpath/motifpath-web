<script setup lang="ts">
import { useAuth } from '@/features/auth/composables/useAuth'

interface SignOutLinkProps {
  label?: string
}

withDefaults(defineProps<SignOutLinkProps>(), {
  label: 'Sign out',
})

const { signOut } = useAuth()
</script>

<template>
  <button
    type="button"
    data-test="sign-out"
    class="text-sm text-ink-muted hover:text-accent-text"
    @click="signOut()"
  >
    {{ label }}
  </button>
</template>
