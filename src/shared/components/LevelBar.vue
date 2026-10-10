<script setup lang="ts">
/**
 * How many skills sit at each knowledge level, from learning to retained. The bar is for the eye;
 * the legend names every level with its count, so colour is never the only cue.
 */
import { computed } from 'vue'

import { useTypedT } from '@/shared/composables/useTypedT'

type ShownLevel = 'learning' | 'accurate' | 'fluent' | 'retained'

const props = defineProps<{ counts: Record<ShownLevel, number> }>()

const { t } = useTypedT()

const LEVELS: ShownLevel[] = ['learning', 'accurate', 'fluent', 'retained']

const fill: Record<ShownLevel, string> = {
  learning: 'bg-level-learning',
  accurate: 'bg-level-accurate',
  fluent: 'bg-level-fluent',
  retained: 'bg-level-retained',
}

const segments = computed(() => LEVELS.filter((level) => props.counts[level] > 0))
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <div data-test="level-track" class="flex h-3 gap-0.5 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
      <!-- Each segment's share of the bar is its count, which only a style binding can express. -->
      <div
        v-for="level in segments"
        :key="level"
        data-test="level-segment"
        :data-level="level"
        class="h-full min-w-px"
        :class="fill[level]"
        :style="{ flexGrow: counts[level], flexBasis: 0 }"
      />
    </div>
    <ul class="flex flex-wrap gap-x-3 gap-y-1.5">
      <li v-for="level in LEVELS" :key="level" data-test="level-legend-item" class="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
        <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="fill[level]" aria-hidden="true" />
        {{ t(`levelBar.${level}`, { count: counts[level] }) }}
      </li>
    </ul>
  </div>
</template>
