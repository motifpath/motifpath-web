<script setup lang="ts">
/**
 * The landing: what MotifPath is for, and one way in — Continue with Google, straight to Google's own
 * sign-in. Where the visitor was heading travels through Google and back. While the account is being
 * set up after Google, the same screen stays with the button busy.
 *
 * Inside the app shell, Google refuses sign-in in the embedded page, so the button opens the phone's
 * own account picker instead and the app goes on by itself once Clerk has the account.
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import LandingLayout from '@/features/auth/components/LandingLayout.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { readRedirectQuery } from '@/features/auth/utils/redirectQuery'
import BrandMark from '@/shared/components/BrandMark.vue'
import GoogleButton from '@/shared/components/GoogleButton.vue'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { platformGoogleAccountPicker } from '@/shared/platform/googleAccount'
import { isNativeApp } from '@/shared/platform/platform'

const props = withDefaults(defineProps<{ busy?: boolean }>(), { busy: false })

const { t } = useTypedT()
const route = useRoute()
const router = useRouter()
const { startGoogleSignIn, signInWithGoogleToken } = useAuth()

const couldNotStart = ref(false)
// Clerk sends a visitor back here when Google's sign-in was cancelled or denied.
const unfinished = computed(() => couldNotStart.value || route.query.google === 'unfinished')

// Set once signing in with the picked account takes 300 ms, so a quick one never flashes busy.
const settingUp = ref(false)
let settingUpTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(settingUpTimer))

async function signInWithPhoneAccount(query: { redirect: string } | undefined) {
  const token = await platformGoogleAccountPicker()()
  settingUpTimer = setTimeout(() => (settingUp.value = true), 300)
  try {
    const outcome = await signInWithGoogleToken(token)
    await router.push({ name: outcome === 'needs-name' ? 'name-step' : 'registering', query })
  } finally {
    clearTimeout(settingUpTimer)
    settingUp.value = false
  }
}

async function continueWithGoogle() {
  const redirect = readRedirectQuery(route.query.redirect)
  const query = redirect ? { redirect } : undefined
  couldNotStart.value = false
  if (isNativeApp()) {
    // Closing the picker and a refused account read the same: nothing was saved.
    await signInWithPhoneAccount(query).catch(() => (couldNotStart.value = true))
    return
  }
  try {
    await startGoogleSignIn({
      callbackUrl: router.resolve({ name: 'sso-callback', query }).href,
      completeUrl: router.resolve({ name: 'registering', query }).href,
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
    <InlineNotice v-if="unfinished && !props.busy" :message="t('landing.unfinished')" />
    <div class="flex flex-col gap-3">
      <GoogleButton :busy="props.busy || settingUp" @click="continueWithGoogle" />
      <p class="text-center text-xs text-ink-muted">{{ t('landing.caption') }}</p>
    </div>
  </LandingLayout>
</template>
