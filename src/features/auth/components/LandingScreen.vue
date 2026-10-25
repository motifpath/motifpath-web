<script setup lang="ts">
/**
 * The landing: what MotifPath is for, and one way in — Continue with Google, straight to Google's own
 * sign-in. Where the visitor was heading travels through Google and back. While the account is being
 * set up after Google, the same screen stays with the button busy.
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import LandingLayout from '@/features/auth/components/LandingLayout.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { readRedirectQuery } from '@/features/auth/utils/redirectQuery'
import BrandMark from '@/shared/components/BrandMark.vue'
import GoogleButton from '@/shared/components/GoogleButton.vue'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

withDefaults(defineProps<{ busy?: boolean }>(), { busy: false })

const { t } = useTypedT()
const route = useRoute()
const router = useRouter()
const { startGoogleSignIn } = useAuth()

const couldNotStart = ref(false)
// Clerk sends a visitor back here when Google's sign-in was cancelled or denied.
const unfinished = computed(() => couldNotStart.value || route.query.google === 'unfinished')

async function continueWithGoogle() {
  const redirect = readRedirectQuery(route.query.redirect)
  const query = redirect ? { redirect } : undefined
  couldNotStart.value = false
  try {
    await startGoogleSignIn({
      callbackUrl: router.resolve({ name: 'sso-callback', query }).href,
      completeUrl: router.resolve({ name: 'registering', query }).href,
      nameStepUrl: router.resolve({ name: 'name-step', query }).href,
    })
  } catch {
    couldNotStart.value = true
  }
}
</script>

<template>
  <LandingLayout>
    <BrandMark size="lg" class="self-center" />
    <div class="flex flex-col gap-3 text-center">
      <h1 class="text-xl font-bold text-ink">{{ t('landing.headline') }}</h1>
      <p class="text-base text-ink-muted">{{ t('landing.line') }}</p>
    </div>
    <InlineNotice v-if="unfinished && !busy" :message="t('landing.unfinished')" />
    <div class="flex flex-col gap-3">
      <GoogleButton :busy="busy" @click="continueWithGoogle" />
      <p class="text-center text-xs text-ink-muted">{{ t('landing.caption') }}</p>
    </div>
  </LandingLayout>
</template>
