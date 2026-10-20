<script setup lang="ts">
/**
 * The first run's two questions: what the student wants to play (every catalog instrument, none
 * chosen) and how much they have played it (Never played chosen). The button waits for an
 * instrument.
 */
import { computed, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { FirstRunAnswers } from '@/features/student/composables/useStartingPoints'
import AppButton from '@/shared/components/AppButton.vue'
import ChoiceChip from '@/shared/components/ChoiceChip.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

type Experience = components['schemas']['StartingPointExperience']

type Instrument = components['schemas']['Instrument']

const props = defineProps<{
  initial: Partial<FirstRunAnswers>
  instruments: Instrument[]
  instrumentsLoading: boolean
  instrumentsFailed: boolean
}>()
const emit = defineEmits<{ submit: [answers: FirstRunAnswers]; retryInstruments: [] }>()

const EXPERIENCES: Experience[] = ['never_played', 'plays_a_bit', 'plays_well']

const { t } = useTypedT()
const { localizedName } = useLocalizedName()

const instrumentId = ref<string | null>(props.initial.instrumentId ?? null)
const experience = ref<Experience>(props.initial.experience ?? 'never_played')
const ready = computed(() => instrumentId.value !== null)

function submit() {
  if (instrumentId.value) emit('submit', { instrumentId: instrumentId.value, experience: experience.value })
}
</script>

<template>
  <section data-test="first-run-questions" class="flex flex-col gap-5 rounded-lg border border-border bg-surface-raised p-4">
    <fieldset class="flex flex-col gap-2">
      <legend class="mb-1 text-base font-semibold text-ink">{{ t('firstRun.instrumentQuestion') }}</legend>
      <LoadingSkeleton v-if="instrumentsLoading" shape="lines" :count="1" />
      <LoadFailed v-else-if="instrumentsFailed" :message="t('firstRun.error')" @retry="emit('retryInstruments')" />
      <div v-else class="flex flex-wrap gap-x-2">
        <ChoiceChip
          v-for="instrument in instruments"
          :key="instrument.instrument_id"
          :label="localizedName(instrument.names)"
          :selected="instrumentId === instrument.instrument_id"
          @toggle="instrumentId = instrument.instrument_id"
        />
      </div>
    </fieldset>

    <fieldset class="flex flex-col gap-2">
      <legend class="mb-1 text-base font-semibold text-ink">{{ t('firstRun.experienceQuestion') }}</legend>
      <div class="flex flex-wrap gap-x-2">
        <ChoiceChip
          v-for="option in EXPERIENCES"
          :key="option"
          :label="t(`firstRun.experiences.${option}`)"
          :selected="experience === option"
          @toggle="experience = option"
        />
      </div>
    </fieldset>

    <AppButton data-test="show-where-to-start" block :disabled="!ready" @click="submit">{{ t('firstRun.show') }}</AppButton>
  </section>
</template>
