<script setup lang="ts">
import { useTypedT } from '@/shared/composables/useTypedT'

import RegisteringNotice from '@/features/auth/components/RegisteringNotice.vue'
import RegistrationFailedNotice from '@/features/auth/components/RegistrationFailedNotice.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import PracticeDashboard from '@/features/student/components/PracticeDashboard.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useCurrentUserStore } from '@/stores/currentUser'

const { isLoaded, isSignedIn } = useAuth()
const currentUser = useCurrentUserStore()
const { t } = useTypedT()
</script>

<template>
  <!-- Every signed-in user lands on their practice dashboard: every role can learn. -->
  <PracticeDashboard v-if="isLoaded && isSignedIn && currentUser.isRegistered" />

  <section v-else class="flex flex-col items-start gap-4">
    <h1 class="text-xl font-semibold text-accent-text sm:text-2xl">{{ t('appBar.brand') }}</h1>

    <StateLoading v-if="!isLoaded" data-test="loading" />

    <RegistrationFailedNotice v-else-if="isSignedIn && currentUser.state === 'failed'" />

    <RegisteringNotice v-else-if="isSignedIn" />

    <template v-else>
      <p class="text-ink-muted">{{ t('home.signedOutMessage') }}</p>
      <PrimaryButton as="RouterLink" :to="{ name: 'sign-in' }">{{ t('buttons.signIn') }}</PrimaryButton>
    </template>
  </section>
</template>
