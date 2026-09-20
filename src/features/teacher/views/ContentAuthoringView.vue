<script setup lang="ts">
import { Plus, X } from 'lucide-vue-next'
import { computed, onUnmounted, reactive, ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'

import ArticlePopupListEditor from '@/features/teacher/components/ArticlePopupListEditor.vue'
import ChallengeConfigPanel from '@/features/teacher/components/ChallengeConfigPanel.vue'
import ClassificationFields from '@/features/teacher/components/ClassificationFields.vue'
import ContentTypeToggle from '@/features/teacher/components/ContentTypeToggle.vue'
import ExercisePickerModal from '@/features/teacher/components/ExercisePickerModal.vue'
import VideoTimelineEditor from '@/features/teacher/components/VideoTimelineEditor.vue'
import { useContentNode } from '@/features/teacher/composables/useContentNode'
import { useContentNodeForm } from '@/features/teacher/composables/useContentNodeForm'
import { useCreateChallenge } from '@/features/teacher/composables/useCreateChallenge'
import { useCreateConcept } from '@/features/teacher/composables/useCreateConcept'
import { useCreateContentNode } from '@/features/teacher/composables/useCreateContentNode'
import { useCreateExpandedContent } from '@/features/teacher/composables/useCreateExpandedContent'
import { useCreateSkill } from '@/features/teacher/composables/useCreateSkill'
import { useDeleteExpandedContent, useUpdateExpandedContent } from '@/features/teacher/composables/useUpdateExpandedContent'
import {
  useLinkExerciseToChallenge,
  useUnlinkExerciseFromChallenge,
} from '@/features/teacher/composables/useLinkExerciseToChallenge'
import { useListChallengeExercises } from '@/features/teacher/composables/useListChallengeExercises'
import { useListConcepts } from '@/features/teacher/composables/useListConcepts'
import { useListContentNodeChallenges } from '@/features/teacher/composables/useListContentNodeChallenges'
import { useListExercises } from '@/features/teacher/composables/useListExercises'
import { useListExpandedContent } from '@/features/teacher/composables/useListExpandedContent'
import { useListSkills } from '@/features/teacher/composables/useListSkills'
import { useUpdateChallenge } from '@/features/teacher/composables/useUpdateChallenge'
import { useUpdateContentNode } from '@/features/teacher/composables/useUpdateContentNode'
import AppBar from '@/shared/components/AppBar.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useIsCompact } from '@/shared/composables/useIsCompact'
import { useToast } from '@/shared/composables/useToast'
import { useCurrentUserStore } from '@/stores/currentUser'

const currentUser = useCurrentUserStore()
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)

const { isCompact } = useIsCompact()

const route = useRoute()
const rawContentNodeId = route.params.id
const contentNodeId = Array.isArray(rawContentNodeId) ? rawContentNodeId[0] : rawContentNodeId
const isEditMode = !!contentNodeId

const {
  contentNode: loadedContentNode,
  isLoading: loadingContentNode,
  error: loadError,
  retry: retryLoad,
} = contentNodeId
  ? useContentNode(contentNodeId)
  : { contentNode: ref(null), isLoading: ref(false), error: ref(false), retry: async () => {} }

const form = useContentNodeForm()
const { createContentNode } = useCreateContentNode()
const { updateContentNode } = useUpdateContentNode()

const { skills, isLoading: skillsLoading, retry: reloadSkills } = useListSkills()
const { concepts, isLoading: conceptsLoading, retry: reloadConcepts } = useListConcepts()
const { createSkill } = useCreateSkill()
const { createConcept } = useCreateConcept()

async function onCreateSkill({ name, parentId }: { name: string; parentId: string | null }) {
  try {
    const skill = await createSkill({ name, ...(parentId ? { parent_id: parentId } : {}) })
    await reloadSkills()
    form.skillIds.value = [...form.skillIds.value, skill.skill_id]
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to create the skill')
  }
}

async function onCreateConcept({ name, parentId }: { name: string; parentId: string | null }) {
  try {
    const concept = await createConcept({ name, ...(parentId ? { parent_id: parentId } : {}) })
    await reloadConcepts()
    form.conceptIds.value = [...form.conceptIds.value, concept.concept_id]
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to create the concept')
  }
}

const savedContentNodeId = ref('')

watch(
  loadedContentNode,
  (contentNode) => {
    if (!contentNode) return
    form.loadFromContentNode(contentNode)
    savedContentNodeId.value = contentNode.content_node_id
  },
  { immediate: true },
)

const saving = ref(false)
const justSaved = ref(false)
let justSavedTimeout: ReturnType<typeof setTimeout> | undefined
onUnmounted(() => clearTimeout(justSavedTimeout))

const toast = useToast()

async function save() {
  saving.value = true
  const isUpdate = !!savedContentNodeId.value

  try {
    const contentNode = isUpdate
      ? await updateContentNode(savedContentNodeId.value, form.toUpdateContentNodeRequest())
      : await createContentNode(form.toCreateContentNodeRequest())
    savedContentNodeId.value = contentNode.content_node_id
    form.loadFromContentNode(contentNode)

    justSaved.value = true
    clearTimeout(justSavedTimeout)
    justSavedTimeout = setTimeout(() => (justSaved.value = false), 2000)
    toast.success(isUpdate ? 'Content node updated.' : 'Content node created.')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to save the content node')
  } finally {
    saving.value = false
  }
}

// The challenge/exercise-linking section only makes sense once a content
// node id exists to attach a challenge to — hidden in create mode until
// the first save succeeds, exactly like the exercise-authoring page's own
// "usage" sidebar waiting on savedExerciseId.
type ChallengesState = ReturnType<typeof useListContentNodeChallenges>
type ChallengeExercisesState = ReturnType<typeof useListChallengeExercises>

// shallowRef, not ref -- these hold objects whose own properties are
// themselves refs (a composable's return value); ref() would deep-convert
// the object into a reactive proxy, auto-unwrapping those nested refs and
// breaking every `.challenges.value` access below.
const challengesState = shallowRef<ChallengesState | null>(null)
const challengeExercisesState = shallowRef<ChallengeExercisesState | null>(null)
const challenge = computed(() => challengesState.value?.challenges.value[0] ?? null)

const { createChallenge } = useCreateChallenge()
const { updateChallenge } = useUpdateChallenge()
const { linkExerciseToChallenge } = useLinkExerciseToChallenge()
const { unlinkExerciseFromChallenge } = useUnlinkExerciseFromChallenge()
const { exercises: exercisePool } = useListExercises()

const challengeForm = reactive<{
  subjectSkillId: string | undefined
  subjectConceptId: string | undefined
  passThreshold: number
  shuffleExercises: boolean
  shuffleOptions: boolean
}>({
  subjectSkillId: undefined,
  subjectConceptId: undefined,
  passThreshold: 70,
  shuffleExercises: false,
  shuffleOptions: false,
})
const savingChallenge = ref(false)
const pickerOpen = ref(false)

// Timed pop-ups only make sense once the node exists server-side, same as
// the challenge section below.
type ExpandedContentState = ReturnType<typeof useListExpandedContent>
const expandedContentState = shallowRef<ExpandedContentState | null>(null)
const { createExpandedContent } = useCreateExpandedContent()
const { updateExpandedContent } = useUpdateExpandedContent()
const { deleteExpandedContent } = useDeleteExpandedContent()

watch(
  savedContentNodeId,
  (id) => {
    if (!id) return
    expandedContentState.value = useListExpandedContent(id)
  },
  { immediate: true },
)

async function onAddTimelineItem(
  fields: { content_type: 'image' | 'gif'; media_url: string; trigger_at_seconds: number; hide_at_seconds: number; caption?: string },
) {
  try {
    await createExpandedContent(savedContentNodeId.value, fields)
    await expandedContentState.value?.retry()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to add the pop-up')
  }
}

async function onAddPopupItem(
  fields: { content_type: 'image' | 'gif'; media_url: string; trigger_at_paragraph: number; duration_ms: number; caption?: string },
) {
  try {
    await createExpandedContent(savedContentNodeId.value, fields)
    await expandedContentState.value?.retry()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to add the pop-up')
  }
}

function findExpandedContent(id: string) {
  return expandedContentState.value?.items.value.find((i) => i.expanded_content_id === id)
}

async function adjustTrigger(id: string, deltaSeconds: number) {
  const item = findExpandedContent(id)
  if (!item || item.trigger_at_seconds === undefined || item.hide_at_seconds === undefined) return
  try {
    await updateExpandedContent(id, {
      content_type: item.content_type,
      media_url: item.media_url,
      rich_content: item.rich_content,
      caption: item.caption,
      trigger_at_seconds: item.trigger_at_seconds + deltaSeconds,
      hide_at_seconds: item.hide_at_seconds,
    })
    await expandedContentState.value?.retry()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to update the pop-up')
  }
}

async function adjustHide(id: string, deltaSeconds: number) {
  const item = findExpandedContent(id)
  if (!item || item.trigger_at_seconds === undefined || item.hide_at_seconds === undefined) return
  try {
    await updateExpandedContent(id, {
      content_type: item.content_type,
      media_url: item.media_url,
      rich_content: item.rich_content,
      caption: item.caption,
      trigger_at_seconds: item.trigger_at_seconds,
      hide_at_seconds: item.hide_at_seconds + deltaSeconds,
    })
    await expandedContentState.value?.retry()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to update the pop-up')
  }
}

async function adjustParagraph(id: string, delta: number) {
  const item = findExpandedContent(id)
  if (!item || item.trigger_at_paragraph === undefined || item.duration_ms === undefined) return
  try {
    await updateExpandedContent(id, {
      content_type: item.content_type,
      media_url: item.media_url,
      rich_content: item.rich_content,
      caption: item.caption,
      trigger_at_paragraph: item.trigger_at_paragraph + delta,
      duration_ms: item.duration_ms,
    })
    await expandedContentState.value?.retry()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to update the pop-up')
  }
}

async function onRemoveExpandedContent(id: string) {
  try {
    await deleteExpandedContent(id)
    await expandedContentState.value?.retry()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to remove the pop-up')
  }
}

watch(
  savedContentNodeId,
  (id) => {
    if (!id) return
    challengesState.value = useListContentNodeChallenges(id)
  },
  { immediate: true },
)

watch(challenge, (c) => {
  if (!c) {
    challengeExercisesState.value = null
    return
  }
  challengeForm.subjectSkillId = c.subject_skill_id
  challengeForm.subjectConceptId = c.subject_concept_id
  challengeForm.passThreshold = c.pass_threshold
  challengeForm.shuffleExercises = c.shuffle_exercises
  challengeForm.shuffleOptions = c.shuffle_options
  challengeExercisesState.value = useListChallengeExercises(c.challenge_id)
})

// A challenge's subject must belong to its content node's own classification.
// If the teacher removes that skill/concept from Classification after picking
// it as the subject, drop the now-orphaned selection instead of letting a
// stale id reach the backend's membership check as a confusing save failure.
watch([form.skillIds, form.conceptIds], ([skillIds, conceptIds]) => {
  if (challengeForm.subjectSkillId && !skillIds.includes(challengeForm.subjectSkillId)) {
    challengeForm.subjectSkillId = undefined
  }
  if (challengeForm.subjectConceptId && !conceptIds.includes(challengeForm.subjectConceptId)) {
    challengeForm.subjectConceptId = undefined
  }
})

async function saveChallenge() {
  savingChallenge.value = true
  try {
    if (challenge.value) {
      await updateChallenge(challenge.value.challenge_id, {
        subject_skill_id: challengeForm.subjectSkillId,
        subject_concept_id: challengeForm.subjectConceptId,
        pass_threshold: challengeForm.passThreshold,
        shuffle_exercises: challengeForm.shuffleExercises,
        shuffle_options: challengeForm.shuffleOptions,
      })
    } else {
      await createChallenge(savedContentNodeId.value, {
        subject_skill_id: challengeForm.subjectSkillId,
        subject_concept_id: challengeForm.subjectConceptId,
        pass_threshold: challengeForm.passThreshold,
        shuffle_exercises: challengeForm.shuffleExercises,
        shuffle_options: challengeForm.shuffleOptions,
      })
    }
    await challengesState.value?.retry()
    toast.success('Challenge saved.')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to save the challenge')
  } finally {
    savingChallenge.value = false
  }
}

async function onExercisePicked(exerciseId: string) {
  if (!challenge.value) return
  pickerOpen.value = false
  try {
    await linkExerciseToChallenge(challenge.value.challenge_id, exerciseId)
    await challengeExercisesState.value?.retry()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to attach the exercise')
  }
}

async function onUnlinkExercise(exerciseId: string) {
  if (!challenge.value) return
  try {
    await unlinkExerciseFromChallenge(challenge.value.challenge_id, exerciseId)
    await challengeExercisesState.value?.retry()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to remove the exercise')
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <AppBar
      context="teacher"
      :compact="isCompact"
      :primary-nav-to="{ name: 'teacher-content' }"
      :breadcrumb-label="isEditMode ? form.title.value || 'Edit content' : 'New content'"
      :show-save="canAuthor"
      :save-disabled="saving"
      :just-saved="justSaved"
      :on-save="save"
    />

    <div v-if="!canAuthor" data-test="permission-denied" class="flex flex-1 items-center justify-center p-10">
      <p class="max-w-md text-center text-ink-muted">
        This page is for teachers and admins only — your account doesn't have permission to author content.
      </p>
    </div>

    <div v-else-if="loadingContentNode" class="flex flex-1 items-center justify-center p-10">
      <StateLoading noun="content node" />
    </div>

    <div v-else-if="loadError" data-test="load-error" class="flex flex-1 items-center justify-center p-10">
      <StateError message="Failed to load the content node" @retry="retryLoad" />
    </div>

    <main
      v-else
      data-test="authoring-body"
      class="flex min-w-0 flex-1 flex-col gap-6"
      :class="isCompact ? 'px-4 pb-6 pt-[20px]' : 'px-[48px] pb-[80px] pt-10'"
    >
      <div class="flex flex-col gap-1.5">
        <input
          v-model="form.title.value"
          type="text"
          placeholder="Untitled content"
          class="border-none bg-transparent font-bold text-ink outline-none"
          :class="isCompact ? 'text-[1.375rem] leading-[1.75rem]' : 'text-xl'"
        />
        <span class="text-sm text-ink-subtle">Internal title — for the content library, not shown to students</span>
      </div>

      <div class="flex flex-col gap-2.5">
        <label class="text-sm font-semibold">Content type</label>
        <ContentTypeToggle v-model="form.contentType.value" :disabled="isEditMode" />
        <span class="text-sm text-ink-subtle">
          {{
            isEditMode
              ? "Type can't be changed after creation."
              : 'Video or article — this determines which timed pop-ups this node can carry.'
          }}
        </span>
      </div>

      <div class="flex flex-col gap-2 border-t border-border pt-4">
        <label class="text-sm font-semibold">Classification</label>
        <ClassificationFields
          v-model:skill-ids="form.skillIds.value"
          v-model:concept-ids="form.conceptIds.value"
          v-model:difficulty-level="form.difficultyLevel.value"
          :skill-nodes="skills.map((s) => ({ id: s.skill_id, name: s.name, parent_id: s.parent_id }))"
          :concept-nodes="concepts.map((c) => ({ id: c.concept_id, name: c.name, parent_id: c.parent_id }))"
          :skills-loading="skillsLoading"
          :concepts-loading="conceptsLoading"
          :review-state="form.reviewState.value"
          @create-skill="onCreateSkill"
          @create-concept="onCreateConcept"
        />
      </div>

      <div v-if="savedContentNodeId && form.contentType.value === 'video'" class="flex flex-col gap-2 border-t border-border pt-4">
        <label class="text-sm font-semibold">Timed pop-ups</label>
        <VideoTimelineEditor
          :items="expandedContentState?.items.value ?? []"
          @add="onAddTimelineItem"
          @adjust-trigger="adjustTrigger"
          @adjust-hide="adjustHide"
          @remove="onRemoveExpandedContent"
        />
      </div>

      <div v-else-if="savedContentNodeId && form.contentType.value === 'article'" class="flex flex-col gap-2 border-t border-border pt-4">
        <label class="text-sm font-semibold">Paragraph pop-ups</label>
        <ArticlePopupListEditor
          :items="expandedContentState?.items.value ?? []"
          @add="onAddPopupItem"
          @adjust-paragraph="adjustParagraph"
          @remove="onRemoveExpandedContent"
        />
      </div>

      <div v-if="savedContentNodeId" data-test="challenge-section" class="flex flex-col gap-3 border-t border-border pt-4">
        <label class="text-sm font-semibold">Challenge</label>

        <ChallengeConfigPanel
          v-model:subject-skill-id="challengeForm.subjectSkillId"
          v-model:subject-concept-id="challengeForm.subjectConceptId"
          v-model:pass-threshold="challengeForm.passThreshold"
          v-model:shuffle-exercises="challengeForm.shuffleExercises"
          v-model:shuffle-options="challengeForm.shuffleOptions"
          :skill-nodes="skills.map((s) => ({ id: s.skill_id, name: s.name, parent_id: s.parent_id }))"
          :concept-nodes="concepts.map((c) => ({ id: c.concept_id, name: c.name, parent_id: c.parent_id }))"
          :allowed-skill-ids="form.skillIds.value"
          :allowed-concept-ids="form.conceptIds.value"
        />
        <button
          type="button"
          data-test="save-challenge"
          :disabled="(!challengeForm.subjectSkillId && !challengeForm.subjectConceptId) || savingChallenge"
          class="w-fit rounded-md border border-border bg-surface-raised px-3.5 py-2 text-[0.8125rem] font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          @click="saveChallenge"
        >
          Save challenge
        </button>

        <p v-if="!challenge" data-test="no-challenge" class="text-sm text-ink-subtle">
          No challenge yet — pick a subject above and save to create one.
        </p>

        <template v-else>
          <div class="flex items-center justify-between pt-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Linked exercises</span>
            <button
              type="button"
              data-test="attach-exercise"
              class="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[0.8125rem] font-semibold text-accent-fg"
              @click="pickerOpen = true"
            >
              <Plus :size="14" aria-hidden="true" />
              Attach exercise
            </button>
          </div>

          <p v-if="(challengeExercisesState?.exercises.value.length ?? 0) === 0" class="text-sm text-ink-subtle">
            No exercises attached yet.
          </p>
          <ul v-else class="flex flex-col gap-2">
            <li
              v-for="exercise in challengeExercisesState?.exercises.value"
              :key="exercise.exercise_id"
              class="flex items-center justify-between rounded-md border border-border bg-surface-sunken px-3 py-2"
            >
              <span class="text-sm font-semibold text-ink">{{ exercise.title }}</span>
              <button
                type="button"
                data-test="unlink-exercise"
                aria-label="Remove exercise"
                class="text-ink-subtle"
                @click="onUnlinkExercise(exercise.exercise_id)"
              >
                <X :size="14" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </template>
      </div>
    </main>

    <ExercisePickerModal
      :open="pickerOpen"
      :exercises="exercisePool"
      :linked-exercise-ids="challengeExercisesState?.exercises.value.map((e) => e.exercise_id) ?? []"
      @select="onExercisePicked"
      @close="pickerOpen = false"
    />
  </div>
</template>
