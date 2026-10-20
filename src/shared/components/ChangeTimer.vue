<script setup lang="ts">
/**
 * The countdown of a timed drill, such as a minute of chord changes: the time left, big enough to
 * read from the instrument, what it counts down from, and a track filling with the time gone.
 * It takes no input: while it runs both hands are on the instrument. Before the start it shows
 * the whole time and that a bar of count-in comes first. The time is a timer a screen reader can
 * ask for, never one that talks over the music.
 */
import { computed } from 'vue'

import { useTypedT } from '@/shared/composables/useTypedT'

const props = withDefaults(
  defineProps<{
    remainingMs: number
    totalMs: number
    /** Whether the countdown has started. */
    running: boolean
    /** What to do while it runs, after the caption, e.g. "change on every beat". */
    detail?: string
  }>(),
  { detail: undefined },
)

const { t } = useTypedT()

/** Minutes and seconds, the seconds rounded up so 0:00 shows only once the time is up. */
function clock(ms: number): string {
  const seconds = Math.ceil(Math.max(0, ms) / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

const time = computed(() => clock(props.remainingMs))

const caption = computed(() => {
  const lead = props.running ? t('drill.changeTimer.left', { total: clock(props.totalMs) }) : t('drill.changeTimer.ready')
  return props.detail ? t('drill.changeTimer.withDetail', { caption: lead, detail: props.detail }) : lead
})

const elapsedSeconds = computed(() => Math.round((props.totalMs - props.remainingMs) / 1000))
const elapsedPercent = computed(() => (props.totalMs <= 0 ? 0 : ((props.totalMs - props.remainingMs) / props.totalMs) * 100))
</script>

<template>
  <div class="flex w-full flex-col items-center gap-2 rounded-lg border border-border bg-surface-raised p-4">
    <span role="timer" aria-live="off" data-test="timer-time" class="text-2xl font-bold tabular-nums text-ink">{{ time }}</span>
    <span data-test="timer-caption" class="text-center text-xs font-medium text-ink-muted">{{ caption }}</span>
    <div
      role="progressbar"
      class="h-2 w-full overflow-hidden rounded-sm bg-surface-sunken"
      :aria-label="t('drill.changeTimer.elapsed')"
      :aria-valuenow="elapsedSeconds"
      aria-valuemin="0"
      :aria-valuemax="Math.round(totalMs / 1000)"
    >
      <div data-test="timer-elapsed" class="h-2 rounded-sm bg-accent" :style="{ width: `${elapsedPercent}%` }" />
    </div>
  </div>
</template>
