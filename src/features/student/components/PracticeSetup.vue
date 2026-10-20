<script setup lang="ts">
/**
 * The setup of a practice session, on one screen: the instrument in the student's hands (or none,
 * in the head), how long they have, and what to practise, today's choices already made, so
 * starting is one tap. What to practise is Today's mix, or one skill or concept the student
 * chooses; choosing is always offered, so a student is never kept from practising.
 *
 * What went wrong is said in place, and the way forward is always the one primary action: Try
 * again when the instruments or the session didn't load, choosing what to practise when nothing
 * is suggested or the subject has nothing this way, and finding where to start for a student who
 * has never started anything. The choices are kept through all of it.
 */
import { ChevronRight } from 'lucide-vue-next'
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import InstrumentTilePicker from '@/shared/components/InstrumentTilePicker.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

type Instrument = components['schemas']['Instrument']
type Subject = components['schemas']['PracticeSubject']

/**
 * Why the last attempt to compose a session gave nothing to start: nothing suggested for Today's
 * mix, nothing suggested to a student who has never started a course or path, nothing of the
 * chosen subject this way, or a failure.
 */
export type SetupProblem = 'nothing_to_mix' | 'nothing_started' | 'subject_unavailable' | 'failed'

/** Today's mix, or a subject the student chooses. */
export type WhatToPractise = 'mix' | 'choose'

const MINUTE_CHOICES = [5, 10, 15, 20, 30] as const

const props = defineProps<{
  instruments: Instrument[]
  instrumentsLoading: boolean
  instrumentsFailed: boolean
  problem: SetupProblem | null
  /** The subject chosen, when the student chooses. */
  subject: Subject | null
}>()

const instrumentId = defineModel<string | null>('instrumentId', { required: true })
const minutes = defineModel<number>('minutes', { required: true })
const whatToPractise = defineModel<WhatToPractise>('whatToPractise', { required: true })

const emit = defineEmits<{
  start: []
  retryInstruments: []
  chooseSubject: []
  findWhereToStart: []
}>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()

const choosingWithoutSubject = computed(() => whatToPractise.value === 'choose' && props.subject === null)

const primary = computed(() => {
  if (props.instrumentsFailed) return { label: t('buttons.tryAgain'), press: () => emit('retryInstruments') }
  if (props.problem === 'nothing_started') return { label: t('practiceSessionView.findWhereToStart'), press: () => emit('findWhereToStart') }
  if (props.problem === 'failed') return { label: t('buttons.tryAgain'), press: () => emit('start') }
  if (props.problem === 'nothing_to_mix' || props.problem === 'subject_unavailable' || choosingWithoutSubject.value) {
    return { label: t('practiceSessionView.chooseWhatToPractise'), press: () => emit('chooseSubject') }
  }
  return { label: t('practiceSessionView.start'), press: () => emit('start') }
})

const notice = computed(() => {
  if (props.problem === 'nothing_to_mix') {
    const message = instrumentId.value === null ? t('practiceSessionView.nothingToMixInTheHead') : t('practiceSessionView.nothingToMix')
    return { tone: 'unavailable', message } as const
  }
  if (props.problem === 'nothing_started') return { tone: 'unavailable', message: t('practiceSessionView.nothingStarted') } as const
  if (props.problem === 'subject_unavailable') {
    const subject = props.subject ? localizedName(props.subject.names) : ''
    return { tone: 'unavailable', message: t('practiceSessionView.subjectUnavailable', { subject }) } as const
  }
  if (props.problem === 'failed') return { tone: 'error', message: t('practiceSessionView.planError') } as const
  return null
})

/** With nothing suggested, choosing is the way out, so the notice says so right under the instruments and the choice stands aside. */
const nothingToMix = computed(() => props.problem === 'nothing_to_mix')

const subjectDetail = computed(() => {
  const level = props.subject?.level
  return level ? t('practiceSessionView.levelTapToChange', { level: t(`practiceHomeView.levels.${level}`) }) : t('practiceSessionView.tapToChange')
})

const CHOICE = 'flex h-12 cursor-pointer items-center rounded-md border px-4 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus'
const LEGEND = 'mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle'
</script>

<template>
  <section class="flex flex-col gap-5" data-test="practice-setup">
    <header class="flex flex-col gap-1">
      <h1 class="text-xl font-semibold">{{ t('practiceSessionView.title') }}</h1>
      <p class="text-sm text-ink-muted">{{ t('practiceSessionView.intro') }}</p>
    </header>

    <LoadingSkeleton v-if="instrumentsLoading" />
    <InlineNotice v-else-if="instrumentsFailed" :message="t('practiceSessionView.instrumentsError')" />
    <InstrumentTilePicker
      v-else
      v-model="instrumentId"
      :instruments="instruments"
      :label="t('practiceSessionView.instrumentLabel')"
      :none-label="t('practiceSessionView.inMyHead')"
    />

    <InlineNotice v-if="nothingToMix && notice" :tone="notice.tone" :message="notice.message" />

    <fieldset class="flex flex-col gap-1.5">
      <legend :class="LEGEND">{{ t('practiceSessionView.minutesLabel') }}</legend>
      <div class="flex flex-wrap gap-2">
        <label
          v-for="choice in MINUTE_CHOICES"
          :key="choice"
          :class="[CHOICE, minutes === choice ? 'border-accent bg-accent-muted' : 'border-border']"
        >
          <input v-model="minutes" type="radio" name="minutes" class="sr-only" :value="choice" :data-test="`minutes-${choice}`" />
          {{ t('practiceSessionView.minutesOption', { minutes: choice }) }}
        </label>
      </div>
    </fieldset>

    <fieldset v-if="!nothingToMix" class="flex flex-col gap-3">
      <legend :class="LEGEND">{{ t('practiceSessionView.whatToPractise') }}</legend>
      <div class="flex gap-2">
        <label
          v-for="choice in (['mix', 'choose'] as const)"
          :key="choice"
          :data-test="`what-to-practise-${choice}`"
          :class="[CHOICE, 'flex-1 justify-center font-medium', whatToPractise === choice ? 'border-accent bg-accent-muted' : 'border-border']"
        >
          <input v-model="whatToPractise" type="radio" name="what-to-practise" class="sr-only" :value="choice" />
          {{ choice === 'mix' ? t('practiceSessionView.todaysMix') : t('practiceSessionView.illChoose') }}
        </label>
      </div>

      <template v-if="whatToPractise === 'choose'">
        <button
          type="button"
          data-test="chosen-subject"
          class="flex min-h-16 w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          :class="subject ? 'border-accent bg-accent-muted' : 'border-dashed border-border'"
          @click="emit('chooseSubject')"
        >
          <span v-if="subject" class="flex min-w-0 flex-1 flex-col">
            <span class="font-semibold text-ink">{{ localizedName(subject.names) }}</span>
            <span class="text-xs text-ink-muted">{{ subjectDetail }}</span>
          </span>
          <span v-else class="min-w-0 flex-1 font-medium text-ink-muted">{{ t('practiceSessionView.pickSubject') }}</span>
          <ChevronRight :size="20" class="shrink-0 text-ink-muted" aria-hidden="true" />
        </button>
        <p v-if="subject" class="text-sm text-ink-muted">{{ t('practiceSessionView.chosenHint', { minutes }) }}</p>
      </template>
      <p v-else class="text-sm text-ink-muted">{{ t('practiceSessionView.mixHint') }}</p>
    </fieldset>

    <InlineNotice v-if="!nothingToMix && notice" :tone="notice.tone" :message="notice.message" />

    <PracticeActionBar>
      <PrimaryButton
        data-test="start-session"
        data-primary-action
        :disabled="instrumentsLoading"
        class="h-12 w-full"
        @click="primary.press()"
      >
        {{ primary.label }}
      </PrimaryButton>
    </PracticeActionBar>
  </section>
</template>
