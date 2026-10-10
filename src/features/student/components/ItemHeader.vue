<script setup lang="ts">
/**
 * What a practice item is, above its stimulus: its name as the heading, and why the session
 * picked it. A new item never looks like the last one, since its name changes.
 */
import type { components } from '@/api/generated/core-domain'
import { pickReasonKeys } from '@/features/student/utils/pickReason'
import { useTypedT } from '@/shared/composables/useTypedT'

defineProps<{
  title: string
  reason: components['schemas']['PracticeSessionItem']['reason']
}>()

const { t } = useTypedT()
</script>

<template>
  <header class="flex flex-col items-start gap-2">
    <h2 data-test="item-title" class="text-lg font-semibold leading-tight">{{ title }}</h2>
    <span data-test="item-reason" class="rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium">
      {{ t(pickReasonKeys[reason]) }}
    </span>
  </header>
</template>
