<script setup lang="ts">
/**
 * The setup of a practice session, on one screen: the instrument in the student's hands (or none,
 * in the head) and how long they have, today's choice already made, so starting is one tap.
 *
 * What went wrong is said in place, and the way forward is always the one primary action: Try
 * again when the instruments or the session didn't load, practising in the head when there is
 * nothing to play on the instrument, and finding where to start when there is nothing to practise
 * in the head either. The choices are kept through all of it.
 */
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import InstrumentTilePicker from '@/shared/components/InstrumentTilePicker.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

type Instrument = components['schemas']['Instrument']

/** Why the last attempt to compose a session gave nothing to start. */
export type SetupProblem = 'nothing_to_play' | 'nothing_in_the_head' | 'failed'

const MINUTE_CHOICES = [5, 10, 15, 20, 30] as const

const props = defineProps<{
  instruments: Instrument[]
  instrumentsLoading: boolean
  instrumentsFailed: boolean
  problem: SetupProblem | null
}>()

const instrumentId = defineModel<string | null>('instrumentId', { required: true })
const minutes = defineModel<number>('minutes', { required: true })

const emit = defineEmits<{
  start: []
  retryInstruments: []
  practiseInTheHead: []
  findWhereToStart: []
}>()

const { t } = useTypedT()

const primary = computed(() => {
  if (props.instrumentsFailed) return { label: t('buttons.tryAgain'), press: () => emit('retryInstruments') }
  if (props.problem === 'nothing_to_play') return { label: t('practiceSessionView.practiseInTheHead'), press: () => emit('practiseInTheHead') }
  if (props.problem === 'nothing_in_the_head') return { label: t('practiceSessionView.findWhereToStart'), press: () => emit('findWhereToStart') }
  if (props.problem === 'failed') return { label: t('buttons.tryAgain'), press: () => emit('start') }
  return { label: t('practiceSessionView.start'), press: () => emit('start') }
})

const notice = computed(() => {
  if (props.problem === 'nothing_to_play') return { tone: 'unavailable', message: t('practiceSessionView.nothingToPlay') } as const
  if (props.problem === 'nothing_in_the_head') return { tone: 'unavailable', message: t('practiceSessionView.nothingInTheHead') } as const
  if (props.problem === 'failed') return { tone: 'error', message: t('practiceSessionView.planError') } as const
  return null
})
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

    <fieldset class="flex flex-col gap-1.5">
      <legend class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {{ t('practiceSessionView.minutesLabel') }}
      </legend>
      <div class="flex flex-wrap gap-2">
        <label
          v-for="choice in MINUTE_CHOICES"
          :key="choice"
          class="flex h-12 cursor-pointer items-center rounded-md border px-4 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus"
          :class="minutes === choice ? 'border-accent bg-accent-muted' : 'border-border'"
        >
          <input v-model="minutes" type="radio" name="minutes" class="sr-only" :value="choice" :data-test="`minutes-${choice}`" />
          {{ t('practiceSessionView.minutesOption', { minutes: choice }) }}
        </label>
      </div>
    </fieldset>

    <InlineNotice v-if="notice" :tone="notice.tone" :message="notice.message" />

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
