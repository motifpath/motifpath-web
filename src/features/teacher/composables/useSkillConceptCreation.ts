import type { Ref } from 'vue'

import { useCreateConcept } from '@/features/teacher/composables/useCreateConcept'
import { useCreateSkill } from '@/features/teacher/composables/useCreateSkill'
import { useListConcepts } from '@/features/teacher/composables/useListConcepts'
import { useListSkills } from '@/features/teacher/composables/useListSkills'
import { useToast } from '@/shared/composables/useToast'
import { ancestorIds } from '@/shared/utils/skillConceptTree'

/**
 * Shared by every authoring view that lets a teacher create a new Skill or
 * Concept node inline and have it (plus its ancestor chain) merge straight
 * into the form's own skillIds/conceptIds selection.
 */
export function useSkillConceptCreation(
  skillIds: Ref<string[]>,
  conceptIds: Ref<string[]>,
  fallbackErrors: { createSkillFailed: string; createConceptFailed: string },
) {
  const { skills, isLoading: skillsLoading, retry: reloadSkills } = useListSkills()
  const { concepts, isLoading: conceptsLoading, retry: reloadConcepts } = useListConcepts()
  const { createSkill } = useCreateSkill()
  const { createConcept } = useCreateConcept()
  const toast = useToast()

  async function onCreateSkill({ name, parentId }: { name: string; parentId: string | null }) {
    try {
      const skill = await createSkill({ name, ...(parentId ? { parent_id: parentId } : {}) })
      await reloadSkills()
      const skillNodes = skills.value.map((s) => ({ id: s.skill_id, name: s.name, parent_id: s.parent_id }))
      const newNode = { id: skill.skill_id, name: skill.name, parent_id: parentId }
      skillIds.value = Array.from(new Set([...skillIds.value, skill.skill_id, ...ancestorIds(skillNodes, newNode)]))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : fallbackErrors.createSkillFailed)
    }
  }

  async function onCreateConcept({ name, parentId }: { name: string; parentId: string | null }) {
    try {
      const concept = await createConcept({ name, ...(parentId ? { parent_id: parentId } : {}) })
      await reloadConcepts()
      const conceptNodes = concepts.value.map((c) => ({ id: c.concept_id, name: c.name, parent_id: c.parent_id }))
      const newNode = { id: concept.concept_id, name: concept.name, parent_id: parentId }
      conceptIds.value = Array.from(
        new Set([...conceptIds.value, concept.concept_id, ...ancestorIds(conceptNodes, newNode)]),
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : fallbackErrors.createConceptFailed)
    }
  }

  return { skills, concepts, skillsLoading, conceptsLoading, onCreateSkill, onCreateConcept }
}
