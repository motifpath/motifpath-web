<script setup lang="ts">
/**
 * Where a lesson sits in its section, beside the lesson: the steps around it, with the lesson on
 * screen marked as the one the student is on now. A step the student may open links to its
 * lesson; a locked one explains itself in place, as on My path.
 */
import { ref } from 'vue'
import { useRoute } from 'vue-router'

import LockedStepPanel from '@/features/student/components/LockedStepPanel.vue'
import { useStepWording } from '@/features/student/composables/useStepWording'
import type { MyPathSection, MyPathStep } from '@/features/student/utils/myPath'
import SectionHeader from '@/shared/components/SectionHeader.vue'
import StepRow from '@/shared/components/StepRow.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{
  section: MyPathSection
  /** The lesson on screen. */
  viewingNodeId: string
  /** The step the student can do now, the way forward from a step locked behind it. */
  next: MyPathStep | null
}>()

const { t } = useTypedT()
const route = useRoute()
const wording = useStepWording()

const lockedStep = ref<MyPathStep | null>(null)

/** The lesson on screen reads as the one the student is on, until it is done. */
function isNow(step: MyPathStep): boolean {
  return step.contentNodeId === props.viewingNodeId && step.state !== 'done'
}

function stateOf(step: MyPathStep): MyPathStep['state'] {
  return isNow(step) ? 'current' : step.state
}

function metaOf(step: MyPathStep): string {
  return isNow(step) ? t('pathView.meta.now', { kind: wording.kindLabel(step) }) : wording.meta(step)
}

/** The lesson on screen links to itself as it was opened (in the language chosen, say). */
function linkOf(step: MyPathStep) {
  if (step.contentNodeId === props.viewingNodeId) return route.fullPath
  return step.state === 'locked' || step.state === 'language' ? undefined : wording.lessonRoute(step)
}
</script>

<template>
  <section data-test="lesson-section-steps" :aria-label="t('nodeView.inThisSection')" class="flex flex-col gap-1">
    <SectionHeader
      v-if="section.label"
      :label="section.label"
      :count="t('pathView.sectionCount', { done: section.done, total: section.total })"
    />
    <ol class="flex flex-col gap-1">
      <StepRow
        v-for="step in section.steps"
        :key="step.position"
        :state="stateOf(step)"
        :position="step.position"
        :title="step.title"
        :meta="metaOf(step)"
        :to="linkOf(step)"
        @select="lockedStep = step"
      />
    </ol>

    <LockedStepPanel :step="lockedStep" :next="next" @close="lockedStep = null" />
  </section>
</template>
