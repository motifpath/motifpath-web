<script setup lang="ts">
/**
 * The skills and concepts a progression practises in the drills. Its own component so the knowledge
 * map loads only once the admin turns the drills on.
 */
import SkillConceptTreePicker from '@/shared/components/SkillConceptTreePicker.vue'
import { useKnowledgeTrees } from '@/shared/composables/useKnowledgeTrees'
import { useTypedT } from '@/shared/composables/useTypedT'

const skillIds = defineModel<string[]>('skillIds', { required: true })
const conceptIds = defineModel<string[]>('conceptIds', { required: true })

const { t } = useTypedT()
const { skillNodes, conceptNodes, skillsLoading, conceptsLoading, skillsError, conceptsError, retrySkills, retryConcepts, suggestedConceptIds } = useKnowledgeTrees(
  { skillIds, conceptIds },
)
</script>

<template>
  <div data-test="progression-classification" class="flex flex-col gap-4">
    <SkillConceptTreePicker
      v-model:selected-ids="conceptIds"
      :label="t('classificationFields.conceptLabel')"
      :nodes="conceptNodes"
      :is-loading="conceptsLoading"
      :load-failed="conceptsError"
      :suggested-ids="suggestedConceptIds"
      missing-hint
      @retry="retryConcepts"
    />
    <SkillConceptTreePicker
      v-model:selected-ids="skillIds"
      :label="t('classificationFields.skillLabel')"
      :nodes="skillNodes"
      :is-loading="skillsLoading"
      :load-failed="skillsError"
      missing-hint
      @retry="retrySkills"
    />
  </div>
</template>
