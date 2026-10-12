<script setup lang="ts">
import { ArrowRight, Pencil, Trash2 } from 'lucide-vue-next'
import { computed, ref, useId } from 'vue'
import { useRouter } from 'vue-router'

import type { CheckpointDraft } from '@/features/teacher/composables/useCourseForm'
import AppButton from '@/shared/components/AppButton.vue'
import OrderedList from '@/shared/components/OrderedList.vue'
import OrderedRow, { type OrderedRowAction } from '@/shared/components/OrderedRow.vue'
import OverlayPanel from '@/shared/components/OverlayPanel.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

/** What the course editor knows of a checkpoint's path: whether learners can get it, and its size. */
export interface CheckpointPathInfo {
  status: 'draft' | 'published'
  lessonCount: number
}

const props = withDefaults(
  defineProps<{
    checkpoints: CheckpointDraft[]
    /** By learning path id; a path not looked up yet is missing. */
    pathInfo: Record<string, CheckpointPathInfo>
    disabled?: boolean
  }>(),
  { disabled: false },
)
const emit = defineEmits<{
  move: [fromIndex: number, toIndex: number]
  remove: [index: number]
  updateOverride: [index: number, value: string]
}>()

const { t } = useTypedT()
const router = useRouter()

const actions = computed<OrderedRowAction[]>(() =>
  props.disabled
    ? []
    : [
        { id: 'rename', label: t('courseCheckpointList.rename'), icon: Pencil },
        { id: 'open', label: t('courseCheckpointList.open'), icon: ArrowRight },
        { id: 'remove', label: t('courseCheckpointList.remove'), icon: Trash2, danger: true },
      ],
)

function titleOf(checkpoint: CheckpointDraft, index: number): string {
  return `${index + 1} · ${checkpoint.override.trim() || checkpoint.pathTitle || '…'}`
}

function metaOf(checkpoint: CheckpointDraft): string {
  const info = props.pathInfo[checkpoint.learningPathId]
  if (!info) return t('courseCheckpointList.path')
  const state = info.status === 'published' ? t('courseCheckpointList.published') : t('courseCheckpointList.draftPublishFirst')
  return [t('courseCheckpointList.path'), t('courseCheckpointList.lessons', { count: info.lessonCount }), state].join(' · ')
}

function blocksPublishing(checkpoint: CheckpointDraft): boolean {
  return props.pathInfo[checkpoint.learningPathId]?.status === 'draft'
}

function onAction(index: number, id: string) {
  const checkpoint = props.checkpoints[index]
  if (!checkpoint) return
  if (id === 'rename') startRename(index)
  else if (id === 'open') void router.push({ name: 'teacher-path-edit', params: { id: checkpoint.learningPathId } })
  else if (id === 'remove') emit('remove', index)
}

const renaming = ref<{ index: number; value: string; placeholder: string } | null>(null)
const renameInputId = useId()

function startRename(index: number) {
  const checkpoint = props.checkpoints[index]
  if (!checkpoint) return
  renaming.value = { index, value: checkpoint.override, placeholder: checkpoint.pathTitle ?? '' }
}

function confirmRename() {
  if (!renaming.value) return
  emit('updateOverride', renaming.value.index, renaming.value.value.trim())
  renaming.value = null
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <p v-if="checkpoints.length === 0" data-test="checkpoints-empty" class="text-sm text-ink-subtle">
      {{ t('courseCheckpointList.empty') }}
    </p>

    <OrderedList v-else @move="(from, to) => emit('move', from, to)">
      <OrderedRow
        v-for="(checkpoint, index) in checkpoints"
        :key="checkpoint.key"
        :index="index"
        :count="checkpoints.length"
        :title="titleOf(checkpoint, index)"
        :meta="metaOf(checkpoint)"
        :meta-tone="blocksPublishing(checkpoint) ? 'warning' : 'muted'"
        :draggable="!disabled"
        :actions="actions"
        @action="onAction(index, $event)"
      />
    </OrderedList>

    <OverlayPanel :open="renaming !== null" :title="t('courseCheckpointList.rename')" @close="renaming = null">
      <form v-if="renaming" class="flex flex-col gap-2" @submit.prevent="confirmRename">
        <label :for="renameInputId" class="text-sm font-semibold text-ink">{{ t('courseCheckpointList.renameLabel') }}</label>
        <input
          :id="renameInputId"
          v-model="renaming.value"
          data-test="checkpoint-rename-input"
          type="text"
          :placeholder="renaming.placeholder"
          class="h-12 rounded-xl border border-border bg-surface-sunken px-3 text-base text-ink"
        />
        <p class="text-xs text-ink-muted">{{ t('courseCheckpointList.renameHint') }}</p>
      </form>
      <template #actions>
        <AppButton data-test="checkpoint-rename-confirm" block @click="confirmRename">
          {{ t('courseCheckpointList.renameConfirm') }}
        </AppButton>
      </template>
    </OverlayPanel>
  </div>
</template>
