<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import ContentNodePickerModal from '@/features/teacher/components/ContentNodePickerModal.vue'
import PathStatusPanel from '@/features/teacher/components/PathStatusPanel.vue'
import SectionedPathList, { type PathBuilderItem } from '@/features/teacher/components/SectionedPathList.vue'
import ThumbnailField from '@/features/teacher/components/ThumbnailField.vue'
import { useCreateLearningPath } from '@/features/teacher/composables/useCreateLearningPath'
import { useLearningPath } from '@/features/teacher/composables/useLearningPath'
import {
  LearningPathNotPublishableError,
  useLearningPathPublishing,
} from '@/features/teacher/composables/useLearningPathPublishing'
import { useListContentNodes } from '@/features/teacher/composables/useListContentNodes'
import { useReplaceLearningPath } from '@/features/teacher/composables/useReplaceLearningPath'
import { missingToPublishPath, missingToSavePath, type LessonStates } from '@/features/teacher/utils/pathRequirements'
import AppButton from '@/shared/components/AppButton.vue'
import EditorAppBar from '@/shared/components/EditorAppBar.vue'
import EditorBody from '@/shared/components/EditorBody.vue'
import InstrumentPicker from '@/shared/components/InstrumentPicker.vue'
import LanguageSelect from '@/shared/components/LanguageSelect.vue'
import LevelPicker from '@/shared/components/LevelPicker.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import SaveBlockers from '@/shared/components/SaveBlockers.vue'
import UnsavedChangesGuard from '@/shared/components/UnsavedChangesGuard.vue'
import { useSaveBlockers } from '@/shared/composables/useSaveBlockers'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { DifficultyLevel } from '@/shared/utils/levels'
import { useCurrentUserStore } from '@/stores/currentUser'
import type { components } from '@/api/generated/core-domain'
import TeachShell from '@/shared/components/TeachShell.vue'

type LearningPath = components['schemas']['LearningPath']
type PublishRequirement = components['schemas']['LearningPathNotPublishableError']['missing'][number]

const currentUser = useCurrentUserStore()
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)
// Only an admin publishes and unpublishes paths.
const isAdmin = computed(() => currentUser.profile?.role === 'admin')

const { sizeClass } = useSizeClass()
const isExpanded = computed(() => sizeClass.value === 'expanded')
const { t } = useTypedT()

const route = useRoute()
const rawLearningPathId = route.params.id
const learningPathId = Array.isArray(rawLearningPathId) ? rawLearningPathId[0] : rawLearningPathId
const isEditMode = !!learningPathId

const {
  learningPath: loadedLearningPath,
  isLoading: loadingLearningPath,
  error: loadError,
  retry: retryLoad,
} = learningPathId
  ? useLearningPath(learningPathId)
  : { learningPath: ref(null), isLoading: ref(false), error: ref(false), retry: async () => {} }

const { contentNodes } = useListContentNodes({ loadAll: true })
const { createLearningPath } = useCreateLearningPath()
const { replaceLearningPath } = useReplaceLearningPath()
const { publishLearningPath, unpublishLearningPath } = useLearningPathPublishing()

const title = ref('')
const summary = ref('')
const language = ref<string | null>(null)
const status = ref<LearningPath['status'] | null>(null)
// A path saved before levels existed has none, and can't be saved again until one is chosen.
const level = ref<DifficultyLevel | null>(null)
const instrumentIds = ref<string[]>([])
const thumbnailUrl = ref<string | undefined>(undefined)
const thumbnailUploading = ref(false)
const items = ref<PathBuilderItem[]>([])
const savedLearningPathId = ref('')

function loadFromLearningPath(learningPath: LearningPath) {
  title.value = learningPath.title
  summary.value = learningPath.summary ?? ''
  language.value = learningPath.language ?? null
  status.value = learningPath.status
  level.value = learningPath.level ?? null
  instrumentIds.value = [...learningPath.instrument_ids]
  thumbnailUrl.value = learningPath.thumbnail_url
  items.value = learningPath.items.map((item) => ({
    content_node_id: item.content_node_id,
    title: item.title,
    content_type: item.content_type,
    section_label: item.section_label,
  }))
  savedLearningPathId.value = learningPath.learning_path_id
  baseline.value = snapshot()
}

// What a save sends, to tell whether anything is left unsaved.
function snapshot(): string {
  return JSON.stringify([title.value, summary.value, language.value, level.value, instrumentIds.value, thumbnailUrl.value, items.value])
}
const baseline = ref(snapshot())
const isDirty = computed(() => snapshot() !== baseline.value)

watch(loadedLearningPath, (learningPath) => {
  if (!learningPath) return
  loadFromLearningPath(learningPath)
}, { immediate: true })

const pickerOpen = ref(false)

function onContentNodePicked(contentNodeId: string) {
  pickerOpen.value = false
  const contentNode = contentNodes.value.find((node) => node.content_node_id === contentNodeId)
  if (!contentNode) return
  items.value = [
    ...items.value,
    {
      content_node_id: contentNode.content_node_id,
      title: contentNode.title,
      content_type: contentNode.content_type,
      section_label: undefined,
    },
  ]
}

function onReorder(fromIndex: number, toIndex: number) {
  const reordered = [...items.value]
  const [moved] = reordered.splice(fromIndex, 1)
  if (!moved) return
  reordered.splice(toIndex, 0, moved)
  items.value = reordered
}

function onRelabel(index: number, sectionLabel: string) {
  const target = items.value[index]
  if (!target) return
  const updated = [...items.value]
  updated[index] = { ...target, section_label: sectionLabel || undefined }
  items.value = updated
}

function onRemoveItem(index: number) {
  items.value = items.value.filter((_, itemIndex) => itemIndex !== index)
}

const saving = ref(false)
const toast = useToast()

const saveState = computed(() => {
  if (saving.value) return 'saving'
  return isDirty.value || !savedLearningPathId.value ? 'unsaved' : 'saved'
})

const draft = computed(() => ({ summary: summary.value, language: language.value, level: level.value, items: items.value }))

const missingToSave = computed(() =>
  missingToSavePath(draft.value).map((field) => ({ field, label: t(`pathBuilderView.missing.${field}`) })),
)
const saveBlockers = useSaveBlockers(missingToSave)

// Which lessons learners can get, as far as the lesson list loaded so far tells.
const lessonStates = computed<LessonStates>(() => ({
  known: new Set(contentNodes.value.map((node) => node.content_node_id)),
  published: new Set(
    contentNodes.value.filter((node) => node.latest_published_version != null).map((node) => node.content_node_id),
  ),
}))

const missingForPublish = computed(() =>
  missingToPublishPath(draft.value, lessonStates.value).map((requirement) =>
    requirement.kind === 'unpublishedLesson'
      ? t('pathBuilderView.publishLessonFirst', { title: requirement.title })
      : t(`pathBuilderView.requirement.${requirement.kind}`),
  ),
)

const publishing = ref(false)
// What the last refused publish said the path still lacks.
const missingToPublish = ref<string[]>([])

function requirementLabel(requirement: PublishRequirement, unpublishedIds: string[]): string {
  if (requirement !== 'unpublished_content') return t(`pathBuilderView.requirement.${requirement}`)
  const titles = items.value
    .filter((item) => unpublishedIds.includes(item.content_node_id))
    .map((item) => item.title)
  return t('pathBuilderView.requirement.unpublishedContent', { titles: titles.join(', ') })
}

// Saves the form, returning the saved path, or null once the failure is reported.
async function saveForm(): Promise<LearningPath | null> {
  if (level.value === null) return null
  saving.value = true
  const isUpdate = !!savedLearningPathId.value
  const trimmedSummary = summary.value.trim()
  const request = {
    title: title.value,
    ...(trimmedSummary ? { summary: trimmedSummary } : {}),
    ...(language.value ? { language: language.value } : {}),
    level: level.value,
    instrument_ids: [...instrumentIds.value],
    ...(thumbnailUrl.value ? { thumbnail_url: thumbnailUrl.value } : {}),
    items: items.value.map((item) => ({
      content_node_id: item.content_node_id,
      section_label: item.section_label,
    })),
  }

  try {
    const learningPath = isUpdate
      ? await replaceLearningPath(savedLearningPathId.value, request)
      : await createLearningPath(request)
    loadFromLearningPath(learningPath)
    missingToPublish.value = []
    return learningPath
  } catch (e) {
    if (e instanceof LearningPathNotPublishableError) {
      missingToPublish.value = e.missing.map((m) => requirementLabel(m, e.unpublishedContentNodeIds))
      toast.error(t('pathBuilderView.saveWouldUnpublish'))
    } else {
      toast.error(e instanceof Error ? e.message : t('pathBuilderView.saveFailed'))
    }
    return null
  } finally {
    saving.value = false
  }
}

async function save() {
  if (saving.value || publishing.value || thumbnailUploading.value || !saveBlockers.readyToSave()) return
  const isUpdate = !!savedLearningPathId.value
  if (!(await saveForm())) return
  toast.success(isUpdate ? t('pathBuilderView.pathUpdated') : t('pathBuilderView.pathCreated'))
}

// Publishing saves the form first, so what gets published is what the author sees.
async function publish() {
  if (!saveBlockers.readyToSave()) return
  publishing.value = true
  try {
    const saved = await saveForm()
    if (!saved) return
    const result = await publishLearningPath(saved.learning_path_id)
    if (result.outcome === 'not-publishable') {
      missingToPublish.value = result.missing.map((m) => requirementLabel(m, result.unpublishedContentNodeIds))
      return
    }
    missingToPublish.value = []
    loadFromLearningPath(result.learningPath)
    toast.success(t('pathBuilderView.published'))
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('pathBuilderView.publishFailed'))
  } finally {
    publishing.value = false
  }
}

// Unpublishing keeps pending edits: it unpublishes first, then saves the form
// onto the now-draft path. Saving first could be refused for the very edit
// (a cleared summary, say) that a published path can't take.
async function unpublish() {
  publishing.value = true
  try {
    status.value = (await unpublishLearningPath(savedLearningPathId.value)).status
    await saveForm()
    toast.success(t('pathBuilderView.unpublished'))
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('pathBuilderView.unpublishFailed'))
  } finally {
    publishing.value = false
  }
}

const cardClass = 'flex flex-col gap-4 rounded-2xl border border-border bg-surface-raised p-4'
const eyebrowClass = 'text-xs font-semibold uppercase tracking-wider text-ink-muted'
const labelClass = 'text-sm font-semibold text-ink'
const hintClass = 'text-xs text-ink-muted'
const inputClass = 'h-12 rounded-xl border border-border bg-surface-sunken px-3 text-base text-ink'
const textareaClass = 'rounded-xl border border-border bg-surface-sunken px-3 py-2 text-base text-ink'
</script>

<template>
  <TeachShell section="teacher-paths" bar="none">
  <div class="flex flex-1 flex-col bg-surface">
    <EditorAppBar
      :compact="!isExpanded"
      :section-label="t('nav.paths')"
      :section-to="{ name: 'teacher-paths' }"
      :title="isEditMode ? title || t('pathBuilderView.editBreadcrumb') : t('pathBuilderView.newBreadcrumb')"
      :save-state="saveState"
      :can-save="canAuthor && !loadingLearningPath && !loadError"
      @save="save"
    />

    <div v-if="!canAuthor" data-test="permission-denied" class="flex flex-1 items-center justify-center p-10">
      <p class="max-w-md text-center text-ink-muted">
        {{ t('pathBuilderView.permissionDenied') }}
      </p>
    </div>

    <div v-else-if="loadingLearningPath" class="flex flex-1 items-center justify-center p-10">
      <LoadingSkeleton />
    </div>

    <div v-else-if="loadError" data-test="load-error" class="flex flex-1 items-center justify-center p-10">
      <LoadFailed :message="t('pathBuilderView.loadErrorMessage')" @retry="retryLoad" />
    </div>

    <EditorBody v-else data-test="builder-body" :two-columns="isExpanded">
      <template v-if="savedLearningPathId && status" #side>
        <PathStatusPanel
          :status="status"
          :is-admin="isAdmin"
          :missing="missingForPublish"
          :busy="publishing || saving"
          @publish="publish"
          @unpublish="unpublish"
        />
        <div
          v-if="missingToPublish.length"
          data-test="publish-missing"
          role="alert"
          class="flex flex-col gap-1 rounded-2xl border border-danger bg-danger-muted px-4 py-3 text-sm text-ink"
        >
          <span class="font-semibold">{{ t('pathBuilderView.missingHeading') }}</span>
          <ul class="list-disc pl-5">
            <li v-for="requirement in missingToPublish" :key="requirement">{{ requirement }}</li>
          </ul>
        </div>
      </template>

      <SaveBlockers :items="saveBlockers.shown.value" :reveal="saveBlockers.reveal.value" />

      <section :class="cardClass">
        <h2 :class="eyebrowClass">{{ t('pathBuilderView.details') }}</h2>
        <label class="flex flex-col gap-1.5">
          <span :class="labelClass">{{ t('pathBuilderView.titleLabel') }}</span>
          <input v-model="title" type="text" :placeholder="t('pathBuilderView.titlePlaceholder')" :class="inputClass" />
          <span :class="hintClass">{{ t('pathBuilderView.titleHint') }}</span>
        </label>

        <div class="flex flex-col gap-1.5">
          <label for="path-summary" :class="labelClass">{{ t('pathBuilderView.summaryLabel') }}</label>
          <textarea
            id="path-summary"
            v-model="summary"
            data-test="path-summary"
            rows="3"
            :placeholder="t('pathBuilderView.summaryPlaceholder')"
            :class="textareaClass"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="path-language" :class="labelClass">{{ t('pathBuilderView.languageLabel') }}</label>
          <LanguageSelect
            id="path-language"
            v-model="language"
            data-test="path-language"
            :empty-label="t('pathBuilderView.noLanguage')"
            class="w-fit"
          />
        </div>

        <div class="flex flex-col gap-1.5" data-field="level">
          <span :class="labelClass">{{ t('pathBuilderView.levelLabel') }}</span>
          <LevelPicker v-model="level" :label="t('pathBuilderView.levelLabel')" class="w-fit" />
        </div>

        <div class="flex flex-col gap-1.5">
          <span :class="labelClass">{{ t('pathBuilderView.instrumentsLabel') }}</span>
          <InstrumentPicker v-model="instrumentIds" />
        </div>

        <div class="flex flex-col gap-1.5">
          <span :class="labelClass">{{ t('pathBuilderView.thumbnailLabel') }}</span>
          <ThumbnailField v-model="thumbnailUrl" @uploading="thumbnailUploading = $event" />
        </div>
      </section>

      <section :class="cardClass" data-field="items">
        <div class="flex flex-col gap-1">
          <h2 :class="eyebrowClass">{{ t('pathBuilderView.lessonsHeading', { count: items.length }) }}</h2>
          <p v-if="items.length > 1" :class="hintClass">{{ t('pathBuilderView.lessonsHint') }}</p>
        </div>
        <SectionedPathList
          :items="items"
          :lessons="lessonStates"
          @reorder="onReorder"
          @relabel="onRelabel"
          @remove="onRemoveItem"
        />
        <AppButton data-test="add-content-node" variant="secondary" block @click="pickerOpen = true">
          <Plus :size="18" aria-hidden="true" />
          {{ t('pathBuilderView.addContentNodeLabel') }}
        </AppButton>
      </section>
    </EditorBody>

    <ContentNodePickerModal
      :open="pickerOpen"
      :content-nodes="contentNodes"
      :added-content-node-ids="items.map((item) => item.content_node_id)"
      @select="onContentNodePicked"
      @close="pickerOpen = false"
    />
    <UnsavedChangesGuard :dirty="isDirty" :message="t('pathBuilderView.leaveMessage')" />
  </div>
  </TeachShell>
</template>
