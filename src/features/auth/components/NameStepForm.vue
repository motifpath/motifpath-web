<script setup lang="ts">
/**
 * Asks for the first and last name an account needs when Google didn't give both: what Google gave
 * filled in, the cursor in the missing one. Saving is the caller's — at sign-up or for an existing
 * account — and a failed save keeps what was typed. Signing out is the quiet way back.
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useAuth, type PersonName } from '@/features/auth/composables/useAuth'
import AppButton from '@/shared/components/AppButton.vue'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import TextField from '@/shared/components/TextField.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{
  initial: PersonName
  submit: (firstName: string, lastName: string) => Promise<void>
}>()

const { t } = useTypedT()
const router = useRouter()
const { signOut } = useAuth()

const firstName = ref(props.initial.firstName)
const lastName = ref(props.initial.lastName)
const checked = ref(false)
const saving = ref(false)
const saveFailed = ref(false)

const firstNameError = computed(() => (checked.value && !firstName.value.trim() ? t('nameStep.firstNameRequired') : ''))
const lastNameError = computed(() => (checked.value && !lastName.value.trim() ? t('nameStep.lastNameRequired') : ''))
const focusFirst = !props.initial.firstName

async function onSubmit() {
  checked.value = true
  saveFailed.value = false
  if (firstNameError.value || lastNameError.value) return
  saving.value = true
  try {
    await props.submit(firstName.value.trim(), lastName.value.trim())
  } catch {
    saveFailed.value = true
  } finally {
    saving.value = false
  }
}

async function onSignOut() {
  await signOut()
  await router.replace({ name: 'home' })
}
</script>

<template>
  <form class="flex flex-col gap-5" novalidate @submit.prevent="onSubmit">
    <h1 class="text-xl font-bold text-ink">{{ t('nameStep.title') }}</h1>
    <InlineNotice v-if="saveFailed" :message="t('nameStep.saveFailed')" />
    <TextField v-model="firstName" :label="t('nameStep.firstName')" :error="firstNameError" autocomplete="given-name" :autofocus="focusFirst" />
    <TextField v-model="lastName" :label="t('nameStep.lastName')" :error="lastNameError" autocomplete="family-name" :autofocus="!focusFirst" />
    <AppButton type="submit" block :busy="saving">{{ t('nameStep.continue') }}</AppButton>
    <button
      type="button"
      data-test="name-step-sign-out"
      class="inline-flex min-h-12 items-center justify-center text-sm font-semibold text-ink-muted hover:text-accent-text"
      @click="onSignOut"
    >
      {{ t('buttons.signOut') }}
    </button>
  </form>
</template>
