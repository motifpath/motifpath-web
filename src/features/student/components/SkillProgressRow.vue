<script setup lang="ts">
/**
 * One skill that moved this week: its name, what improved, and where it started and is now, so the
 * student sees the distance, not just the new value.
 */
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

type SkillProgress = components['schemas']['SkillProgress']

const props = defineProps<{ line: SkillProgress }>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()

const measureKeys = {
  accuracy: 'practiceHomeView.measures.accuracy',
  fluency: 'practiceHomeView.measures.fluency',
  best_clean_tempo_bpm: 'practiceHomeView.measures.best_clean_tempo_bpm',
} as const

// Accuracy and fluency are ratios, shown as percentages; a tempo is already in beats per minute.
const change = computed(() => {
  const { measure, before, after } = props.line
  if (measure === 'best_clean_tempo_bpm') return t('practiceHomeView.tempoChange', { before, after })
  return `${Math.round(before * 100)}% → ${Math.round(after * 100)}%`
})
</script>

<template>
  <div class="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-0.5">
    <span data-test="skill-progress-name" class="mr-auto text-sm font-medium text-ink">{{ localizedName(line.names) }}</span>
    <span data-test="skill-progress-measure" class="text-xs text-ink-muted">{{ t(measureKeys[line.measure]) }}</span>
    <span data-test="skill-progress-change" class="text-sm font-semibold tabular-nums text-success">{{ change }}</span>
  </div>
</template>
