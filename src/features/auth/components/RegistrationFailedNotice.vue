<script setup lang="ts">
import { useTypedT } from '@/shared/composables/useTypedT'

import ErrorRetryNotice from '@/shared/components/ErrorRetryNotice.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import SignOutLink from '@/shared/components/SignOutLink.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useCurrentUserStore } from '@/stores/currentUser'

const currentUser = useCurrentUserStore()
const { openUserProfile, refreshToken } = useAuth()
const { t } = useTypedT()

// The session token only carries a newly added name once it is re-minted, and
// the one the client holds may be cached for up to a minute — retrying with it
// would fail again even though the user already fixed their profile.
async function retryWithFreshToken(): Promise<void> {
  await refreshToken()
  await currentUser.retry()
}
</script>

<template>
  <div class="flex flex-col items-start gap-3">
    <div
      v-if="currentUser.failureReason === 'name-required'"
      data-test="registration-name-required"
      class="flex flex-col items-start gap-3"
    >
      <p class="text-ink-muted">{{ t('errors.registrationNameRequired') }}</p>
      <PrimaryButton data-test="add-name" @click="openUserProfile()">{{ t('buttons.addYourName') }}</PrimaryButton>
      <button
        type="button"
        data-test="retry"
        class="text-sm text-ink-muted hover:text-accent-text"
        @click="retryWithFreshToken()"
      >
        {{ t('buttons.nameAddedTryAgain') }}
      </button>
    </div>
    <ErrorRetryNotice
      v-else
      test-id="registration-failed"
      :message="t('errors.registrationFailed')"
      @retry="currentUser.retry()"
    />
    <SignOutLink :label="t('buttons.signOutTryDifferentAccount')" />
  </div>
</template>
