<script setup lang="ts">
import AppButton from '@/shared/components/AppButton.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const { t } = useTypedT()
</script>

<template>
  <section class="flex min-h-screen flex-col items-center justify-center p-4">
    <StateBlock kind="notFound" :title="t('notFoundView.title')" :message="t('notFoundView.message')">
      <template #action>
        <AppButton :to="{ name: 'home' }">{{ t('notFoundView.backToHome') }}</AppButton>
      </template>
    </StateBlock>
  </section>
</template>
