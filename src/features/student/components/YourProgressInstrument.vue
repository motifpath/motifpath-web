<script setup lang="ts">
/**
 * Your progress on one instrument, or on the skills that suit any instrument: its practice days,
 * its skills by level, and what moved this week. It loads that summary itself, so a summary that
 * fails takes only these blocks, never This week above them.
 */
import { computed } from 'vue'

import SkillProgressRow from '@/features/student/components/SkillProgressRow.vue'
import WeekDays from '@/features/student/components/WeekDays.vue'
import { usePracticeSummary } from '@/features/student/composables/usePracticeHome'
import { skillLevelCounts } from '@/features/student/utils/studentHome'
import LevelBar from '@/shared/components/LevelBar.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import StatusChip from '@/shared/components/StatusChip.vue'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{ instrumentId: string | null }>()

const { t } = useTypedT()
const { sizeClass } = useSizeClass()
const { item: summary, isLoading, error, retry } = usePracticeSummary(props.instrumentId)

const practiceDays = computed(() => summary.value?.last_7_days.map((day) => ({ date: day.date, marked: day.practised })) ?? [])
const skills = computed(() => (summary.value ? skillLevelCounts(summary.value) : null))
</script>

<template>
  <div data-test="progress-instrument">
    <LoadingSkeleton v-if="isLoading" />
    <LoadFailed v-else-if="error" :message="t('yourProgressView.instrumentError')" @retry="retry()" />
    <div v-else-if="summary" class="grid gap-6" :class="{ 'grid-cols-2 items-start gap-8': sizeClass === 'expanded' }">
      <div class="flex min-w-0 flex-col gap-6">
        <div data-test="progress-practice-days">
          <WeekDays :label="t('yourProgressView.practiceDays')" :marked-label="t('yourProgressView.practised')" :days="practiceDays" />
        </div>

        <section v-if="skills" data-test="progress-skills" class="flex flex-col gap-3">
          <h2 class="text-base font-semibold text-ink">{{ t('studentHome.skills.title') }}</h2>
          <LevelBar :counts="skills.counts" />
          <StatusChip v-if="skills.fading > 0" class="self-start" tone="warning" :label="t('studentHome.skills.fading', { count: skills.fading })" />
        </section>
      </div>

      <section data-test="progress-moved" class="flex min-w-0 flex-col gap-1">
        <h2 class="text-base font-semibold text-ink">{{ t('yourProgressView.movedTitle') }}</h2>
        <ul v-if="summary.progress_this_week.length > 0" class="flex flex-col">
          <li v-for="line in summary.progress_this_week" :key="`${line.node_id}-${line.measure}`">
            <SkillProgressRow :line="line" />
          </li>
        </ul>
        <p v-else class="text-sm text-ink-muted">{{ t('practiceHomeView.noProgress') }}</p>
      </section>
    </div>
  </div>
</template>
