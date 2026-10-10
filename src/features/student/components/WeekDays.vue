<script setup lang="ts">
/**
 * The last 7 days as a row of weekday marks, oldest first and today last: a filled mark for each
 * day something happened, and a ring on today. It only says which days happened. It is never a
 * streak, so a day without anything looks like any other such day and is never shown as missed.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { type MarkedDay, weekdayMarks } from '@/features/student/utils/studentHome'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{
  label: string
  /** What a filled day means, read out after its weekday, such as "practised". */
  markedLabel: string
  days: MarkedDay[]
}>()

const { t } = useTypedT()
const { locale } = useI18n()

const marks = computed(() => weekdayMarks(props.days, locale.value))
const count = computed(() => props.days.filter((day) => day.marked).length)

/** What a screen reader hears for a day: its weekday, whether it is today, and whether it happened. */
function spoken(mark: ReturnType<typeof weekdayMarks>[number]): string {
  const day = mark.isToday ? `${mark.name} ${t('weekDays.today')}` : mark.name
  return mark.filled ? `${day}: ${props.markedLabel}` : day
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <span data-test="week-days-label" class="text-xs font-medium text-ink-muted">{{ t('weekDays.count', { label, count }) }}</span>
    <ol class="flex gap-2">
      <li v-for="mark in marks" :key="mark.date" data-test="week-day" class="flex w-6 flex-col items-center gap-1">
        <span
          data-test="week-day-mark"
          :data-filled="mark.filled"
          :data-today="mark.isToday"
          class="h-6 w-6 rounded-full"
          :class="[mark.filled ? 'bg-success' : 'bg-surface-sunken', { 'ring-2 ring-inset ring-accent': mark.isToday }]"
          aria-hidden="true"
        />
        <span data-test="week-day-letter" class="text-xs text-ink-muted" aria-hidden="true">{{ mark.letter }}</span>
        <span class="sr-only">{{ spoken(mark) }}</span>
      </li>
    </ol>
  </div>
</template>
