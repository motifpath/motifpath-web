<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

import AppButton from '@/shared/components/AppButton.vue'

withDefaults(
  defineProps<{
    as?: 'button' | 'RouterLink'
    to?: RouteLocationRaw
    type?: 'button' | 'submit'
  }>(),
  { as: 'button', to: undefined, type: 'button' },
)
</script>

<template>
  <AppButton variant="primary" :to="as === 'RouterLink' ? to : undefined" :type="type">
    <slot />
  </AppButton>
</template>
