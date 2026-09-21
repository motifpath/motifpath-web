<script setup lang="ts">
import { computed, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'

import ArticlePopupListEditor from '@/features/teacher/components/ArticlePopupListEditor.vue'
import ChallengeModal, { type ChallengeModalInitial } from '@/features/teacher/components/ChallengeModal.vue'
import ClassificationFields from '@/features/teacher/components/ClassificationFields.vue'
import ContentTypeToggle from '@/features/teacher/components/ContentTypeToggle.vue'
import PromptEditor from '@/features/teacher/components/PromptEditor.vue'
import VideoTimelineEditor from '@/features/teacher/components/VideoTimelineEditor.vue'
import { useContentNode } from '@/features/teacher/composables/useContentNode'
import { useContentNodeForm } from '@/features/teacher/composables/useContentNodeForm'
import { useCreateContentNode } from '@/features/teacher/composables/useCreateContentNode'
import { useCreateExpandedContent } from '@/features/teacher/composables/useCreateExpandedContent'
import { useDeleteExpandedContent, useUpdateExpandedContent } from '@/features/teacher/composables/useUpdateExpandedContent'
import { useListChallengeExercises } from '@/features/teacher/composables/useListChallengeExercises'
import { useListContentNodeChallenges } from '@/features/teacher/composables/useListContentNodeChallenges'
import { useListExercises } from '@/features/teacher/composables/useListExercises'
import { useListExpandedContent } from '@/features/teacher/composables/useListExpandedContent'
import { useSaveChallenge } from '@/features/teacher/composables/useSaveChallenge'
import { useSkillConceptCreation } from '@/features/teacher/composables/useSkillConceptCreation'
import { useUpdateContentNode } from '@/features/teacher/composables/useUpdateContentNode'
import AppBar from '@/shared/components/AppBar.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useIsCompact } from '@/shared/composables/useIsCompact'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'
import { useCurrentUserStore } from '@/stores/currentUser'
import type { components } from '@/api/generated/core-domain'

type CreateExpandedContentRequest = components['schemas']['CreateExpandedContentRequest']
type UpdateExpandedContentRequest = components['schemas']['UpdateExpandedContentRequest']

const currentUser = useCurrentUserStore()
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)

const { isCompact } = useIsCompact()
const { t } = useTypedT()

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

const { skills, concepts, skillsLoading, conceptsLoading, onCreateSkill, onCreateConcept } =
  useSkillConceptCreation(form.skillIds, form.conceptIds, {
    createSkillFailed: t('contentAuthoringView.createSkillFailed'),
    createConceptFailed: t('contentAuthoringView.createConceptFailed'),
  })

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

// Classification is a mandatory dimension for gap detection and the
// recommendation engine -- both skill_ids and concept_ids must be non-empty
// on the backend, so a save attempt without them is rejected outright.
const hasClassification = computed(
  () => form.skillIds.value.length > 0 && form.conceptIds.value.length > 0,
)

async function save() {
  if (!hasClassification.value || !form.hasBody.value) return

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
    toast.success(isUpdate ? t('contentAuthoringView.contentNodeUpdated') : t('contentAuthoringView.contentNodeCreated'))
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('contentAuthoringView.saveContentNodeFailed'))
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

const { saveChallenge } = useSaveChallenge()
const { exercises: exercisePool } = useListExercises()

const challengeModalOpen = ref(false)
const savingChallenge = ref(false)
const challengeExercises = computed(() => challengeExercisesState.value?.exercises.value ?? [])

// A challenge's subject must belong to its content node's own classification.
// If the teacher removed that skill/concept from Classification after picking
// it as the subject, the modal opens without it instead of sending a stale id
// that the backend would reject as a confusing save failure.
const challengeInitial = computed<ChallengeModalInitial | null>(() => {
  const c = challenge.value
  if (!c) return null
  return {
    subjectSkillId: c.subject_skill_id && form.skillIds.value.includes(c.subject_skill_id) ? c.subject_skill_id : undefined,
    subjectConceptId:
      c.subject_concept_id && form.conceptIds.value.includes(c.subject_concept_id) ? c.subject_concept_id : undefined,
    passThreshold: c.pass_threshold,
    shuffleExercises: c.shuffle_exercises,
    shuffleOptions: c.shuffle_options,
    exercises: challengeExercises.value,
  }
})

const challengeSubjectName = computed(() => {
  const c = challenge.value
  if (!c) return ''
  const skill = skills.value.find((s) => s.skill_id === c.subject_skill_id)
  const concept = concepts.value.find((cn) => cn.concept_id === c.subject_concept_id)
  return skill?.name ?? concept?.name ?? ''
})

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

async function onAddExpandedContent(fields: CreateExpandedContentRequest) {
  try {
    await createExpandedContent(savedContentNodeId.value, fields)
    await expandedContentState.value?.retry()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('contentAuthoringView.addPopupFailed'))
  }
}

function findExpandedContent(id: string) {
  return expandedContentState.value?.items.value.find((i) => i.expanded_content_id === id)
}

type ExpandedContentTimeField = 'trigger_at_seconds' | 'hide_at_seconds' | 'trigger_at_paragraph'

// Video items nudge trigger/hide-at-seconds (both must stay present together);
// article items nudge trigger-at-paragraph (paired with duration-ms) -- one
// helper for both trigger groups instead of three near-identical functions.
async function adjustField(id: string, field: ExpandedContentTimeField, delta: number) {
  const item = findExpandedContent(id)
  if (!item) return

  const passthrough = {
    content_type: item.content_type,
    media_url: item.media_url,
    rich_content: item.rich_content,
    caption: item.caption,
  }

  let payload: UpdateExpandedContentRequest
  if (field === 'trigger_at_paragraph') {
    if (item.trigger_at_paragraph === undefined || item.duration_ms === undefined) return
    payload = { ...passthrough, trigger_at_paragraph: item.trigger_at_paragraph + delta, duration_ms: item.duration_ms }
  } else {
    if (item.trigger_at_seconds === undefined || item.hide_at_seconds === undefined) return
    payload = {
      ...passthrough,
      trigger_at_seconds: item.trigger_at_seconds + (field === 'trigger_at_seconds' ? delta : 0),
      hide_at_seconds: item.hide_at_seconds + (field === 'hide_at_seconds' ? delta : 0),
    }
  }

  try {
    await updateExpandedContent(id, payload)
    await expandedContentState.value?.retry()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('contentAuthoringView.updatePopupFailed'))
  }
}

async function onRemoveExpandedContent(id: string) {
  try {
    await deleteExpandedContent(id)
    await expandedContentState.value?.retry()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('contentAuthoringView.removePopupFailed'))
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
  challengeExercisesState.value = c ? useListChallengeExercises(c.challenge_id) : null
})

async function onSaveChallenge({
  fields,
  exerciseIds,
}: {
  fields: Parameters<typeof saveChallenge>[0]['fields']
  exerciseIds: string[]
}) {
  savingChallenge.value = true
  try {
    await saveChallenge({
      contentNodeId: savedContentNodeId.value,
      challengeId: challenge.value?.challenge_id,
      fields,
      exerciseIds,
      linkedExerciseIds: challengeExercises.value.map((e) => e.exercise_id),
    })
    challengeModalOpen.value = false
    toast.success(t('contentAuthoringView.challengeSaved'))
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('contentAuthoringView.saveChallengeFailed'))
  } finally {
    savingChallenge.value = false
    // Refresh even after a failure: the challenge itself may have been saved
    // before an exercise link failed, and the summary must show what exists.
    await challengesState.value?.retry()
    await challengeExercisesState.value?.retry()
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <AppBar
      context="teacher"
      :compact="isCompact"
      :primary-nav-to="{ name: 'teacher-content' }"
      :breadcrumb-label="isEditMode ? form.title.value || t('contentAuthoringView.editBreadcrumb') : t('contentAuthoringView.newBreadcrumb')"
      :show-save="canAuthor"
      :save-disabled="saving || !hasClassification || !form.hasBody.value"
      :just-saved="justSaved"
      :on-save="save"
    />

    <div v-if="!canAuthor" data-test="permission-denied" class="flex flex-1 items-center justify-center p-10">
      <p class="max-w-md text-center text-ink-muted">
        {{ t('contentAuthoringView.permissionDenied') }}
      </p>
    </div>

    <div v-else-if="loadingContentNode" class="flex flex-1 items-center justify-center p-10">
      <StateLoading :noun="t('contentAuthoringView.loadingNoun')" />
    </div>

    <div v-else-if="loadError" data-test="load-error" class="flex flex-1 items-center justify-center p-10">
      <StateError :message="t('contentAuthoringView.loadErrorMessage')" @retry="retryLoad" />
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
          :placeholder="t('contentAuthoringView.titlePlaceholder')"
          class="border-none bg-transparent font-bold text-ink outline-none"
          :class="isCompact ? 'text-[1.375rem] leading-[1.75rem]' : 'text-xl'"
        />
        <span class="text-sm text-ink-subtle">{{ t('contentAuthoringView.titleHint') }}</span>
      </div>

      <div class="flex flex-col gap-2.5">
        <label class="text-sm font-semibold">{{ t('contentAuthoringView.contentTypeLabel') }}</label>
        <ContentTypeToggle v-model="form.contentType.value" :disabled="isEditMode" />
        <span class="text-sm text-ink-subtle">
          {{
            isEditMode
              ? t('contentAuthoringView.typeLockedHint')
              : t('contentAuthoringView.typeUnlockedHint')
          }}
        </span>
      </div>

      <div v-if="form.contentType.value === 'video'" class="flex flex-col gap-2">
        <label for="content-media-url" class="text-sm font-semibold">{{ t('contentAuthoringView.mediaUrlLabel') }}</label>
        <input
          id="content-media-url"
          v-model="form.mediaUrl.value"
          data-test="media-url-input"
          type="url"
          :aria-invalid="form.mediaUrlInvalid.value"
          :placeholder="t('contentAuthoringView.mediaUrlPlaceholder')"
          class="w-full rounded-md border bg-surface-raised px-3 py-2 text-sm text-ink"
          :class="form.mediaUrlInvalid.value ? 'border-danger' : 'border-border'"
        />
        <span v-if="form.mediaUrlInvalid.value" data-test="media-url-error" class="text-sm text-danger">
          {{ t('contentAuthoringView.mediaUrlInvalid') }}
        </span>
        <span v-else class="text-sm text-ink-subtle">{{ t('contentAuthoringView.mediaUrlHint') }}</span>
      </div>

      <div v-else class="flex flex-col gap-2">
        <label class="text-sm font-semibold">{{ t('contentAuthoringView.articleBodyLabel') }}</label>
        <PromptEditor v-model="form.richContent.value" />
      </div>

      <div class="flex flex-col gap-2 border-t border-border pt-4">
        <label class="text-sm font-semibold">{{ t('contentAuthoringView.classificationLabel') }}</label>
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
        <label class="text-sm font-semibold">{{ t('contentAuthoringView.timedPopupsLabel') }}</label>
        <VideoTimelineEditor
          :items="expandedContentState?.items.value ?? []"
          @add="onAddExpandedContent"
          @adjust-trigger="(id, delta) => adjustField(id, 'trigger_at_seconds', delta)"
          @adjust-hide="(id, delta) => adjustField(id, 'hide_at_seconds', delta)"
          @remove="onRemoveExpandedContent"
        />
      </div>

      <div v-else-if="savedContentNodeId && form.contentType.value === 'article'" class="flex flex-col gap-2 border-t border-border pt-4">
        <label class="text-sm font-semibold">{{ t('contentAuthoringView.paragraphPopupsLabel') }}</label>
        <ArticlePopupListEditor
          :items="expandedContentState?.items.value ?? []"
          @add="onAddExpandedContent"
          @adjust-paragraph="(id, delta) => adjustField(id, 'trigger_at_paragraph', delta)"
          @remove="onRemoveExpandedContent"
        />
      </div>

      <div v-if="savedContentNodeId" data-test="challenge-section" class="flex flex-col gap-3 border-t border-border pt-4">
        <div class="flex items-center justify-between">
          <label class="text-sm font-semibold">{{ t('contentAuthoringView.challengeLabel') }}</label>
          <button
            type="button"
            data-test="open-challenge-modal"
            class="rounded-md border border-border bg-surface-raised px-3.5 py-2 text-[0.8125rem] font-semibold"
            @click="challengeModalOpen = true"
          >
            {{ challenge ? t('contentAuthoringView.editChallenge') : t('contentAuthoringView.buildChallenge') }}
          </button>
        </div>

        <p v-if="!challenge" data-test="no-challenge" class="text-sm text-ink-subtle">
          {{ t('contentAuthoringView.noChallengeMessage') }}
        </p>

        <div
          v-else
          data-test="challenge-summary"
          class="flex flex-col gap-2 rounded-md border border-border bg-surface-sunken px-3 py-2.5"
        >
          <span class="text-sm text-ink">
            {{ t('contentAuthoringView.challengeSubject', { name: challengeSubjectName }) }}
            ·
            {{ t('contentAuthoringView.challengePassThreshold', { threshold: challenge.pass_threshold }) }}
            ·
            {{
              challengeExercises.length === 1
                ? t('contentAuthoringView.challengeExerciseCountSingular', { count: 1 })
                : t('contentAuthoringView.challengeExerciseCountPlural', { count: challengeExercises.length })
            }}
          </span>
          <p v-if="challengeExercises.length === 0" data-test="challenge-empty-warning" class="text-sm text-danger">
            {{ t('contentAuthoringView.challengeEmptyWarning') }}
          </p>
          <ul v-else class="flex flex-col gap-1">
            <li v-for="exercise in challengeExercises" :key="exercise.exercise_id" class="text-sm font-semibold text-ink">
              {{ exercise.title }}
            </li>
          </ul>
        </div>
      </div>
    </main>

    <ChallengeModal
      :open="challengeModalOpen"
      :skill-nodes="skills.map((s) => ({ id: s.skill_id, name: s.name, parent_id: s.parent_id }))"
      :concept-nodes="concepts.map((c) => ({ id: c.concept_id, name: c.name, parent_id: c.parent_id }))"
      :allowed-skill-ids="form.skillIds.value"
      :allowed-concept-ids="form.conceptIds.value"
      :exercise-pool="exercisePool"
      :initial="challengeInitial"
      :saving="savingChallenge"
      @save="onSaveChallenge"
      @close="challengeModalOpen = false"
    />
  </div>
</template>
