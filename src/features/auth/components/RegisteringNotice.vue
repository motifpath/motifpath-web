<script setup lang="ts">
import { useTypedT } from '@/shared/composables/useTypedT'

interface RegisteringNoticeProps {
  testId?: string
}

withDefaults(defineProps<RegisteringNoticeProps>(), {
  testId: 'registering',
})

const { t } = useTypedT()
</script>

<template>
  <p :data-test="testId" class="text-ink-muted">{{ t('registeringNotice.message') }}</p>
</template>
