<script setup lang="ts">
/**
 * "How did it feel?" at the end of a session, about at most two of the timed drills the student
 * practised: one tap each, Easy, About right or Hard. The answers only tune how fast counts as
 * fluent for a drill; they never count toward the student's own level. Skipping is always fine.
 */
import type { components } from '@/api/generated/event-ingestion'
import { feltDrillKey } from '@/features/student/utils/feltDrill'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

type FeltRating = components['schemas']['FeltRating']
type Felt = FeltRating['felt']

const FELT_CHOICES = [
  { felt: 'easy', key: 'feltQuestions.easy' },
  { felt: 'about_right', key: 'feltQuestions.aboutRight' },
  { felt: 'hard', key: 'feltQuestions.hard' },
] as const

const props = defineProps<{
  /** The drill templates asked about, in order. */
  questions: string[]
  /** The answers given so far. */
  ratings: FeltRating[]
}>()

const emit = defineEmits<{ rate: [template: string, felt: Felt]; skip: [] }>()

const { t } = useTypedT()

const given = (template: string) => props.ratings.find((rating) => rating.drill_template_key === template)?.felt
</script>

<template>
  <section class="flex flex-col gap-5" data-test="felt-questions">
    <h2 class="text-xl font-semibold">{{ t('feltQuestions.title') }}</h2>

    <fieldset v-for="template in questions" :key="template" data-test="felt-question" class="flex flex-col gap-2">
      <legend class="mb-2 text-sm font-medium">{{ t(feltDrillKey(template)) }}</legend>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="choice in FELT_CHOICES"
          :key="choice.felt"
          type="button"
          :data-felt="choice.felt"
          :aria-pressed="given(template) === choice.felt"
          class="h-12 rounded-md border px-2 text-sm font-medium"
          :class="given(template) === choice.felt ? 'border-accent bg-accent-muted' : 'border-border hover:border-accent'"
          @click="emit('rate', template, choice.felt)"
        >
          {{ t(choice.key) }}
        </button>
      </div>
    </fieldset>

    <PracticeActionBar>
      <button type="button" data-test="skip-felt" class="h-12 px-3 text-sm font-medium text-accent-text underline" @click="emit('skip')">
        {{ t('feltQuestions.skip') }}
      </button>
    </PracticeActionBar>
  </section>
</template>
