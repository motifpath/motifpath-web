<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import ContentNodePickerModal from '@/features/teacher/components/ContentNodePickerModal.vue'
import SectionedPathList, { type PathBuilderItem } from '@/features/teacher/components/SectionedPathList.vue'
import { useCreateLearningPath } from '@/features/teacher/composables/useCreateLearningPath'
import { useLearningPath } from '@/features/teacher/composables/useLearningPath'
import { useListContentNodes } from '@/features/teacher/composables/useListContentNodes'
import { useReplaceLearningPath } from '@/features/teacher/composables/useReplaceLearningPath'
import AppBar from '@/shared/components/AppBar.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useIsCompact } from '@/shared/composables/useIsCompact'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'
import { useCurrentUserStore } from '@/stores/currentUser'
import type { components } from '@/api/generated/core-domain'

type LearningPath = components['schemas']['LearningPath']

const currentUser = useCurrentUserStore()
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)

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

const title = ref('')
const items = ref<PathBuilderItem[]>([])
const savedLearningPathId = ref('')

function loadFromLearningPath(learningPath: LearningPath) {
  title.value = learningPath.title
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

async function save() {
  saving.value = true
  const isUpdate = !!savedLearningPathId.value
  const request = {
    title: title.value,
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

    justSaved.value = true
    clearTimeout(justSavedTimeout)
    justSavedTimeout = setTimeout(() => (justSaved.value = false), 2000)
    toast.success(isUpdate ? t('pathBuilderView.pathUpdated') : t('pathBuilderView.pathCreated'))
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('pathBuilderView.saveFailed'))
  } finally {
    saving.value = false
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
      :save-disabled="saving || items.length === 0"
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
