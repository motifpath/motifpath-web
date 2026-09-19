<script setup lang="ts">
import { useTypedT } from '@/shared/composables/useTypedT'

import RegisteringNotice from '@/features/auth/components/RegisteringNotice.vue'
import RegistrationFailedNotice from '@/features/auth/components/RegistrationFailedNotice.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useCurrentUserStore } from '@/stores/currentUser'

const { isLoaded, isSignedIn } = useAuth()
const currentUser = useCurrentUserStore()
const { t } = useTypedT()
</script>

<template>
  <section class="flex flex-col items-start gap-4">
    <h1 class="text-2xl font-semibold text-accent-text">{{ t('appBar.brand') }}</h1>

    <StateLoading v-if="!isLoaded" data-test="loading" />

    <template v-else-if="isSignedIn && currentUser.isRegistered">
      <p class="text-ink-muted">{{ t('home.signedInMessage') }}</p>
      <PrimaryButton as="RouterLink" :to="{ name: 'path' }">{{ t('home.goToPath') }}</PrimaryButton>
    </template>

    <RegistrationFailedNotice v-else-if="isSignedIn && currentUser.state === 'failed'" />

    <RegisteringNotice v-else-if="isSignedIn" />

    <template v-else>
      <p class="text-ink-muted">{{ t('home.signedOutMessage') }}</p>
      <PrimaryButton as="RouterLink" :to="{ name: 'sign-in' }">{{ t('buttons.signIn') }}</PrimaryButton>
    </template>
  </section>
</template>
