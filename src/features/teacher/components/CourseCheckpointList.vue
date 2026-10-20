<script setup lang="ts">
import { ArrowRight, Pencil, Trash2 } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import type { CheckpointDraft } from '@/features/teacher/composables/useCourseForm'
import OrderedList from '@/shared/components/OrderedList.vue'
import OrderedRow, { type OrderedRowAction } from '@/shared/components/OrderedRow.vue'
import TextEntrySheet from '@/shared/components/TextEntrySheet.vue'
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

// The checkpoint being renamed in this course, if any.
const renamingIndex = ref<number | null>(null)
const renaming = computed(() => (renamingIndex.value === null ? null : (props.checkpoints[renamingIndex.value] ?? null)))

function startRename(index: number) {
  renamingIndex.value = index
}

function confirmRename(value: string) {
  if (renamingIndex.value !== null) emit('updateOverride', renamingIndex.value, value)
  renamingIndex.value = null
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

    <TextEntrySheet
      :open="renaming !== null"
      :title="t('courseCheckpointList.rename')"
      :label="t('courseCheckpointList.renameLabel')"
      :hint="t('courseCheckpointList.renameHint')"
      :placeholder="renaming?.pathTitle ?? ''"
      :value="renaming?.override ?? ''"
      :confirm-label="t('courseCheckpointList.renameConfirm')"
      @confirm="confirmRename"
      @close="renamingIndex = null"
    />
  </div>
</template>
