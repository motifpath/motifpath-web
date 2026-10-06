<script setup lang="ts">
/**
 * The practice dashboard, which the app's home opens on for every signed-in user: an overview
 * across the student's instruments, then a tab per instrument with its summary. Practice and learning days are counts of the last 7, never a streak. The
 * tab last opened is remembered on this device. Starting from here opens the session's setup,
 * which already knows the instrument of the tab open. A student whose paths and
 * courses suit every instrument has no instrument of their own, yet can still practise: they
 * choose the instrument at the start.
 */
import { computed, ref, watch } from 'vue'

import DayMarks from '@/features/student/components/DayMarks.vue'
import PracticeSummaryPanel from '@/features/student/components/PracticeSummaryPanel.vue'
import { usePracticeOverview } from '@/features/student/composables/usePracticeHome'
import InstrumentIcon from '@/shared/components/InstrumentIcon.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

const OVERVIEW = 'overview'
const TAB_KEY = 'practiceHome.tab'

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const { item: overview, isLoading, error, retry } = usePracticeOverview()
const { instruments } = useListInstruments()

const stepKeys = {
  refresh: 'practiceHomeView.steps.refresh',
  strengthen: 'practiceHomeView.steps.strengthen',
  ready_to_start: 'practiceHomeView.steps.ready_to_start',
} as const

/** The student's instruments, in the overview's order, with what's needed to show them. */
const cards = computed(() =>
  (overview.value?.instruments ?? []).flatMap((card) => {
    const instrument = instruments.value.find((candidate) => candidate.instrument_id === card.instrument_id)
    return instrument ? [{ ...card, instrument }] : []
  }),
)

function remembered(): string {
  try {
    return localStorage.getItem(TAB_KEY) ?? OVERVIEW
  } catch {
    return OVERVIEW
  }
}

const tab = ref(remembered())
watch(tab, (value) => {
  try {
    localStorage.setItem(TAB_KEY, value)
  } catch {
    // Storage blocked: the tab is simply not remembered.
  }
})

/** The tab shown: the one chosen, unless that instrument is no longer the student's. */
const shownTab = computed(() => (cards.value.some((card) => card.instrument_id === tab.value) ? tab.value : OVERVIEW))

const startTo = computed(() =>
  shownTab.value === OVERVIEW ? { name: 'practice-session' } : { name: 'practice-session', query: { instrument: shownTab.value } },
)
</script>

<template>
  <section class="flex flex-col gap-5" data-test="practice-dashboard">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-xl font-semibold">{{ t('practiceHomeView.title') }}</h1>
      <PrimaryButton v-if="overview" as="RouterLink" data-test="start-practising" :to="startTo" class="flex h-12 items-center px-5">
        {{ t('practiceHomeView.start') }}
      </PrimaryButton>
    </header>

    <StateLoading v-if="isLoading" :noun="t('practiceHomeView.overviewNoun')" />
    <StateError v-else-if="error" :message="t('practiceHomeView.overviewError')" @retry="retry()" />

    <template v-else-if="overview">
      <div v-if="cards.length > 0" role="tablist" :aria-label="t('practiceHomeView.tabsLabel')" class="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4">
        <button
          v-for="option in [{ id: OVERVIEW, label: t('practiceHomeView.overview') }, ...cards.map((card) => ({ id: card.instrument_id, label: localizedName(card.instrument.names) }))]"
          :key="option.id"
          type="button"
          role="tab"
          :aria-selected="shownTab === option.id"
          aria-controls="practice-home-panel"
          class="-mb-px h-12 shrink-0 whitespace-nowrap border-b-2 px-3 text-sm font-medium"
          :class="shownTab === option.id ? 'border-accent text-ink' : 'border-transparent text-ink-muted'"
          @click="tab = option.id"
        >
          {{ option.label }}
        </button>
      </div>

      <div id="practice-home-panel" :role="cards.length > 0 ? 'tabpanel' : undefined">
        <div v-if="shownTab === OVERVIEW" class="flex flex-col gap-6">
          <div class="grid grid-cols-2 gap-4">
            <div data-test="practice-days">
              <DayMarks :label="t('practiceHomeView.practiceDays')" :days="overview.practice_days_last_7" />
            </div>
            <div data-test="learning-days">
              <DayMarks :label="t('practiceHomeView.learningDays')" :days="overview.learning_days_last_7" />
            </div>
          </div>

          <div v-if="cards.length === 0" data-test="no-instruments" class="flex flex-col items-start gap-2">
            <p class="text-sm text-ink-muted">{{ t('practiceHomeView.noInstruments') }}</p>
            <RouterLink :to="{ name: 'path-catalog' }" class="text-sm font-medium text-accent-text underline">
              {{ t('practiceHomeView.findPath') }}
            </RouterLink>
          </div>
          <ul v-else class="flex flex-col gap-2">
            <li v-for="card in cards" :key="card.instrument_id">
              <button
                type="button"
                data-test="instrument-card"
                class="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-3 text-left hover:border-accent"
                @click="tab = card.instrument_id"
              >
                <InstrumentIcon :icon="card.instrument.icon" :family="card.instrument.family" class="h-9 w-9 shrink-0" />
                <span class="flex min-w-0 flex-col">
                  <span class="font-medium">{{ localizedName(card.instrument.names) }}</span>
                  <span class="text-sm text-ink-muted">{{ t('practiceHomeView.daysOf7', { count: card.practice_days_last_7 }) }}</span>
                  <span class="truncate text-sm text-ink-muted">
                    {{
                      card.top_next_step
                        ? `${t(stepKeys[card.top_next_step.kind])}: ${localizedName(card.top_next_step.names)}`
                        : t('practiceHomeView.noSuggestion')
                    }}
                  </span>
                </span>
              </button>
            </li>
          </ul>
        </div>
        <PracticeSummaryPanel v-else :key="shownTab" :instrument-id="shownTab" />
      </div>
    </template>
  </section>
</template>
