<script setup lang="ts">
/**
 * What a signed-in visitor sees until their account is set up, always on the landing's layout:
 * the landing with the Google button busy (only once setup has taken 300 ms); a failure with Try
 * again and Sign out; or, when the account has no full name, our own name step, which renames the
 * account and tries again.
 */
import LandingLayout from '@/features/auth/components/LandingLayout.vue'
import LandingScreen from '@/features/auth/components/LandingScreen.vue'
import NameStepForm from '@/features/auth/components/NameStepForm.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import AppButton from '@/shared/components/AppButton.vue'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import SignOutLink from '@/shared/components/SignOutLink.vue'
import { useShownAfter } from '@/shared/composables/useShownAfter'
import { useTypedT } from '@/shared/composables/useTypedT'
import { useCurrentUserStore } from '@/stores/currentUser'

const { t } = useTypedT()
const currentUser = useCurrentUserStore()
const { accountName, updateAccountName } = useAuth()
const busy = useShownAfter(300)

async function renameAndRetry(firstName: string, lastName: string) {
  await updateAccountName(firstName, lastName)
  await currentUser.retry()
}
</script>

<template>
  <LandingLayout v-if="currentUser.state === 'failed' && currentUser.failureReason === 'name-required'">
    <NameStepForm :initial="accountName" :submit="renameAndRetry" />
  </LandingLayout>

  <LandingLayout v-else-if="currentUser.state === 'failed'">
    <InlineNotice :message="t('bridge.failed')" />
    <AppButton data-test="bridge-retry" block @click="currentUser.retry()">{{ t('bridge.tryAgain') }}</AppButton>
    <SignOutLink class="self-center" />
  </LandingLayout>

  <LandingScreen v-else :busy="busy" />
</template>
