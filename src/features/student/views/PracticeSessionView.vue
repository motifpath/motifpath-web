<script setup lang="ts">
/**
 * A practice session with an instrument in hand. The student says which instrument they're
 * holding and how long they have; core composes the session; then each exercise is answered and
 * each play-along played take by take, ending with one that applies what was practised, until
 * the plan runs out or the student ends it. A session left mid-way, by
 * navigating away or closing or reloading the page, ends as left early.
 *
 * All of it runs in the Practice Shell: × ends a running session, and otherwise leaves for where
 * the student came from. The screen stays on while the session runs.
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'

import PlayAlongTake from '@/features/student/components/PlayAlongTake.vue'
import SessionExercise from '@/features/student/components/SessionExercise.vue'
import { useComposePracticeSession } from '@/features/student/composables/useComposePracticeSession'
import { usePracticeSessionRun } from '@/features/student/composables/usePracticeSessionRun'
import InstrumentTilePicker from '@/shared/components/InstrumentTilePicker.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PracticeShell from '@/shared/components/PracticeShell.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useTypedT } from '@/shared/composables/useTypedT'
import { useWakeLock } from '@/shared/composables/useWakeLock'

const MINUTE_CHOICES = [5, 10, 15, 20, 30] as const

const { t } = useTypedT()
const { instruments, isLoading, error: instrumentsError, retry: retryInstruments } = useListInstruments()
const { compose, isComposing } = useComposePracticeSession()

/** Only a fretted instrument's diagrams play along yet. */
const playable = computed(() => instruments.value.filter((instrument) => instrument.family === 'fretted'))

const instrumentId = ref<string | null>(null)
const minutes = ref(10)
watch(
  playable,
  (list) => {
    if (!list.some((instrument) => instrument.instrument_id === instrumentId.value)) {
      instrumentId.value = list[0]?.instrument_id ?? null
    }
  },
  { immediate: true },
)

const composeError = ref<'nothing_to_practise' | 'failed' | null>(null)
const run = shallowRef<ReturnType<typeof usePracticeSessionRun> | null>(null)

async function startSession() {
  if (!instrumentId.value || isComposing.value) return
  composeError.value = null
  const outcome = await compose(instrumentId.value, minutes.value)
  if (outcome.kind !== 'composed') {
    composeError.value = outcome.kind
    return
  }
  const session = usePracticeSessionRun(outcome.plan)
  session.start()
  run.value = session
}

const current = computed(() => run.value?.current.value ?? null)
const finished = computed(() => run.value?.finished.value ?? false)
const running = computed(() => run.value !== null && !finished.value)

useWakeLock(running)

const position = computed(() => {
  const session = run.value
  if (!session || !running.value) return undefined
  const total = session.plan.items.length
  return { current: Math.min(session.index.value + 1, total), total }
})

function practiseAgain() {
  run.value = null
}

const router = useRouter()

/** Back where the student came from, or to their path when the session was opened directly. */
function leave() {
  if (window.history.state?.back) router.back()
  else void router.push({ name: 'path' })
}

function exit() {
  if (running.value) run.value!.end()
  else leave()
}

// Sent with keepalive so the request outlives the page. A phone that discards a background
// tab fires nothing; that session counts as abandoned once its events stop.
function endOnPageClose() {
  run.value?.end({ keepalive: true })
}
onMounted(() => window.addEventListener('pagehide', endOnPageClose))
onBeforeUnmount(() => {
  window.removeEventListener('pagehide', endOnPageClose)
  run.value?.end()
})
</script>

<template>
  <PracticeShell
    :exit-label="running ? t('practiceSessionView.endSession') : t('practiceSessionView.close')"
    :position="position"
    :progress="running ? run!.progress.value : undefined"
    @exit="exit"
  >
    <section v-if="!run" class="flex flex-col gap-5" data-test="practice-session">
      <header class="flex flex-col gap-1">
        <h1 class="text-xl font-semibold">{{ t('practiceSessionView.title') }}</h1>
        <p class="text-sm text-ink-muted">{{ t('practiceSessionView.intro') }}</p>
      </header>

      <StateLoading v-if="isLoading" :noun="t('practiceSessionView.loadingNoun')" />
      <StateError v-else-if="instrumentsError" :message="t('practiceSessionView.instrumentsError')" @retry="retryInstruments()" />
      <p v-else-if="playable.length === 0" class="text-ink-muted">{{ t('practiceSessionView.noInstruments') }}</p>

      <div v-else class="flex flex-col gap-5">
        <InstrumentTilePicker v-model="instrumentId" :instruments="playable" :label="t('practiceSessionView.instrumentLabel')" />

        <fieldset class="flex flex-col gap-1.5">
          <legend class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {{ t('practiceSessionView.minutesLabel') }}
          </legend>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="choice in MINUTE_CHOICES"
              :key="choice"
              class="flex h-12 cursor-pointer items-center rounded-md border px-4 text-sm"
              :class="minutes === choice ? 'border-accent bg-accent-muted' : 'border-border'"
            >
              <input v-model="minutes" type="radio" name="minutes" class="sr-only" :value="choice" :data-test="`minutes-${choice}`" />
              {{ t('practiceSessionView.minutesOption', { minutes: choice }) }}
            </label>
          </div>
        </fieldset>

        <p v-if="composeError === 'nothing_to_practise'" class="text-sm text-danger" role="alert">
          {{ t('practiceSessionView.nothingToPractise') }}
        </p>
        <p v-else-if="composeError === 'failed'" class="text-sm text-danger" role="alert">
          {{ t('practiceSessionView.planError') }}
        </p>

        <PracticeActionBar>
          <PrimaryButton data-test="start-session" data-primary-action :disabled="isComposing || !instrumentId" class="h-12 w-full" @click="startSession">
            {{ isComposing ? t('practiceSessionView.starting') : t('practiceSessionView.start') }}
          </PrimaryButton>
        </PracticeActionBar>
      </div>
    </section>

    <section v-else-if="finished" class="flex flex-col gap-3" data-test="session-done">
      <h1 class="text-xl font-semibold">{{ t('practiceSessionView.doneTitle') }}</h1>
      <p class="text-ink-muted">{{ t('practiceSessionView.doneBody', { count: run.answeredCount.value }) }}</p>
      <PracticeActionBar>
        <PrimaryButton data-test="practise-again" data-primary-action class="h-12 flex-1" @click="practiseAgain">
          {{ t('practiceSessionView.practiseAgain') }}
        </PrimaryButton>
        <RouterLink :to="{ name: 'path' }" class="text-sm font-medium text-accent-text underline">
          {{ t('practiceSessionView.backToPath') }}
        </RouterLink>
      </PracticeActionBar>
    </section>

    <section v-else-if="current" class="flex flex-col gap-3" data-test="practice-session">
      <h2 v-if="current.reason === 'application'" data-test="apply-it" class="text-lg font-semibold">
        {{ t('practiceSessionView.applyIt') }}
      </h2>

      <SessionExercise
        v-if="current.kind === 'exercise' && current.exercise"
        :item="current"
        :answer="run.exerciseAnswer.value"
        @answer="run.answer($event)"
        @next="run.nextItem()"
      />
      <PlayAlongTake
        v-else-if="current.kind === 'play_along' && current.play_along && run.tempo.value !== null"
        :item="current"
        :tempo="run.tempo.value"
        :takes-left="run.takesLeft.value"
        :takes-total="run.takesTotal.value"
        @rate="run.rate($event)"
        @skip="run.nextItem()"
        @tempo="run.setTempo($event)"
      />
      <div v-else class="flex flex-col items-start gap-3">
        <p class="text-ink-muted">{{ t('practiceSessionView.unsupported') }}</p>
        <PracticeActionBar>
          <PrimaryButton data-test="skip-unsupported" data-primary-action class="h-12 w-full" @click="run.nextItem()">
            {{ t('practiceSessionView.skip') }}
          </PrimaryButton>
        </PracticeActionBar>
      </div>
    </section>
  </PracticeShell>
</template>
