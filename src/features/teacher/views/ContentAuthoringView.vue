<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import ClassificationFields from '@/features/teacher/components/ClassificationFields.vue'
import ContentTypeToggle from '@/features/teacher/components/ContentTypeToggle.vue'
import { useContentNode } from '@/features/teacher/composables/useContentNode'
import { useContentNodeForm } from '@/features/teacher/composables/useContentNodeForm'
import { useCreateContentNode } from '@/features/teacher/composables/useCreateContentNode'
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
          v-model:skill="form.skill.value"
          v-model:concept="form.concept.value"
          v-model:difficulty-level="form.difficultyLevel.value"
          :review-state="form.reviewState.value"
        />
      </div>
    </main>
  </div>
</template>
