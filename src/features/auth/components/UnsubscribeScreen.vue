<script setup lang="ts">
/**
 * What an email's unsubscribe link shows: which kind of email stopped, or that nothing changed.
 * It never mentions the other kind, whose setting it can't know without a sign-in. Its way on is
 * the email settings, which opens the app (signing in first) on the account menu's Emails.
 */
import { MailCheck, MailX } from 'lucide-vue-next'
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import LandingLayout from '@/features/auth/components/LandingLayout.vue'
import AppButton from '@/shared/components/AppButton.vue'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import type { UnsubscribeState } from '@/shared/composables/useEmailUnsubscribe'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{
  state: UnsubscribeState
  /** The kind that stopped, once `state` is `done`. */
  kind: components['schemas']['EmailUnsubscribeResult']['kind'] | null
}>()
const emit = defineEmits<{ retry: [] }>()

const { t } = useTypedT()

const title = computed(() => {
  if (props.state === 'done') return props.kind === 'reminders' ? t('unsubscribe.remindersOff') : t('unsubscribe.reportsOff')
  if (props.state === 'broken') return t('unsubscribe.brokenTitle')
  return t('unsubscribe.failedTitle')
})
const body = computed(() => {
  if (props.state === 'done') return props.kind === 'reminders' ? t('unsubscribe.remindersOffBody') : t('unsubscribe.reportsOffBody')
  if (props.state === 'broken') return t('unsubscribe.brokenBody')
  return t('unsubscribe.failedBody')
})
</script>

<template>
  <LandingLayout>
    <p v-if="state === 'working'" role="status" class="text-center text-base text-ink-muted">{{ t('unsubscribe.working') }}</p>

    <template v-else>
      <div class="flex flex-col items-center gap-4 text-center">
        <span
          class="flex h-[5rem] w-[5rem] items-center justify-center rounded-full"
          :class="state === 'done' ? 'bg-accent-muted text-accent-text' : 'bg-danger-muted text-danger'"
          aria-hidden="true"
        >
          <MailCheck v-if="state === 'done'" :size="36" />
          <MailX v-else :size="36" />
        </span>
        <h1 class="text-xl font-bold text-ink">{{ title }}</h1>
        <p class="text-base text-ink-muted">{{ body }}</p>
      </div>

      <div class="flex flex-col gap-3 pt-2">
        <InlineNotice v-if="state !== 'done'" :message="t('unsubscribe.nothingChanged')" />
        <AppButton v-if="state === 'failed'" data-test="unsubscribe-retry" block @click="emit('retry')">
          {{ t('unsubscribe.tryAgain') }}
        </AppButton>
        <AppButton
          data-test="unsubscribe-email-settings"
          :variant="state === 'failed' ? 'secondary' : 'primary'"
          block
          :to="{ name: 'email-settings' }"
        >
          {{ t('unsubscribe.emailSettings') }}
        </AppButton>
      </div>
    </template>
  </LandingLayout>
</template>
