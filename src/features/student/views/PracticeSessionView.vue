<script setup lang="ts">
/**
 * A practice session with an instrument in hand. The student says which instrument they're
 * holding and how long they have; core composes the session; then each item is played along
 * take by take, until the plan runs out or the student ends it. A session left mid-way, by
 * navigating away, ends as left early.
 */
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'

import PlayAlongTake from '@/features/student/components/PlayAlongTake.vue'
import { useComposePracticeSession } from '@/features/student/composables/useComposePracticeSession'
import { usePracticeSessionRun } from '@/features/student/composables/usePracticeSessionRun'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

const MINUTE_CHOICES = [5, 10, 15, 20, 30] as const

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
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

const composeError = ref<'instrument_gone' | 'failed' | null>(null)
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

function practiseAgain() {
  run.value = null
}

onBeforeUnmount(() => run.value?.end())
</script>

<template>
  <section class="flex flex-col" :class="run && !finished ? 'gap-3' : 'gap-5'" data-test="practice-session">
    <template v-if="!run">
      <header class="flex flex-col gap-1">
        <h1 class="text-xl font-semibold">{{ t('practiceSessionView.title') }}</h1>
        <p class="text-sm text-ink-muted">{{ t('practiceSessionView.intro') }}</p>
      </header>

      <StateLoading v-if="isLoading" :noun="t('practiceSessionView.loadingNoun')" />
      <StateError v-else-if="instrumentsError" :message="t('practiceSessionView.instrumentsError')" @retry="retryInstruments()" />
      <p v-else-if="playable.length === 0" class="text-ink-muted">{{ t('practiceSessionView.noInstruments') }}</p>

      <div v-else class="flex flex-col gap-5">
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {{ t('practiceSessionView.instrumentLabel') }}
          </span>
          <select
            v-model="instrumentId"
            data-test="instrument"
            class="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm"
          >
            <option v-for="instrument in playable" :key="instrument.instrument_id" :value="instrument.instrument_id">
              {{ localizedName(instrument.names) }}
            </option>
          </select>
        </label>

        <fieldset class="flex flex-col gap-1.5">
          <legend class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {{ t('practiceSessionView.minutesLabel') }}
          </legend>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="choice in MINUTE_CHOICES"
              :key="choice"
              class="cursor-pointer rounded-md border px-3 py-2 text-sm"
              :class="minutes === choice ? 'border-accent bg-accent-muted' : 'border-border'"
            >
              <input v-model="minutes" type="radio" name="minutes" class="sr-only" :value="choice" :data-test="`minutes-${choice}`" />
              {{ t('practiceSessionView.minutesOption', { minutes: choice }) }}
            </label>
          </div>
        </fieldset>

        <p v-if="composeError === 'instrument_gone'" class="text-sm text-danger" role="alert">
          {{ t('practiceSessionView.instrumentGone') }}
        </p>
        <p v-else-if="composeError === 'failed'" class="text-sm text-danger" role="alert">
          {{ t('practiceSessionView.planError') }}
        </p>

        <PrimaryButton data-test="start-session" :disabled="isComposing || !instrumentId" class="self-start" @click="startSession">
          {{ isComposing ? t('practiceSessionView.starting') : t('practiceSessionView.start') }}
        </PrimaryButton>
      </div>
    </template>

    <div v-else-if="finished" class="flex flex-col items-start gap-3" data-test="session-done">
      <h1 class="text-xl font-semibold">{{ t('practiceSessionView.doneTitle') }}</h1>
      <p class="text-ink-muted">{{ t('practiceSessionView.doneBody', { count: run.answeredCount.value }) }}</p>
      <div class="flex flex-wrap items-center gap-4">
        <PrimaryButton data-test="practise-again" @click="practiseAgain">{{ t('practiceSessionView.practiseAgain') }}</PrimaryButton>
        <RouterLink :to="{ name: 'path' }" class="text-sm font-medium text-accent-text underline">
          {{ t('practiceSessionView.backToPath') }}
        </RouterLink>
      </div>
    </div>

    <template v-else-if="current">
      <div class="flex items-center gap-3">
        <div
          class="flex flex-1 gap-1"
          role="progressbar"
          :aria-label="t('practiceSessionView.progressLabel')"
          aria-valuemin="0"
          :aria-valuemax="run.plan.items.length"
          :aria-valuenow="run.index.value"
        >
          <div
            v-for="(filled, i) in run.progress.value"
            :key="i"
            data-test="session-segment"
            :data-filled="Math.round(filled * 100)"
            class="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken"
          >
            <div class="h-full bg-accent transition-all" :style="{ width: `${filled * 100}%` }" />
          </div>
        </div>
        <button type="button" data-test="end-session" class="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm" @click="run.end()">
          {{ t('practiceSessionView.endSession') }}
        </button>
      </div>

      <PlayAlongTake
        v-if="current.kind === 'play_along' && current.play_along && run.tempo.value !== null"
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
        <button type="button" data-test="skip-unsupported" class="text-sm font-medium text-accent-text underline" @click="run.nextItem()">
          {{ t('practiceSessionView.skip') }}
        </button>
      </div>
    </template>
  </section>
</template>
