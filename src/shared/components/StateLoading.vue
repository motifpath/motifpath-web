<script setup lang="ts">
import { useTypedT } from '@/shared/composables/useTypedT'

const props = withDefaults(defineProps<{ noun?: string }>(), { noun: '' })

const { t } = useTypedT()
</script>

<template>
  <p class="text-sm text-ink-muted">
    {{ props.noun ? t('states.loadingWithNoun', { noun: props.noun }) : t('states.loading') }}
  </p>
</template>
