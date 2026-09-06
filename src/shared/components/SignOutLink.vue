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
    class="text-sm text-motif-ink/60 hover:text-motif-blue"
    @click="signOut()"
  >
    {{ label }}
  </button>
</template>
