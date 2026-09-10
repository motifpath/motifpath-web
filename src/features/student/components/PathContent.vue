<script setup lang="ts">
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import PathStep from '@/features/student/components/PathStep.vue'
import { groupPathSections } from '@/features/student/utils/groupPathSections'
import { pathProgress, stepViews } from '@/features/student/utils/pathProgress'

const props = defineProps<{ view: components['schemas']['StudentPathView'] }>()

const sections = computed(() => groupPathSections(props.view.items))

const stepViewByPosition = computed(
  () => new Map(stepViews(props.view).map((s) => [s.position, s])),
)

const progress = computed(() => pathProgress(props.view))
</script>

<template>
  <div data-test="path">
    <h2 class="text-lg font-medium">{{ view.title }}</h2>
    <p data-test="path-progress" class="mb-4 text-sm text-motif-ink/60">
      {{ progress.completed }} of {{ progress.total }} steps complete
    </p>

    <div
      v-for="section in sections"
      :key="section.items[0].position"
      data-test="path-section"
      class="mb-4"
    >
      <h3
        v-if="section.label"
        data-test="section-heading"
        class="mb-1 text-sm font-semibold uppercase tracking-wide text-motif-ink/70"
      >
        {{ section.label }}
      </h3>
      <ol :start="section.items[0].position" class="flex flex-col gap-1">
        <PathStep
          v-for="item in section.items"
          :key="item.position"
          v-bind="stepViewByPosition.get(item.position)!"
        />
      </ol>
    </div>
  </div>
</template>
