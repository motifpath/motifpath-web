<script setup lang="ts">
import { useTypedT } from '@/shared/composables/useTypedT'

import { useAuth } from '@/features/auth/composables/useAuth'

interface SignOutLinkProps {
  label?: string
}

const props = defineProps<SignOutLinkProps>()

const { t } = useTypedT()
const { signOut } = useAuth()

const resolvedLabel = props.label ?? t('buttons.signOut')
</script>

<template>
  <button
    type="button"
    data-test="sign-out"
    class="text-sm text-ink-muted hover:text-accent-text"
    @click="signOut()"
  >
    {{ resolvedLabel }}
  </button>
</template>
