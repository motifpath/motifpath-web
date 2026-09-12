<script setup lang="ts">
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import PathStep from '@/features/student/components/PathStep.vue'
import { groupPathSections } from '@/features/student/utils/groupPathSections'
import { pathProgress, stepViews, type PathStepView } from '@/features/student/utils/pathProgress'
import ProgressMeter from '@/shared/components/ProgressMeter.vue'

const props = defineProps<{ view: components['schemas']['StudentPathView'] }>()

const sections = computed(() => groupPathSections(props.view.items))

const stepViewByPosition = computed(
  () => new Map(stepViews(props.view).map((s) => [s.position, s])),
)

/**
 * `stepViews` and `groupPathSections` both derive from the same
 * `props.view.items`, so every position rendered by a section should have a
 * matching view. Fail loudly instead of silently rendering blank props if
 * that invariant is ever broken.
 */
function stepViewFor(position: number): PathStepView {
  const found = stepViewByPosition.value.get(position)
  if (!found) {
    throw new Error(`PathContent: no step view found for position ${position}`)
  }
  return found
}

const progress = computed(() => pathProgress(props.view))
</script>

<template>
  <div data-test="path">
    <h2 class="text-lg font-medium">{{ view.title }}</h2>
    <ProgressMeter
      data-test="path-progress"
      class="mb-4"
      :completed="progress.completed"
      :total="progress.total"
    />

    <div
      v-for="section in sections"
      :key="section.items[0].position"
      data-test="path-section"
      class="mb-4"
    >
      <h3
        v-if="section.label"
        data-test="section-heading"
        class="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-muted"
      >
        {{ section.label }}
      </h3>
      <ol :start="section.items[0].position" class="flex flex-col gap-1">
        <PathStep
          v-for="item in section.items"
          :key="item.position"
          v-bind="stepViewFor(item.position)"
        />
      </ol>
    </div>
  </div>
</template>
