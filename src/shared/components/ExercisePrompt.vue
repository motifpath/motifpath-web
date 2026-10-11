<script setup lang="ts">
/** An exercise's prompt, and how many options to choose when there are several right ones. */
import PromptRenderer from '@/shared/components/PromptRenderer.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { components } from '@/api/generated/core-domain'

defineProps<{
  prompt: components['schemas']['PromptDocument']
  chooseCount?: number
}>()

const { t } = useTypedT()
</script>

<template>
  <div class="text-[15px] font-semibold leading-[1.375rem] text-ink">
    <PromptRenderer :document="prompt" />
    <p v-if="chooseCount" data-test="choose-count" class="mt-1 text-sm font-medium text-ink-muted">
      {{ t('exerciseView.chooseCount', { count: chooseCount }) }}
    </p>
  </div>
</template>
