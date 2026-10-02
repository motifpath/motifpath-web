<script setup lang="ts">
import AppBar from '@/shared/components/AppBar.vue'
import { useIsCompact } from '@/shared/composables/useIsCompact'
import { useTypedT } from '@/shared/composables/useTypedT'

const { isCompact } = useIsCompact()
const { t } = useTypedT()
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <AppBar context="teacher" :compact="isCompact" :primary-nav-to="{ name: 'admin-knowledge-map' }" />
    <h1 class="px-4 pt-6 text-lg font-bold text-ink sm:px-[48px]">{{ t('knowledgeMap.heading') }}</h1>
  </div>
</template>
