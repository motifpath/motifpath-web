<script setup lang="ts">
/**
 * On how many of the last 7 days something happened, as seven marks with that many filled. A
 * count, never a streak: the marks don't stand for particular days, and a missed day resets
 * nothing.
 */
import { useTypedT } from '@/shared/composables/useTypedT'

defineProps<{ label: string; days: number }>()

const { t } = useTypedT()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{{ label }}</span>
    <div class="flex items-center gap-1.5" aria-hidden="true">
      <span
        v-for="n in 7"
        :key="n"
        data-test="day-mark"
        :data-filled="n <= days"
        class="h-3 w-3 rounded-full"
        :class="n <= days ? 'bg-accent' : 'border border-border'"
      />
    </div>
    <span class="text-sm text-ink-muted">{{ t('practiceHomeView.daysOf7', { count: days }) }}</span>
  </div>
</template>
