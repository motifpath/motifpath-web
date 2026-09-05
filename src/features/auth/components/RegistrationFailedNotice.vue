<script setup lang="ts">
import ErrorRetryNotice from '@/shared/components/ErrorRetryNotice.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useCurrentUserStore } from '@/stores/currentUser'

const { signOut } = useAuth()
const currentUser = useCurrentUserStore()
</script>

<template>
  <div class="flex flex-col items-start gap-3">
    <ErrorRetryNotice
      test-id="registration-failed"
      message="We couldn't finish setting up your account. This is usually temporary."
      @retry="currentUser.retry()"
    />
    <button
      type="button"
      data-test="sign-out"
      class="text-sm text-motif-ink/60 hover:text-motif-blue"
      @click="signOut()"
    >
      Sign out and try a different account
    </button>
  </div>
</template>
