<script setup lang="ts">
/**
 * A short chord chart asked in a drill, one chord a bar, read left to right as a list of bars.
 */
import type { components } from '@/api/generated/core-domain'
import ChartBar from '@/shared/components/ChartBar.vue'
import type { ChartBarContent } from '@/shared/components/ChartBar.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

type Instrument = components['schemas']['Instrument']

defineProps<{
  bars: ChartBarContent[]
  instrument: Instrument
}>()

const { t } = useTypedT()
</script>

<template>
  <ol :aria-label="t('drill.chart.label')" class="grid w-full grid-cols-4 gap-1">
    <li v-for="(bar, i) in bars" :key="i">
      <ChartBar :bar="bar" :position="i + 1" :instrument="instrument" />
    </li>
  </ol>
</template>
