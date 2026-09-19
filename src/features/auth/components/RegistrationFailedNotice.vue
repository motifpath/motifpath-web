<script setup lang="ts">
import { useTypedT } from '@/shared/composables/useTypedT'

import ErrorRetryNotice from '@/shared/components/ErrorRetryNotice.vue'
import SignOutLink from '@/shared/components/SignOutLink.vue'
import { useCurrentUserStore } from '@/stores/currentUser'

const currentUser = useCurrentUserStore()
const { t } = useTypedT()
</script>

<template>
  <div class="flex flex-col items-start gap-3">
    <ErrorRetryNotice
      test-id="registration-failed"
      :message="t('errors.registrationFailed')"
      @retry="currentUser.retry()"
    />
    <SignOutLink :label="t('buttons.signOutTryDifferentAccount')" />
  </div>
</template>
