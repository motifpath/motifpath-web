<script setup lang="ts">
/**
 * The tap check before a session's first fretboard drill: about 20 seconds of tapping each fret as
 * soon as it lights up. How long a tap takes the student, when there's nothing to work out, is
 * then taken off their timed answers, so "fluent" is judged on what they know, not on their tapping.
 * The student may skip it; nothing tapped in the time counts as skipped too.
 */
import { useTapCheck, TAP_CHECK_LAST_FRET } from '@/features/student/composables/useTapCheck'
import type { TapCheckResult } from '@/features/student/composables/usePracticeSessionRun'
import DrillFretboard from '@/shared/components/diagram/DrillFretboard.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{
  /** The open-string pitches of the board tapped on, lowest first. */
  tuning: string[]
}>()

const emit = defineEmits<{ complete: [result: TapCheckResult]; skip: [] }>()

const { t } = useTypedT()

const { running, lit, secondsLeft, start, tap, stop } = useTapCheck(
  () => props.tuning.length,
  (result) => (result ? emit('complete', result) : emit('skip')),
)

const allStrings = () => props.tuning.map((_, index) => index + 1)

function skip() {
  stop()
  emit('skip')
}
</script>

<template>
  <div class="flex flex-col gap-4" data-test="tap-check">
    <header class="flex flex-col gap-1">
      <h2 class="text-lg font-semibold">{{ t('tapCheck.title') }}</h2>
      <p v-if="!running" class="text-sm text-ink-muted">{{ t('tapCheck.intro') }}</p>
      <p v-else data-test="tap-check-left" class="text-sm font-medium tabular-nums text-ink-muted" aria-live="off">
        {{ t('tapCheck.secondsLeft', { seconds: secondsLeft }) }}
      </p>
    </header>

    <DrillFretboard
      :tuning="tuning"
      :max-fret="TAP_CHECK_LAST_FRET"
      :label="t('tapCheck.board')"
      :lit="lit"
      :tap-strings="running ? allStrings() : []"
      @tap="tap"
    />

    <PracticeActionBar>
      <button type="button" data-test="skip-tap-check" class="h-12 px-3 text-sm font-medium text-accent-text underline" @click="skip">
        {{ t('tapCheck.skip') }}
      </button>
      <PrimaryButton v-if="!running" data-test="start-tap-check" data-primary-action class="ml-auto h-12 flex-1" @click="start">
        {{ t('tapCheck.start') }}
      </PrimaryButton>
    </PracticeActionBar>
  </div>
</template>
