<script setup lang="ts">
/**
 * A practice session, with an instrument in hand or in the head. The student says which
 * instrument they're holding, or none, and how long they have; core composes the session, and
 * today's plan shows what it holds before the student starts it. A tap check comes first when the
 * plan asks for one. Then each exercise, fretboard cell and diagram shape is answered, each play-along played
 * take by take, with a card naming what's next after it, each chord rated and each minute of changes counted, ending with one that applies what was
 * practised, until the plan runs out or the student ends it. After the last item, the student is asked how the
 * drills they practised felt. A session left mid-way, by navigating away or closing or reloading
 * the page, ends as left early.
 *
 * What to practise is Today's mix, or one skill or concept the student chooses in a picker that
 * opens as a page inside the shell, like Tools. A "Practise this" elsewhere opens the setup with
 * its subject already chosen.
 *
 * All of it runs in the Practice Shell: × ends a running session, and otherwise leaves for where
 * the student came from. The screen stays on while the session runs. On the setup, and only
 * there, the shell's header offers Tools, which open as a page inside the shell; its arrow, or
 * the device's Back, returns to the setup as it was.
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { components } from '@/api/generated/core-domain'
import FeltQuestions from '@/features/student/components/FeltQuestions.vue'
import NextUpCard from '@/features/student/components/NextUpCard.vue'
import PracticeSetup from '@/features/student/components/PracticeSetup.vue'
import PracticeSubjectPicker from '@/features/student/components/PracticeSubjectPicker.vue'
import SessionSummary from '@/features/student/components/SessionSummary.vue'
import type { SetupProblem, WhatToPractise } from '@/features/student/components/PracticeSetup.vue'
import PlayAlongTake from '@/features/student/components/PlayAlongTake.vue'
import SessionChordChange from '@/features/student/components/SessionChordChange.vue'
import SessionChordVoicing from '@/features/student/components/SessionChordVoicing.vue'
import SessionDiagramShape from '@/features/student/components/SessionDiagramShape.vue'
import SessionGeneratedChoice from '@/features/student/components/SessionGeneratedChoice.vue'
import SessionExercise from '@/features/student/components/SessionExercise.vue'
import SessionFretboardCell from '@/features/student/components/SessionFretboardCell.vue'
import TapCheck from '@/features/student/components/TapCheck.vue'
import TodaysPlan from '@/features/student/components/TodaysPlan.vue'
import { useComposePracticeSession, DEFAULT_SESSION_MINUTES } from '@/features/student/composables/useComposePracticeSession'
import { useFirstRun } from '@/features/student/composables/useFirstRun'
import { usePlanItemNames } from '@/features/student/composables/usePlanItemNames'
import { usePracticeSessionRun } from '@/features/student/composables/usePracticeSessionRun'
import { usePracticeSubjects } from '@/features/student/composables/usePracticeSubjects'
import { reviewResult, subjectResults } from '@/features/student/utils/focusPlan'
import { findSubject } from '@/features/student/utils/practiceSubjects'
import { summaryRows } from '@/features/student/utils/sessionSummary'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PracticeShell from '@/shared/components/PracticeShell.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import MetronomeTool from '@/shared/components/MetronomeTool.vue'
import ToolsMenu from '@/shared/components/ToolsMenu.vue'
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useOverlayHistory } from '@/shared/composables/useOverlayHistory'
import { usePracticeTool } from '@/shared/composables/usePracticeTool'
import { useTypedT } from '@/shared/composables/useTypedT'
import { useWakeLock } from '@/shared/composables/useWakeLock'

type Item = components['schemas']['PracticeSessionItem']
type Subject = components['schemas']['PracticeSubject']

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

// A "Practise this" names its subject; the setup opens on it once the subjects have loaded.
let askedFocus = typeof route.query.focus === 'string' ? route.query.focus : null
const whatToPractise = ref<WhatToPractise>(askedFocus ? 'choose' : 'mix')
const subject = ref<Subject | null>(null)
const subjects = usePracticeSubjects(() => instrumentId.value)
// The subjects follow the instrument: the one chosen is kept, with its level for this instrument,
// while the instrument has something of it, and let go of otherwise. The subject a "Practise this"
// asked for waits for a list that has it, since the instrument may still be settling.
watch(
  subjects.list,
  (list) => {
    if (!list) return
    if (subject.value) {
      subject.value = findSubject(list, subject.value.node_id)
      return
    }
    const asked = askedFocus ? findSubject(list, askedFocus) : null
    if (!asked) return
    subject.value = asked
    askedFocus = null
  },
  { immediate: true },
)

/** The subject picker, open over the setup as a page with its own history entry, like Tools. */
const pickerOpen = ref(false)
useOverlayHistory(pickerOpen, () => {
  pickerOpen.value = false
})
function openPicker() {
  pickerOpen.value = true
}
// Choosing with nothing chosen yet goes straight to the picker.
watch(whatToPractise, (choice) => {
  if (choice === 'choose' && subject.value === null) openPicker()
})
function pick(picked: Subject) {
  askedFocus = null
  subject.value = picked
  whatToPractise.value = 'choose'
  pickerOpen.value = false
}

const { status: firstRunStatus } = useFirstRun()

const problem = ref<SetupProblem | null>(null)
// Having nothing to practise is about the choice made; another choice may have something.
watch([instrumentId, whatToPractise, subject], () => {
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
  const chosen = whatToPractise.value === 'choose' ? subject.value : null
  if (whatToPractise.value === 'choose' && !chosen) {
    openPicker()
    return
  }
  const outcome = await compose(instrumentId.value, minutes.value, chosen?.node_id)
  if (outcome.kind === 'failed') problem.value = 'failed'
  else if (outcome.kind === 'nothing_to_practise') {
    if (chosen) problem.value = 'subject_unavailable'
    else problem.value = firstRunStatus.value === 'first-run' ? 'nothing_started' : 'nothing_to_mix'
  }
  if (outcome.kind !== 'composed') return
  problem.value = null
  run.value = usePracticeSessionRun(outcome.plan, { tuningOf })
}

const { labelOf } = usePlanItemNames(() => run.value?.plan.items ?? [])

const practiceTool = usePracticeTool()
const openTool = computed(() => practiceTool.tool.value)
/** Tools are for the setup: never once a session is being composed, shown or run, nor over the picker. */
const offersTools = computed(() => !run.value && !isComposing.value && openTool.value === null && !pickerOpen.value)

const started = computed(() => run.value?.started.value ?? false)
const finished = computed(() => run.value?.finished.value ?? false)
const running = computed(() => started.value && !finished.value)
const current = computed(() => run.value?.current.value ?? null)
const currentCellTuning = computed(() => {
  const cell = current.value?.fretboard_cell
  return cell ? tuningOf(cell.layout_instrument_id) : undefined
})

/** The instrument whose fretboard a cell, a shape or a bass chord item is on. */
function fretboardOf(item: Item): string | undefined {
  return (
    item.fretboard_cell?.layout_instrument_id ??
    item.diagram_shape?.layout_instrument_id ??
    item.root_fifth?.layout_instrument_id ??
    item.root_change?.layout_instrument_id
  )
}

/** The tuning a bass chord item's board is drawn with; none for a chord on guitar, drawn as its box. */
const currentBassTuning = computed(() => {
  const layout = current.value?.root_fifth?.layout_instrument_id ?? current.value?.root_change?.layout_instrument_id
  return layout ? tuningOf(layout) : undefined
})

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

/** How each subject of the finished session went, and the quick review of other subjects. */
const results = computed(() => {
  const session = run.value
  if (!session) return { subjects: [], review: null }
  return { subjects: subjectResults(session.plan, session.outcomes.value), review: reviewResult(session.plan, session.outcomes.value) }
})

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
  if (pickerOpen.value) pickerOpen.value = false
  else if (openTool.value) practiceTool.close()
  else if (running.value) run.value!.end()
  else leave()
}

const exitLabel = computed(() => {
  if (openTool.value || pickerOpen.value) return t('tools.back')
  return running.value ? t('practiceSessionView.endSession') : t('practiceSessionView.close')
})

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
    :exit-label="exitLabel"
    :position="position"
    :progress="running ? run!.progress.value : undefined"
    :title="openTool === 'metronome' ? t('tools.metronome') : undefined"
    @exit="exit"
  >
    <template v-if="offersTools" #options>
      <ToolsMenu @open="practiceTool.open" />
    </template>

    <MetronomeTool v-if="openTool === 'metronome'" />

    <section v-else-if="isComposing" class="flex flex-col gap-4" data-test="plan-composing">
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

    <PracticeSubjectPicker
      v-else-if="!run && pickerOpen"
      :list="subjects.list.value"
      :is-loading="subjects.isLoading.value"
      :error="subjects.error.value"
      @pick="pick"
      @retry="subjects.retry()"
    />

    <PracticeSetup
      v-else-if="!run"
      v-model:instrument-id="instrumentId"
      v-model:minutes="minutes"
      v-model:what-to-practise="whatToPractise"
      :instruments="playable"
      :instruments-loading="isLoading"
      :instruments-failed="instrumentsError"
      :problem="problem"
      :subject="subject"
      @start="startSession"
      @retry-instruments="retryInstruments()"
      @choose-subject="openPicker"
      @find-where-to-start="findWhereToStart"
    />

    <TodaysPlan
      v-else-if="!started"
      :items="run.plan.items"
      :minutes="run.plan.minutes"
      :instrument-name="instrumentLabel(run.plan.instrument_id ?? null)"
      :label-of="labelOf"
      :focus-source="run.plan.focus_source"
      :focus-nodes="run.plan.focus_nodes"
      @start="run.start()"
    />

    <SessionSummary
      v-else-if="finished"
      :rows="summaryRows(run.plan.items, run.outcomes.value)"
      :minutes="run.elapsedMinutes.value"
      :instrument-name="instrumentLabel(run.plan.instrument_id ?? null)"
      :item-count="run.outcomes.value.size"
      :label-of="labelOf"
      :subjects="results.subjects"
      :review="results.review"
      :chosen="run.plan.focus_source === 'chosen'"
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
      :fastest-note-value="run.handoff.value.fastestNoteValue"
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
      <SessionGeneratedChoice
        v-else-if="current.generated_choice"
        :item="current"
        :answer="run.generatedAnswer.value"
        :instrument-name="currentInstrumentName"
        @answer="(answer, grading) => run!.answerGenerated(answer, grading)"
        @playing="run.clipPlaying($event)"
        @next="run.nextItem()"
        @skip="run.skip($event)"
      />
      <PlayAlongTake
        v-else-if="current.kind === 'play_along' && current.play_along && run.tempo.value !== null && run.noteValue.value !== null"
        :item="current"
        :tempo="run.tempo.value"
        :note-value="run.noteValue.value"
        :takes-left="run.takesLeft.value"
        :takes-total="run.takesTotal.value"
        @rate="run.rate($event)"
        @skip="run.skip($event)"
        @tempo="run.setTempo($event)"
        @note-value="run.setNoteValue($event)"
      />
      <SessionChordVoicing
        v-else-if="current.chord_voicing || current.root_fifth"
        :key="run.index.value"
        :item="current"
        :tuning="currentBassTuning"
        :instrument-name="currentInstrumentName"
        @rate="run.rateChord($event)"
        @skip="run.skip($event)"
      />
      <SessionChordChange
        v-else-if="current.chord_change || current.root_change"
        :key="run.index.value"
        :item="current"
        :tuning="currentBassTuning"
        :instrument-name="currentInstrumentName"
        @save="(tempo, changes) => run!.saveChangeMinute(tempo, changes)"
        @skip="run.skip($event)"
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
