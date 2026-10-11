<script setup lang="ts">
/**
 * The home of a student who has never started a course or a path: two questions, then Where to
 * start. The answers live only in the address, so a detail's back arrow returns to the same
 * results and nothing is stored: the first run shows until something is started.
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { components } from '@/api/generated/core-domain'
import { useAuth } from '@/features/auth/composables/useAuth'
import FirstRunQuestions from '@/features/student/components/FirstRunQuestions.vue'
import WhereToStart from '@/features/student/components/WhereToStart.vue'
import type { FirstRunAnswers } from '@/features/student/composables/useStartingPoints'
import { conciergeNumber, conciergeWhatsAppUrl } from '@/features/student/utils/conciergeLink'
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

type Experience = components['schemas']['StartingPointExperience']

const EXPERIENCES: readonly string[] = ['never_played', 'plays_a_bit', 'plays_well']

function isExperience(value: unknown): value is Experience {
  return typeof value === 'string' && EXPERIENCES.includes(value)
}

const { t } = useTypedT()
const route = useRoute()
const router = useRouter()
const { accountName } = useAuth()
const { localizedName } = useLocalizedName()
const { instruments, isLoading: instrumentsLoading, error: instrumentsFailed, retry: retryInstruments } = useListInstruments()

const greeting = computed(() =>
  accountName.value.firstName ? t('firstRun.welcome', { name: accountName.value.firstName }) : t('firstRun.welcomeNoName'),
)

const answers = computed<FirstRunAnswers | null>(() => {
  const { instrument, experience } = route.query
  return typeof instrument === 'string' && instrument && isExperience(experience) ? { instrumentId: instrument, experience } : null
})
// Change goes back to the questions with the answers kept, still only in the address.
const asking = computed(() => answers.value === null || route.query.change === '1')

const instrumentName = computed(() => {
  const chosen = instruments.value.find((instrument) => instrument.instrument_id === answers.value?.instrumentId)
  return chosen ? localizedName(chosen.names) : ''
})

const whatsAppUrl = computed(() => conciergeWhatsAppUrl(conciergeNumber(), t('firstRun.whatsAppMessage')))

function show(chosen: FirstRunAnswers) {
  void router.push({ name: 'home', query: { instrument: chosen.instrumentId, experience: chosen.experience } })
}

function change() {
  if (answers.value) {
    void router.push({ name: 'home', query: { instrument: answers.value.instrumentId, experience: answers.value.experience, change: '1' } })
  }
}
</script>

<template>
  <!-- The questions read in one narrow column; the results may spread wider, as tiles on a wide screen. -->
  <div data-test="first-run" class="mx-auto flex w-full flex-col gap-5" :class="asking ? 'max-w-[35rem]' : 'max-w-4xl'">
    <div class="flex flex-col gap-1">
      <h1 class="text-xl font-bold text-ink">{{ greeting }}</h1>
      <p v-if="asking" class="text-base text-ink-muted">{{ t('firstRun.intro') }}</p>
    </div>

    <FirstRunQuestions
      v-if="asking || !answers"
      :initial="answers ?? {}"
      :instruments="instruments"
      :instruments-loading="instrumentsLoading"
      :instruments-failed="instrumentsFailed"
      @submit="show"
      @retry-instruments="retryInstruments()"
    />
    <WhereToStart v-else :answers="answers" :instrument-name="instrumentName" :whats-app-url="whatsAppUrl" @change="change" />

    <div class="flex flex-col items-center gap-1">
      <a
        v-if="whatsAppUrl"
        data-test="first-run-whatsapp"
        :href="whatsAppUrl"
        target="_blank"
        rel="noopener"
        class="inline-flex min-h-12 items-center text-sm font-semibold text-accent-text"
        >{{ t('firstRun.notSure') }}</a
      >
      <RouterLink
        data-test="first-run-discover"
        :to="{ name: 'path-catalog' }"
        class="inline-flex min-h-12 items-center text-sm font-semibold text-accent-text"
        >{{ t('firstRun.browse') }}</RouterLink
      >
    </div>
  </div>
</template>
