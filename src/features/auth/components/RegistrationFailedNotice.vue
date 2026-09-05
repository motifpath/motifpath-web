<script setup lang="ts">
import ErrorRetryNotice from '@/shared/components/ErrorRetryNotice.vue'
import { useCurrentUserStore } from '@/stores/currentUser'

const currentUser = useCurrentUserStore()
</script>

<template>
  <ErrorRetryNotice
    test-id="registration-failed"
    message="We couldn't finish setting up your account. This is usually temporary."
    @retry="currentUser.retry()"
  />
</template>
