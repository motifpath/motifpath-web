<script setup lang="ts">
import { useTypedT } from '@/shared/composables/useTypedT'

import PrimaryButton from '@/shared/components/PrimaryButton.vue'

const { t } = useTypedT()
</script>

<template>
  <div class="flex flex-col items-start gap-3">
    <p class="text-ink-muted">{{ t('states.locked.message') }}</p>
    <PrimaryButton as="RouterLink" :to="{ name: 'path' }">{{ t('buttons.backToPath') }}</PrimaryButton>
  </div>
</template>
