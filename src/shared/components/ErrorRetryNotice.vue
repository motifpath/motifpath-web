<script setup lang="ts">
import { useTypedT } from '@/shared/composables/useTypedT'

import PrimaryButton from '@/shared/components/PrimaryButton.vue'

interface ErrorRetryNoticeProps {
  message: string
  testId?: string
}

withDefaults(defineProps<ErrorRetryNoticeProps>(), {
  testId: 'error',
})

const emit = defineEmits<{ retry: [] }>()

const { t } = useTypedT()
</script>

<template>
  <div :data-test="testId" class="flex flex-col items-start gap-3">
    <p class="text-ink-muted">{{ message }}</p>
    <PrimaryButton data-test="retry" @click="emit('retry')">{{ t('buttons.tryAgain') }}</PrimaryButton>
  </div>
</template>
