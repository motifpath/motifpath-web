<script setup lang="ts">
/**
 * Your skills on the home: how many of one instrument's skills sit at each level, and how many are
 * fading. It loads that instrument's summary itself, so a summary that fails takes only this block.
 */
import { computed } from 'vue'

import { usePracticeSummary } from '@/features/student/composables/usePracticeHome'
import { skillLevelCounts } from '@/features/student/utils/studentHome'
import LevelBar from '@/shared/components/LevelBar.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import StatusChip from '@/shared/components/StatusChip.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{ instrumentId: string; instrumentName: string }>()

const { t } = useTypedT()
const { item: summary, isLoading, error, retry } = usePracticeSummary(props.instrumentId)

const skills = computed(() => (summary.value ? skillLevelCounts(summary.value) : null))
</script>

<template>
  <div class="flex flex-col gap-3">
    <header class="flex items-center gap-2">
      <h2 class="min-w-0 flex-1 text-base font-semibold text-ink">
        {{ t('studentHome.skills.title') }}
        <span v-if="instrumentName" class="font-medium text-ink-muted">· {{ instrumentName }}</span>
      </h2>
      <RouterLink
        :to="{ name: 'your-progress', query: { instrument: instrumentId } }"
        data-test="skills-see-all"
        class="inline-flex min-h-12 shrink-0 items-center whitespace-nowrap text-sm font-semibold text-accent-text"
      >
        {{ t('studentHome.skills.seeAll') }}
      </RouterLink>
    </header>

    <LoadingSkeleton v-if="isLoading" />
    <LoadFailed v-else-if="error" :message="t('studentHome.skills.error')" @retry="retry()" />
    <template v-else-if="skills">
      <LevelBar :counts="skills.counts" />
      <StatusChip
        v-if="skills.fading > 0"
        class="self-start"
        tone="warning"
        :label="t('studentHome.skills.fading', { count: skills.fading })"
      />
    </template>
  </div>
</template>
