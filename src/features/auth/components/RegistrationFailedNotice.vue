<script setup lang="ts">
import ErrorRetryNotice from '@/shared/components/ErrorRetryNotice.vue'
import SignOutLink from '@/shared/components/SignOutLink.vue'
import { useCurrentUserStore } from '@/stores/currentUser'

const currentUser = useCurrentUserStore()
</script>

<template>
  <div class="flex flex-col items-start gap-3">
    <ErrorRetryNotice
      test-id="registration-failed"
      message="We couldn't finish setting up your account. This is usually temporary."
      @retry="currentUser.retry()"
    />
    <SignOutLink label="Sign out and try a different account" />
  </div>
</template>
