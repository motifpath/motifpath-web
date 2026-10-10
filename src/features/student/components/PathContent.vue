<script setup lang="ts">
import { computed, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import LockedStepPanel from '@/features/student/components/LockedStepPanel.vue'
import type { PathCourse } from '@/features/student/composables/usePathCourse'
import { useStepWording } from '@/features/student/composables/useStepWording'
import { buildMyPath, type MyPathStep } from '@/features/student/utils/myPath'
import NextStepCard from '@/shared/components/NextStepCard.vue'
import ProgressMeter from '@/shared/components/ProgressMeter.vue'
import SectionHeader from '@/shared/components/SectionHeader.vue'
import StepRow from '@/shared/components/StepRow.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{
  view: components['schemas']['StudentPathView']
  course: PathCourse | null
}>()

const { t } = useTypedT()
const wording = useStepWording()

const path = computed(() => buildMyPath(props.view))
const next = computed(() => path.value.next)
const nextAction = computed(() => (next.value ? wording.startAction(next.value) : null))

// Finished sections start folded; the student can unfold one, by its first step's position.
const unfolded = ref(new Set<number>())
function toggle(firstPosition: number): void {
  const updated = new Set(unfolded.value)
  if (!updated.delete(firstPosition)) updated.add(firstPosition)
  unfolded.value = updated
}

const lockedStep = ref<MyPathStep | null>(null)

/** A step the student can open links to its lesson; a locked one explains itself instead. */
function linkOf(step: MyPathStep) {
  return step.state === 'locked' || step.state === 'language' ? undefined : wording.lessonRoute(step)
}
</script>

<template>
  <div data-test="path" class="flex flex-col gap-5">
    <header class="flex flex-col gap-2">
      <p v-if="course" data-test="path-eyebrow" class="text-xs font-semibold uppercase tracking-wide text-accent-text">
        {{ t('pathView.coursePart', { course: course.title, part: course.part, parts: course.parts }) }}
      </p>
      <h1 class="text-lg font-semibold text-ink">{{ view.title }}</h1>
      <ProgressMeter data-test="path-progress" :completed="path.progress.completed" :total="path.progress.total" />
    </header>

    <NextStepCard
      v-if="next && nextAction"
      :eyebrow="t('pathView.upNext', { position: next.position, total: path.progress.total })"
      :title="next.title"
      :kind="next.kind"
      :kind-label="wording.kindLabel(next)"
      :action-label="nextAction.label"
      :to="nextAction.to"
    />

    <section
      v-for="section in path.sections"
      :key="section.steps[0].position"
      data-test="path-section"
      class="flex flex-col gap-1"
    >
      <SectionHeader
        v-if="section.label"
        :label="section.label"
        :count="t('pathView.sectionCount', { done: section.done, total: section.total })"
        :foldable="section.finished"
        :expanded="unfolded.has(section.steps[0].position)"
        @toggle="toggle(section.steps[0].position)"
      />
      <ol v-if="!section.finished || unfolded.has(section.steps[0].position)" class="flex flex-col gap-1">
        <StepRow
          v-for="step in section.steps"
          :key="step.position"
          :state="step.state"
          :position="step.position"
          :title="step.title"
          :meta="wording.meta(step)"
          :to="linkOf(step)"
          @select="lockedStep = step"
        />
      </ol>
    </section>

    <LockedStepPanel :step="lockedStep" :next="next" @close="lockedStep = null" />
  </div>
</template>
