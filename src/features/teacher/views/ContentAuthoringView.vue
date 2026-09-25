<script setup lang="ts">
import { computed, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'

import ArticlePopupListEditor from '@/features/teacher/components/ArticlePopupListEditor.vue'
import ChallengeModal, { type ChallengeModalInitial } from '@/features/teacher/components/ChallengeModal.vue'
import ClassificationFields from '@/features/teacher/components/ClassificationFields.vue'
import ContentTypeToggle from '@/features/teacher/components/ContentTypeToggle.vue'
import ContentVersionHistory from '@/features/teacher/components/ContentVersionHistory.vue'
import ExpandedContentModal from '@/features/teacher/components/ExpandedContentModal.vue'
import PromptEditor from '@/features/teacher/components/PromptEditor.vue'
import VideoTimelineEditor from '@/features/teacher/components/VideoTimelineEditor.vue'
import { useContentNode } from '@/features/teacher/composables/useContentNode'
import { useContentNodeForm } from '@/features/teacher/composables/useContentNodeForm'
import { useCreateContentNode } from '@/features/teacher/composables/useCreateContentNode'
import { useCreateExpandedContent } from '@/features/teacher/composables/useCreateExpandedContent'
import { useDeleteExpandedContent, useUpdateExpandedContent } from '@/features/teacher/composables/useUpdateExpandedContent'
import { useListChallengeExercises } from '@/features/teacher/composables/useListChallengeExercises'
import { useListContentNodeChallenges } from '@/features/teacher/composables/useListContentNodeChallenges'
import { useListContentNodeVersions } from '@/features/teacher/composables/useListContentNodeVersions'
import { useListExercises } from '@/features/teacher/composables/useListExercises'
import { useListExpandedContent } from '@/features/teacher/composables/useListExpandedContent'
import { usePublishContentNode } from '@/features/teacher/composables/usePublishContentNode'
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
type ContentNode = components['schemas']['ContentNode']

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
const savedTeacherId = ref('')
const latestPublishedVersion = ref<number | null>(null)

function applySavedContentNode(contentNode: ContentNode) {
  form.loadFromContentNode(contentNode)
  savedContentNodeId.value = contentNode.content_node_id
  savedTeacherId.value = contentNode.teacher.user_id
  latestPublishedVersion.value = contentNode.latest_published_version ?? null
}

watch(
  loadedContentNode,
  (contentNode) => {
    if (contentNode) applySavedContentNode(contentNode)
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
const canSave = computed(() => hasClassification.value && form.hasBody.value)

async function persist() {
  const contentNode = savedContentNodeId.value
    ? await updateContentNode(savedContentNodeId.value, form.toUpdateContentNodeRequest())
    : await createContentNode(form.toCreateContentNodeRequest())
  applySavedContentNode(contentNode)
}

async function save() {
  if (!canSave.value) return

  saving.value = true
  const isUpdate = !!savedContentNodeId.value

  try {
    await persist()

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

// Publishing (and reading the version history) is limited to the node's
// creating teacher or an admin -- the same rule the API enforces.
const canPublish = computed(() => {
  const profile = currentUser.profile
  if (!profile || !savedContentNodeId.value) return false
  return profile.role === 'admin' || (profile.role === 'teacher' && profile.user_id === savedTeacherId.value)
})

type VersionsState = ReturnType<typeof useListContentNodeVersions>
const versionsState = shallowRef<VersionsState | null>(null)

watch(
  [savedContentNodeId, canPublish],
  ([id, allowed]) => {
    if (!id || !allowed) return
    versionsState.value = useListContentNodeVersions(id)
  },
  { immediate: true },
)

const { publishContentNode } = usePublishContentNode()
const publishing = ref(false)

// A publish snapshots the node's saved state, so the draft on screen is saved
// first -- otherwise unsaved edits would silently be left out of the version.
async function publish() {
  if (!canSave.value) return

  publishing.value = true
  try {
    try {
      await persist()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('contentAuthoringView.saveContentNodeFailed'))
      return
    }
    const version = await publishContentNode(savedContentNodeId.value)
    latestPublishedVersion.value = version.version_number
    toast.success(t('contentAuthoringView.publishedVersion', { version: version.version_number }))
    await versionsState.value?.retry()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('contentAuthoringView.publishFailed'))
  } finally {
    publishing.value = false
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
const { exercises: exercisePool } = useListExercises({ loadAll: true })

const challengeModalOpen = ref(false)
const savingChallenge = ref(false)
const challengeExercises = computed(() => challengeExercisesState.value?.exercises.value ?? [])
const challengeExercisesFailed = computed(() => challengeExercisesState.value?.error.value ?? false)
const challengesFailed = computed(() => challengesState.value?.error.value ?? false)
// Until the node's challenges have loaded (or after a failed load) `challenge`
// is null even when one exists, and saving would create a second challenge.
const challengesReady = computed(() => {
  const state = challengesState.value
  return !!state && !state.isLoading.value && !state.error.value
})
// The modal seeds its draft from the linked exercises once, when it opens, and
// saving unlinks whatever the draft leaves out. Opening it before they have
// loaded (or after a failed load, which leaves the list empty) would therefore
// save an empty draft over the challenge's real exercises.
const challengeExercisesReady = computed(() => {
  const state = challengeExercisesState.value
  return !!state && !state.isLoading.value && !state.error.value
})
// A save is also blocked while a challenge exists but its exercise list is
// reloading: diffing against an empty list would re-link exercises that are
// already attached, which the API rejects as a conflict.
const challengeSaveBlocked = computed(
  () => savingChallenge.value || (!!challenge.value && !challengeExercisesReady.value),
)

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

const popupModalOpen = ref(false)
const editingPopupId = ref<string | null>(null)
const savingPopup = ref(false)

function openAddPopup() {
  editingPopupId.value = null
  popupModalOpen.value = true
}

function openEditPopup(id: string) {
  editingPopupId.value = id
  popupModalOpen.value = true
}

// The modal stays open on failure so a long rich-text draft isn't lost.
async function onSavePopup(fields: CreateExpandedContentRequest) {
  const editingId = editingPopupId.value
  savingPopup.value = true
  try {
    if (editingId) {
      await updateExpandedContent(editingId, fields)
    } else {
      await createExpandedContent(savedContentNodeId.value, fields)
    }
    popupModalOpen.value = false
    await expandedContentState.value?.retry()
  } catch (e) {
    toast.error(
      e instanceof Error
        ? e.message
        : editingId
          ? t('contentAuthoringView.updatePopupFailed')
          : t('contentAuthoringView.addPopupFailed'),
    )
  } finally {
    savingPopup.value = false
  }
}

function findExpandedContent(id: string) {
  return expandedContentState.value?.items.value.find((i) => i.expanded_content_id === id)
}

const editingPopup = computed(() => (editingPopupId.value ? (findExpandedContent(editingPopupId.value) ?? null) : null))

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
    // Refresh even after a failure (the challenge itself may have been saved
    // before an exercise link failed), and only then allow another save: until
    // the refresh lands, the view can't tell an update from a create.
    try {
      await challengesState.value?.retry()
      await challengeExercisesState.value?.retry()
    } finally {
      savingChallenge.value = false
    }
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
      :save-disabled="saving || publishing || !canSave"
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
          @add="openAddPopup"
          @edit="openEditPopup"
          @adjust-trigger="(id, delta) => adjustField(id, 'trigger_at_seconds', delta)"
          @adjust-hide="(id, delta) => adjustField(id, 'hide_at_seconds', delta)"
          @remove="onRemoveExpandedContent"
        />
      </div>

      <div v-else-if="savedContentNodeId && form.contentType.value === 'article'" class="flex flex-col gap-2 border-t border-border pt-4">
        <label class="text-sm font-semibold">{{ t('contentAuthoringView.paragraphPopupsLabel') }}</label>
        <ArticlePopupListEditor
          :items="expandedContentState?.items.value ?? []"
          @add="openAddPopup"
          @edit="openEditPopup"
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
            :disabled="!challengesReady || (!!challenge && !challengeExercisesReady)"
            class="rounded-md border border-border bg-surface-raised px-3.5 py-2 text-[0.8125rem] font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            @click="challengeModalOpen = true"
          >
            {{ challenge ? t('contentAuthoringView.editChallenge') : t('contentAuthoringView.buildChallenge') }}
          </button>
        </div>

        <p v-if="challengesFailed" data-test="challenge-list-error" class="flex items-center gap-2 text-sm text-danger">
          {{ t('contentAuthoringView.challengesError') }}
          <button
            type="button"
            data-test="challenge-list-retry"
            class="rounded-md border border-border bg-surface-raised px-2.5 py-1 text-[0.8125rem] font-semibold text-ink"
            @click="challengesState?.retry()"
          >
            {{ t('buttons.tryAgain') }}
          </button>
        </p>
        <p v-else-if="!challengesReady" class="text-sm text-ink-subtle">
          {{ t('contentAuthoringView.challengesLoading') }}
        </p>
        <p v-else-if="!challenge" data-test="no-challenge" class="text-sm text-ink-subtle">
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
          <p v-if="challengeExercisesFailed" data-test="challenge-exercises-error" class="flex items-center gap-2 text-sm text-danger">
            {{ t('contentAuthoringView.challengeExercisesError') }}
            <button
              type="button"
              data-test="challenge-exercises-retry"
              class="rounded-md border border-border bg-surface-raised px-2.5 py-1 text-[0.8125rem] font-semibold text-ink"
              @click="challengeExercisesState?.retry()"
            >
              {{ t('buttons.tryAgain') }}
            </button>
          </p>
          <p v-else-if="!challengeExercisesReady" class="text-sm text-ink-subtle">
            {{ t('contentAuthoringView.challengeExercisesLoading') }}
          </p>
          <p v-else-if="challengeExercises.length === 0" data-test="challenge-empty-warning" class="text-sm text-danger">
            {{ t('contentAuthoringView.challengeEmptyWarning') }}
          </p>
          <ul v-else class="flex flex-col gap-1">
            <li v-for="exercise in challengeExercises" :key="exercise.exercise_id" class="text-sm font-semibold text-ink">
              {{ exercise.title }}
            </li>
          </ul>
        </div>
      </div>

      <div v-if="canPublish" data-test="publish-section" class="flex flex-col gap-3 border-t border-border pt-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-col gap-0.5">
            <label class="text-sm font-semibold">{{ t('contentAuthoringView.publishingLabel') }}</label>
            <span data-test="publish-status" class="text-sm text-ink-subtle">
              {{
                latestPublishedVersion === null
                  ? t('contentAuthoringView.notPublishedYet')
                  : t('contentAuthoringView.publishedAs', { version: latestPublishedVersion })
              }}
            </span>
          </div>
          <button
            type="button"
            data-test="publish-button"
            :disabled="publishing || saving || !canSave"
            class="rounded-md bg-accent px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-fg disabled:cursor-not-allowed disabled:opacity-60"
            @click="publish"
          >
            {{ publishing ? t('contentAuthoringView.publishing') : t('contentAuthoringView.publishButton') }}
          </button>
        </div>
        <span class="text-sm text-ink-subtle">{{ t('contentAuthoringView.publishHint') }}</span>

        <label class="text-sm font-semibold">{{ t('contentVersionHistory.heading') }}</label>
        <ContentVersionHistory
          :versions="versionsState?.versions.value ?? []"
          :loading="versionsState?.isLoading.value ?? true"
          :error="versionsState?.error.value ?? false"
          :latest-version="latestPublishedVersion"
          @retry="versionsState?.retry()"
        />
      </div>
    </main>

    <ExpandedContentModal
      :open="popupModalOpen"
      :timing="form.contentType.value === 'video' ? 'seconds' : 'paragraph'"
      :item="editingPopup"
      :saving="savingPopup"
      @save="onSavePopup"
      @close="popupModalOpen = false"
    />

    <ChallengeModal
      :open="challengeModalOpen"
      :skill-nodes="skills.map((s) => ({ id: s.skill_id, name: s.name, parent_id: s.parent_id }))"
      :concept-nodes="concepts.map((c) => ({ id: c.concept_id, name: c.name, parent_id: c.parent_id }))"
      :allowed-skill-ids="form.skillIds.value"
      :allowed-concept-ids="form.conceptIds.value"
      :exercise-pool="exercisePool"
      :initial="challengeInitial"
      :saving="challengeSaveBlocked"
      @save="onSaveChallenge"
      @close="challengeModalOpen = false"
    />
  </div>
</template>
