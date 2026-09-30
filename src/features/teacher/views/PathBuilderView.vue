<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import ContentNodePickerModal from '@/features/teacher/components/ContentNodePickerModal.vue'
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
import AppBar from '@/shared/components/AppBar.vue'
import InstrumentPicker from '@/shared/components/InstrumentPicker.vue'
import LanguageSelect from '@/shared/components/LanguageSelect.vue'
import LevelPicker from '@/shared/components/LevelPicker.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useIsCompact } from '@/shared/composables/useIsCompact'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { DifficultyLevel } from '@/shared/utils/levels'
import { useCurrentUserStore } from '@/stores/currentUser'
import type { components } from '@/api/generated/core-domain'

type LearningPath = components['schemas']['LearningPath']
type PublishRequirement = components['schemas']['LearningPathNotPublishableError']['missing'][number]

const currentUser = useCurrentUserStore()
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)
// Only an admin publishes and unpublishes paths.
const isAdmin = computed(() => currentUser.profile?.role === 'admin')

const { isCompact } = useIsCompact()
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
}

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
const justSaved = ref(false)
let justSavedTimeout: ReturnType<typeof setTimeout> | undefined
onUnmounted(() => clearTimeout(justSavedTimeout))

const toast = useToast()

const canSave = computed(
  () => !saving.value && !thumbnailUploading.value && items.value.length > 0 && level.value !== null,
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
  const isUpdate = !!savedLearningPathId.value
  if (!(await saveForm())) return
  justSaved.value = true
  clearTimeout(justSavedTimeout)
  justSavedTimeout = setTimeout(() => (justSaved.value = false), 2000)
  toast.success(isUpdate ? t('pathBuilderView.pathUpdated') : t('pathBuilderView.pathCreated'))
}

// Publishing saves the form first, so what gets published is what the author sees.
async function publish() {
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
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <AppBar
      context="teacher"
      :compact="isCompact"
      :primary-nav-to="{ name: 'teacher-paths' }"
      :breadcrumb-label="isEditMode ? title || t('pathBuilderView.editBreadcrumb') : t('pathBuilderView.newBreadcrumb')"
      :show-save="canAuthor"
      :save-disabled="!canSave"
      :just-saved="justSaved"
      :on-save="save"
    />

    <div v-if="!canAuthor" data-test="permission-denied" class="flex flex-1 items-center justify-center p-10">
      <p class="max-w-md text-center text-ink-muted">
        {{ t('pathBuilderView.permissionDenied') }}
      </p>
    </div>

    <div v-else-if="loadingLearningPath" class="flex flex-1 items-center justify-center p-10">
      <StateLoading :noun="t('pathBuilderView.loadingNoun')" />
    </div>

    <div v-else-if="loadError" data-test="load-error" class="flex flex-1 items-center justify-center p-10">
      <StateError :message="t('pathBuilderView.loadErrorMessage')" @retry="retryLoad" />
    </div>

    <main
      v-else
      data-test="builder-body"
      class="flex min-w-0 flex-1 flex-col gap-6"
      :class="isCompact ? 'px-4 pb-6 pt-[20px]' : 'px-[48px] pb-[80px] pt-10'"
    >
      <div class="flex flex-col gap-1.5">
        <input
          v-model="title"
          type="text"
          :placeholder="t('pathBuilderView.titlePlaceholder')"
          class="border-none bg-transparent font-bold text-ink outline-none"
          :class="isCompact ? 'text-[1.375rem] leading-[1.75rem]' : 'text-xl'"
        />
        <span class="text-sm text-ink-subtle">{{ t('pathBuilderView.titleHint') }}</span>
      </div>

      <div
        v-if="savedLearningPathId && status"
        data-test="publishing"
        class="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4"
      >
        <div class="flex flex-wrap items-center gap-3">
          <span
            data-test="path-status"
            class="rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-semibold text-accent-text"
          >{{ t(`pathStatus.${status}`) }}</span>
          <template v-if="isAdmin">
            <button
              v-if="status === 'draft'"
              type="button"
              data-test="publish"
              class="rounded-md bg-accent px-3 py-1.5 text-[0.8125rem] font-semibold text-accent-fg disabled:opacity-50"
              :disabled="publishing || !canSave"
              @click="publish"
            >
              {{ t('pathBuilderView.publish') }}
            </button>
            <button
              v-else
              type="button"
              data-test="unpublish"
              class="rounded-md border border-border px-3 py-1.5 text-[0.8125rem] font-semibold text-ink disabled:opacity-50"
              :disabled="publishing"
              @click="unpublish"
            >
              {{ t('pathBuilderView.unpublish') }}
            </button>
          </template>
          <span v-else class="text-sm text-ink-subtle">{{ t('pathBuilderView.adminPublishes') }}</span>
        </div>
        <div v-if="missingToPublish.length" data-test="publish-missing" class="flex flex-col gap-1 text-sm text-ink-muted">
          <span class="font-semibold text-ink">{{ t('pathBuilderView.missingHeading') }}</span>
          <ul class="list-disc pl-5">
            <li v-for="requirement in missingToPublish" :key="requirement">{{ requirement }}</li>
          </ul>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <label for="path-summary" class="text-sm font-semibold">{{ t('pathBuilderView.summaryLabel') }}</label>
        <textarea
          id="path-summary"
          v-model="summary"
          data-test="path-summary"
          rows="3"
          :placeholder="t('pathBuilderView.summaryPlaceholder')"
          class="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label for="path-language" class="text-sm font-semibold">{{ t('pathBuilderView.languageLabel') }}</label>
        <LanguageSelect
          id="path-language"
          v-model="language"
          data-test="path-language"
          :empty-label="t('pathBuilderView.noLanguage')"
          class="w-fit"
        />
        <span class="text-sm text-ink-subtle">{{ t('pathBuilderView.publishNeeds') }}</span>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-semibold">{{ t('pathBuilderView.levelLabel') }}</span>
        <LevelPicker v-model="level" :label="t('pathBuilderView.levelLabel')" class="w-fit" />
        <span v-if="level === null" data-test="level-required" class="text-sm text-ink-subtle">
          {{ t('pathBuilderView.levelRequired') }}
        </span>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-semibold">{{ t('pathBuilderView.instrumentsLabel') }}</span>
        <InstrumentPicker v-model="instrumentIds" />
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-semibold">{{ t('pathBuilderView.thumbnailLabel') }}</span>
        <ThumbnailField v-model="thumbnailUrl" @uploading="thumbnailUploading = $event" />
      </div>

      <div class="flex flex-col gap-3 border-t border-border pt-4">
        <div class="flex items-center justify-between">
          <label class="text-sm font-semibold">{{ t('pathBuilderView.contentLabel') }}</label>
          <button
            type="button"
            data-test="add-content-node"
            class="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[0.8125rem] font-semibold text-accent-fg"
            @click="pickerOpen = true"
          >
            <Plus :size="14" aria-hidden="true" />
            {{ t('pathBuilderView.addContentNodeLabel') }}
          </button>
        </div>

        <SectionedPathList
          :items="items"
          @reorder="onReorder"
          @relabel="onRelabel"
          @remove="onRemoveItem"
        />
      </div>
    </main>

    <ContentNodePickerModal
      :open="pickerOpen"
      :content-nodes="contentNodes"
      :added-content-node-ids="items.map((item) => item.content_node_id)"
      @select="onContentNodePicked"
      @close="pickerOpen = false"
    />
  </div>
</template>
