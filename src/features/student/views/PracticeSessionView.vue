<script setup lang="ts">
/**
 * A practice session, with an instrument in hand or in the head. The student says which
 * instrument they're holding, or none, and how long they have; core composes the session, and
 * today's plan shows what it holds before the student starts it. A tap check comes first when the
 * plan asks for one. Then each exercise, fretboard cell and diagram shape is answered and each play-along played
 * take by take, with a card naming what's next after it, ending with one that applies what was
 * practised, until the plan runs out or the student ends it. After the last item, the student is asked how the
 * drills they practised felt. A session left mid-way, by navigating away or closing or reloading
 * the page, ends as left early.
 *
 * All of it runs in the Practice Shell: × ends a running session, and otherwise leaves for where
 * the student came from. The screen stays on while the session runs.
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { components } from '@/api/generated/core-domain'
import FeltQuestions from '@/features/student/components/FeltQuestions.vue'
import NextUpCard from '@/features/student/components/NextUpCard.vue'
import PracticeSetup from '@/features/student/components/PracticeSetup.vue'
import SessionSummary from '@/features/student/components/SessionSummary.vue'
import type { SetupProblem } from '@/features/student/components/PracticeSetup.vue'
import PlayAlongTake from '@/features/student/components/PlayAlongTake.vue'
import SessionDiagramShape from '@/features/student/components/SessionDiagramShape.vue'
import SessionExercise from '@/features/student/components/SessionExercise.vue'
import SessionFretboardCell from '@/features/student/components/SessionFretboardCell.vue'
import TapCheck from '@/features/student/components/TapCheck.vue'
import TodaysPlan from '@/features/student/components/TodaysPlan.vue'
import { useComposePracticeSession, DEFAULT_SESSION_MINUTES } from '@/features/student/composables/useComposePracticeSession'
import { usePlanItemNames } from '@/features/student/composables/usePlanItemNames'
import { usePracticeSessionRun } from '@/features/student/composables/usePracticeSessionRun'
import { summaryRows } from '@/features/student/utils/sessionSummary'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PracticeShell from '@/shared/components/PracticeShell.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'
import { useWakeLock } from '@/shared/composables/useWakeLock'

type Item = components['schemas']['PracticeSessionItem']

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const { instruments, isLoading, error: instrumentsError, retry: retryInstruments } = useListInstruments()
const { compose, isComposing } = useComposePracticeSession()

/** Only a fretted instrument's diagrams play along yet. */
const playable = computed(() => instruments.value.filter((instrument) => instrument.family === 'fretted'))

// The practice home passes the instrument of the tab it was showing, so a start takes two taps.
const route = useRoute()
const asked = typeof route.query.instrument === 'string' ? route.query.instrument : null

/** The instrument in the student's hands; null for a session in the head. */
const instrumentId = ref<string | null>(null)
const minutes = ref(DEFAULT_SESSION_MINUTES)
watch(
  playable,
  (list) => {
    if (list.some((instrument) => instrument.instrument_id === instrumentId.value)) return
    const preferred = list.find((instrument) => instrument.instrument_id === asked)
    instrumentId.value = (preferred ?? list[0])?.instrument_id ?? null
  },
  { immediate: true },
)

const problem = ref<SetupProblem | null>(null)
// Having nothing to practise is about the choice made; another choice may have something.
watch(instrumentId, () => {
  if (problem.value !== 'failed') problem.value = null
})
const run = shallowRef<ReturnType<typeof usePracticeSessionRun> | null>(null)

/** How a session is labelled by what it is practised on: the instrument's name, or in the head. */
function instrumentLabel(id: string | null): string {
  const instrument = id ? instruments.value.find((candidate) => candidate.instrument_id === id) : undefined
  return instrument ? localizedName(instrument.names) : t('practiceSessionView.inMyHead')
}

/** The open-string pitches of an instrument, which its fretboard cells are drawn and graded with. */
function tuningOf(id: string): string[] | undefined {
  return instruments.value.find((instrument) => instrument.instrument_id === id)?.tuning
}

async function startSession() {
  if (isComposing.value) return
  const inTheHead = instrumentId.value === null
  const outcome = await compose(instrumentId.value, minutes.value)
  if (outcome.kind === 'failed') problem.value = 'failed'
  else if (outcome.kind === 'nothing_to_practise') problem.value = inTheHead ? 'nothing_in_the_head' : 'nothing_to_play'
  if (outcome.kind !== 'composed') return
  problem.value = null
  run.value = usePracticeSessionRun(outcome.plan, { tuningOf })
}

const { labelOf } = usePlanItemNames(() => run.value?.plan.items ?? [])

const started = computed(() => run.value?.started.value ?? false)
const finished = computed(() => run.value?.finished.value ?? false)
const running = computed(() => started.value && !finished.value)
const current = computed(() => run.value?.current.value ?? null)
const currentCellTuning = computed(() => {
  const cell = current.value?.fretboard_cell
  return cell ? tuningOf(cell.layout_instrument_id) : undefined
})

/** The instrument whose fretboard a cell or a shape is on. */
function fretboardOf(item: Item): string | undefined {
  return item.fretboard_cell?.layout_instrument_id ?? item.diagram_shape?.layout_instrument_id
}

/** In a session mixing instruments, each fretboard question names its own; otherwise none does. */
const currentInstrumentName = computed(() => {
  const items = run.value?.plan.items ?? []
  const fretboards = new Set(items.map(fretboardOf).filter((id) => id !== undefined))
  const id = current.value ? fretboardOf(current.value) : undefined
  if (fretboards.size < 2 || !id) return undefined
  const instrument = instruments.value.find((candidate) => candidate.instrument_id === id)
  return instrument ? localizedName(instrument.names) : undefined
})

/** The tap check is tapped on the board of the plan's first fretboard cell, or else of its first diagram shape. */
const tapCheckTuning = computed(() => {
  const items = run.value?.plan.items ?? []
  const layout =
    items.find((item) => item.fretboard_cell)?.fretboard_cell?.layout_instrument_id ??
    items.find((item) => item.diagram_shape)?.diagram_shape?.layout_instrument_id
  return layout ? tuningOf(layout) : undefined
})
const showsTapCheck = computed(() => (run.value?.tapCheckPending.value ?? false) && tapCheckTuning.value !== undefined)
// Without a board to tap on, the tap check is passed over; answers are then judged on their whole time.
watch(
  () => started.value && (run.value?.tapCheckPending.value ?? false) && tapCheckTuning.value === undefined,
  (cannotShow) => {
    if (cannotShow) run.value!.skipTapCheck()
  },
  { immediate: true },
)

useWakeLock(running)

const position = computed(() => {
  const session = run.value
  if (!session || !running.value) return undefined
  const total = session.plan.items.length
  return { current: Math.min(session.index.value + 1, total), total }
})

/** In hand is for playing; with nothing to play there yet, the same minutes go to recall in the head. */
function practiseInTheHead() {
  instrumentId.value = null
  void startSession()
}

/** With nothing to practise in the head either, the home's first run shows where to start. */
function findWhereToStart() {
  leaveHome()
}

function leaveHome() {
  void router.push({ name: 'home' })
}

function practiseAgain() {
  run.value = null
}

const router = useRouter()

/** Back where the student came from, or to the home when the session was opened directly. */
function leave() {
  if (window.history.state?.back) router.back()
  else void router.push({ name: 'home' })
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
    <section v-if="isComposing" class="flex flex-col gap-4" data-test="plan-composing">
      <header class="flex items-baseline justify-between gap-2">
        <h1 class="text-xl font-semibold">{{ t('sessionPlan.title') }}</h1>
        <span class="shrink-0 text-sm text-ink-muted">{{ t('sessionPlan.meta', { minutes, instrument: instrumentLabel(instrumentId) }) }}</span>
      </header>
      <p class="text-sm text-ink-muted">{{ t('practiceSessionView.starting') }}</p>
      <LoadingSkeleton :count="5" />
      <PracticeActionBar>
        <PrimaryButton data-primary-action disabled class="h-12 w-full">{{ t('sessionPlan.start') }}</PrimaryButton>
      </PracticeActionBar>
    </section>

    <PracticeSetup
      v-else-if="!run"
      v-model:instrument-id="instrumentId"
      v-model:minutes="minutes"
      :instruments="playable"
      :instruments-loading="isLoading"
      :instruments-failed="instrumentsError"
      :problem="problem"
      @start="startSession"
      @retry-instruments="retryInstruments()"
      @practise-in-the-head="practiseInTheHead"
      @find-where-to-start="findWhereToStart"
    />

    <TodaysPlan
      v-else-if="!started"
      :items="run.plan.items"
      :minutes="run.plan.minutes"
      :instrument-name="instrumentLabel(run.plan.instrument_id ?? null)"
      :label-of="labelOf"
      @start="run.start()"
    />

    <SessionSummary
      v-else-if="finished"
      :rows="summaryRows(run.plan.items, run.outcomes.value)"
      :minutes="run.elapsedMinutes.value"
      :instrument-name="instrumentLabel(run.plan.instrument_id ?? null)"
      :item-count="run.outcomes.value.size"
      :label-of="labelOf"
      @done="leaveHome"
      @practise-again="practiseAgain"
    />

    <FeltQuestions
      v-else-if="run.askingFelt.value"
      :questions="run.feltQuestions.value"
      :ratings="run.feltRatings.value"
      @rate="(template, felt) => run!.rateFelt(template, felt)"
      @skip="run.skipFelt()"
    />

    <NextUpCard
      v-else-if="run.handoff.value"
      :done-label="labelOf(run.handoff.value.done)"
      :fastest-bpm="run.handoff.value.fastestBpm"
      :next-label="labelOf(run.handoff.value.next)"
      :next-reason="run.handoff.value.next.reason"
      @continue="run.continueToNext()"
    />

    <TapCheck
      v-else-if="showsTapCheck && tapCheckTuning"
      :tuning="tapCheckTuning"
      @complete="run.completeTapCheck($event)"
      @skip="run.skipTapCheck()"
    />

    <section v-else-if="current" class="flex flex-col gap-3" data-test="practice-session">
      <h2 v-if="current.reason === 'application'" data-test="apply-it" class="text-lg font-semibold">
        {{ t('practiceSessionView.applyIt') }}
      </h2>

      <SessionExercise
        v-if="current.kind === 'exercise' && current.exercise"
        :item="current"
        :answer="run.exerciseAnswer.value"
        @answer="run.answer($event)"
        @playing="run.clipPlaying($event)"
        @skip="run.skip($event)"
        @next="run.nextItem()"
      />
      <SessionFretboardCell
        v-else-if="current.kind === 'fretboard_cell' && current.fretboard_cell && currentCellTuning"
        :item="current"
        :tuning="currentCellTuning"
        :instrument-name="currentInstrumentName"
        :answer="run.cellAnswer.value"
        @answer="run.answerCell($event)"
        @next="run.nextItem()"
      />
      <SessionDiagramShape
        v-else-if="current.kind === 'diagram_shape' && current.diagram_shape"
        :item="current"
        :answer="run.shapeAnswer.value"
        :instrument-name="currentInstrumentName"
        @answer="(answer, board) => run!.answerShape(answer, board)"
        @next="run.nextItem()"
        @skip="run.skip($event)"
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
