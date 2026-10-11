<script setup lang="ts">
/**
 * Where to start: the student's answers with Change, how many paths and courses there are, and
 * each one in order — or, when none suit the answers, the instrument's closest levels, or that
 * the instrument has nothing yet. Every row's detail can lead back here with the same answers.
 */
import { computed, toRef } from 'vue'

import StartingPointRow from '@/features/student/components/StartingPointRow.vue'
import { useStartingPoints, type FirstRunAnswers, type StartingPointItem } from '@/features/student/composables/useStartingPoints'
import AppButton from '@/shared/components/AppButton.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{
  answers: FirstRunAnswers
  /** The chosen instrument's name, as the student reads it. */
  instrumentName: string
  /** Where WhatsApp opens with the concierge, or null when this build has none. */
  whatsAppUrl: string | null
}>()
const emit = defineEmits<{ change: [] }>()

const { t } = useTypedT()
const { sizeClass } = useSizeClass()
const { state, items, retry } = useStartingPoints(toRef(props, 'answers'))

// In the middle of a sentence the instrument reads in lower case ("on electric bass").
const instrumentInSentence = computed(() => props.instrumentName.toLocaleLowerCase())

const count = computed(() => {
  const paths = items.value.filter((item) => item.kind === 'path').length
  const courses = items.value.length - paths
  return [
    paths > 0 ? t('firstRun.paths', { count: paths }) : null,
    courses > 0 ? t('firstRun.courses', { count: courses }) : null,
  ]
    .filter((part) => part !== null)
    .join(' · ')
})

function detail(item: StartingPointItem) {
  const query = { startInstrument: props.answers.instrumentId, startExperience: props.answers.experience }
  return item.kind === 'path'
    ? { name: 'path-detail', params: { learningPathId: item.id }, query }
    : { name: 'course-detail', params: { courseId: item.id }, query }
}
</script>

<template>
  <section data-test="where-to-start" class="flex flex-col gap-4">
    <div class="flex items-start justify-between gap-3">
      <div class="flex flex-col gap-1">
        <h2 class="text-lg font-bold text-ink">{{ t('firstRun.whereToStart') }}</h2>
        <p data-test="where-to-start-answers" class="text-sm text-ink-muted">
          {{ instrumentName }} · {{ t(`firstRun.experiences.${answers.experience}`) }}
        </p>
      </div>
      <AppButton data-test="where-to-start-change" variant="tertiary" @click="emit('change')">{{ t('firstRun.change') }}</AppButton>
    </div>

    <LoadingSkeleton v-if="state === 'loading' || state === 'idle'" />
    <LoadFailed v-else-if="state === 'failed'" :message="t('firstRun.error')" @retry="retry()" />

    <StateBlock
      v-else-if="state === 'nothing'"
      kind="empty"
      :title="t('firstRun.nothingTitle', { instrument: instrumentInSentence })"
      :message="t('firstRun.nothingMessage')"
    >
      <template v-if="whatsAppUrl" #action>
        <a
          data-test="where-to-start-whatsapp"
          :href="whatsAppUrl"
          target="_blank"
          rel="noopener"
          class="inline-flex min-h-12 items-center justify-center rounded-full border border-accent px-5 text-sm font-semibold text-accent-text hover:bg-accent-muted"
          >{{ t('firstRun.askWhatsApp') }}</a
        >
      </template>
    </StateBlock>

    <template v-else>
      <p v-if="state === 'closest'" class="text-sm text-ink">
        {{
          answers.experience === 'never_played'
            ? t('firstRun.closestNew', { instrument: instrumentInSentence })
            : t('firstRun.closestLevel', { instrument: instrumentInSentence })
        }}
      </p>
      <p v-else data-test="where-to-start-count" class="text-sm font-semibold text-ink-muted">{{ count }}</p>
      <ul class="grid gap-3" :class="{ 'grid-cols-3': sizeClass === 'expanded' }">
        <li v-for="item in items" :key="`${item.kind}-${item.id}`" class="flex">
          <StartingPointRow :item="item" :to="detail(item)" class="w-full" />
        </li>
      </ul>
    </template>
  </section>
</template>
