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
  /** The window has room for a side column: the progress and the next step move into it. */
  twoPanes?: boolean
}>()

const { t } = useTypedT()
const wording = useStepWording()

const path = computed(() => buildMyPath(props.view))
const next = computed(() => path.value.next)
const nextCard = computed(() => {
  const step = next.value
  if (!step) return null
  const action = wording.startAction(step)
  return {
    eyebrow: t('pathView.upNext', { position: step.position, total: path.value.progress.total }),
    title: step.title,
    kind: step.kind,
    kindLabel: wording.kindLabel(step),
    actionLabel: action.label,
    to: action.to,
  }
})

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
  <div
    data-test="path"
    :class="twoPanes ? 'grid grid-cols-[minmax(0,37.5rem)_20rem] items-start gap-6' : 'flex flex-col gap-5'"
  >
    <div data-test="path-list" class="flex min-w-0 flex-col gap-5">
      <header class="flex flex-col gap-2">
        <p v-if="course" data-test="path-eyebrow" class="text-xs font-semibold uppercase tracking-wide text-accent-text">
          {{ t('pathView.coursePart', { course: course.title, part: course.part, parts: course.parts }) }}
        </p>
        <h1 class="text-lg font-semibold text-ink">{{ view.title }}</h1>
        <ProgressMeter
          v-if="!twoPanes"
          data-test="path-progress"
          :completed="path.progress.completed"
          :total="path.progress.total"
        />
      </header>

      <NextStepCard v-if="!twoPanes && nextCard" v-bind="nextCard" />

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
    </div>

    <aside v-if="twoPanes" data-test="path-side" class="flex flex-col gap-4">
      <div data-test="path-progress-card" class="flex flex-col gap-2 rounded-xl border border-border bg-surface-raised p-4">
        <p class="text-base font-semibold text-ink">
          {{ t('pathView.progressCard.steps', { completed: path.progress.completed, total: path.progress.total }) }}
        </p>
        <ProgressMeter :completed="path.progress.completed" :total="path.progress.total" :show-count="false" />
        <p v-if="course" class="text-xs text-ink-muted">
          {{ t('pathView.progressCard.coursePart', { part: course.part, parts: course.parts, course: course.title }) }}
        </p>
      </div>

      <NextStepCard v-if="nextCard" v-bind="nextCard" />
    </aside>

    <LockedStepPanel :step="lockedStep" :next="next" @close="lockedStep = null" />
  </div>
</template>
