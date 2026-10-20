<script setup lang="ts">
/**
 * One instrument's practice summary: on how many days the student practised it, what improved
 * this week with where it started, what to do next, how well they know each cell of its fretboard,
 * and every skill by area with its level.
 */
import type { components } from '@/api/generated/core-domain'
import DayMarks from '@/features/student/components/DayMarks.vue'
import FretboardHeatmap from '@/features/student/components/FretboardHeatmap.vue'
import { usePracticeSummary } from '@/features/student/composables/usePracticeHome'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

type SkillProgress = components['schemas']['SkillProgress']
type Level = components['schemas']['KnowledgeLevel']

const props = defineProps<{ instrumentId: string }>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const { item: summary, isLoading, error, retry } = usePracticeSummary(props.instrumentId)

const measureKeys = {
  accuracy: 'practiceHomeView.measures.accuracy',
  fluency: 'practiceHomeView.measures.fluency',
  best_clean_tempo_bpm: 'practiceHomeView.measures.best_clean_tempo_bpm',
} as const

const stepKeys = {
  refresh: 'practiceHomeView.steps.refresh',
  strengthen: 'practiceHomeView.steps.strengthen',
  ready_to_start: 'practiceHomeView.steps.ready_to_start',
} as const

const levelKeys = {
  new: 'practiceHomeView.levels.new',
  learning: 'practiceHomeView.levels.learning',
  accurate: 'practiceHomeView.levels.accurate',
  fluent: 'practiceHomeView.levels.fluent',
  retained: 'practiceHomeView.levels.retained',
} as const

// Still learning is a step on the way, not a failure, so it never takes the danger colour.
const levelTones: Record<Level, string> = {
  new: 'bg-surface-sunken text-ink-muted',
  learning: 'bg-warning-muted text-ink',
  accurate: 'bg-accent-muted text-ink',
  fluent: 'bg-success-muted text-ink',
  retained: 'bg-success text-success-fg',
}

function progressValues(line: SkillProgress): string {
  if (line.measure === 'best_clean_tempo_bpm') return t('practiceHomeView.tempoChange', { before: line.before, after: line.after })
  return `${Math.round(line.before * 100)}% → ${Math.round(line.after * 100)}%`
}
</script>

<template>
  <LoadingSkeleton v-if="isLoading" />
  <LoadFailed v-else-if="error" :message="t('practiceHomeView.summaryError')" @retry="retry()" />

  <div v-else-if="summary" class="flex flex-col gap-6">
    <div data-test="practice-days">
      <DayMarks :label="t('practiceHomeView.practiceDays')" :days="summary.practice_days_last_7" />
    </div>

    <section data-test="progress" class="flex flex-col gap-2">
      <h2 class="text-base font-semibold">{{ t('practiceHomeView.progressTitle') }}</h2>
      <ul v-if="summary.progress_this_week.length > 0" class="flex flex-col gap-1.5">
        <li v-for="line in summary.progress_this_week" :key="`${line.node_id}-${line.measure}`" data-test="progress-line" class="flex flex-col">
          <span class="text-sm font-medium">{{ localizedName(line.names) }}</span>
          <span class="text-sm text-ink-muted">{{ t(measureKeys[line.measure]) }} {{ progressValues(line) }}</span>
        </li>
      </ul>
      <p v-else class="text-sm text-ink-muted">{{ t('practiceHomeView.noProgress') }}</p>
    </section>

    <section v-if="summary.next_steps.length > 0" class="flex flex-col gap-2">
      <h2 class="text-base font-semibold">{{ t('practiceHomeView.nextStepsTitle') }}</h2>
      <ul class="flex flex-col gap-2">
        <li
          v-for="step in summary.next_steps"
          :key="step.node_id"
          data-test="next-step"
          class="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5"
        >
          <span class="rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium">{{ t(stepKeys[step.kind]) }}</span>
          <span class="text-sm">{{ localizedName(step.names) }}</span>
        </li>
      </ul>
      <!-- Only the top steps come with the summary; every skill is listed below. -->
      <a
        v-if="summary.next_steps_total > summary.next_steps.length"
        data-test="see-all-steps"
        href="#practice-skills"
        class="self-start text-sm font-medium text-accent-text underline"
      >
        {{ t('practiceHomeView.seeAll', { count: summary.next_steps_total }) }}
      </a>
    </section>

    <FretboardHeatmap :instrument-id="instrumentId" />

    <section id="practice-skills" class="flex scroll-mt-20 flex-col gap-4">
      <h2 class="text-base font-semibold">{{ t('practiceHomeView.skillsTitle') }}</h2>
      <p v-if="summary.groups.length === 0" data-test="skills-empty" class="text-sm text-ink-muted">
        {{ t('practiceHomeView.nothingToPractise') }}
      </p>
      <div v-for="group in summary.groups" :key="group.area_node_id ?? 'any'" data-test="skill-group" class="flex flex-col gap-2">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          {{ group.any_instrument ? t('practiceHomeView.anyInstrument') : localizedName(group.names) }}
        </h3>
        <ul class="flex flex-col divide-y divide-border rounded-lg border border-border">
          <li v-for="node in group.nodes" :key="node.node_id" data-test="skill-node" class="flex flex-wrap items-center gap-2 px-3 py-2.5">
            <span class="mr-auto text-sm">{{ localizedName(node.names) }}</span>
            <span v-if="node.fading" class="text-xs font-medium text-warning">{{ t('practiceHomeView.fading') }}</span>
            <span
              v-if="node.level"
              data-test="level-chip"
              class="rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="levelTones[node.level]"
            >
              {{ t(levelKeys[node.level]) }}
            </span>
            <span v-else-if="node.child_node_ids.length > 0" class="text-xs text-ink-muted">
              {{ t('practiceHomeView.coverage', { met: node.coverage.met_count, total: node.coverage.item_count }) }}
            </span>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
