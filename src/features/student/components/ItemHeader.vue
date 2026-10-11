<script setup lang="ts">
/**
 * What a practice item is, above its stimulus: its name as the heading, and why the session
 * picked it, or a tag for an item no session picked (a lesson's challenge). A new item never looks
 * like the last one, since its name changes.
 */
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { pickReasonKeys } from '@/features/student/utils/pickReason'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{
  title: string
  /** Why the session picked the item. */
  reason?: components['schemas']['PracticeSessionItem']['reason']
  /** Shown in place of a reason, for an item no session picked. */
  tag?: string
}>()

const { t } = useTypedT()

const label = computed(() => props.tag ?? (props.reason ? t(pickReasonKeys[props.reason]) : null))
</script>

<template>
  <header class="flex flex-col items-start gap-2">
    <h2 data-test="item-title" class="text-lg font-semibold leading-tight">{{ title }}</h2>
    <span v-if="label" data-test="item-reason" class="rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium">
      {{ label }}
    </span>
  </header>
</template>
