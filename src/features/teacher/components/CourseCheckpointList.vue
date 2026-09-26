<script setup lang="ts">
import { ArrowDown, ArrowUp, GripVertical, X } from 'lucide-vue-next'
import { ref } from 'vue'

import type { CheckpointDraft } from '@/features/teacher/composables/useCourseForm'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = withDefaults(defineProps<{ checkpoints: CheckpointDraft[]; disabled?: boolean }>(), {
  disabled: false,
})
const emit = defineEmits<{
  move: [fromIndex: number, toIndex: number]
  remove: [index: number]
  updateOverride: [index: number, value: string]
}>()

const { t } = useTypedT()

// A row is only draggable while its handle is held, so text in its title
// input can still be selected and dragged normally.
const armedIndex = ref<number | null>(null)
const draggedIndex = ref<number | null>(null)
const dropTargetIndex = ref<number | null>(null)

function onDragStart(index: number, event: DragEvent) {
  if (props.disabled || armedIndex.value !== index) {
    event.preventDefault()
    return
  }
  draggedIndex.value = index
  event.dataTransfer?.setData('text/plain', String(index))
}

function onDragOver(index: number) {
  if (draggedIndex.value === null) return
  dropTargetIndex.value = index
}

function onDrop(index: number) {
  const from = draggedIndex.value
  draggedIndex.value = null
  dropTargetIndex.value = null
  if (from === null || from === index) return
  emit('move', from, index)
}

function onDragEnd() {
  armedIndex.value = null
  draggedIndex.value = null
  dropTargetIndex.value = null
}

function onOverrideInput(index: number, event: Event) {
  if (!(event.target instanceof HTMLInputElement)) return
  emit('updateOverride', index, event.target.value)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <p v-if="checkpoints.length === 0" data-test="checkpoints-empty" class="text-sm text-ink-subtle">
      {{ t('courseCheckpointList.empty') }}
    </p>

    <ol v-else class="flex flex-col gap-2">
      <li
        v-for="(checkpoint, index) in checkpoints"
        :key="checkpoint.key"
        data-test="checkpoint-row"
        :draggable="!disabled && armedIndex === index ? 'true' : 'false'"
        class="flex flex-wrap items-center gap-3 rounded-md border bg-surface-sunken px-3 py-2.5"
        :class="[
          dropTargetIndex === index && draggedIndex !== index ? 'border-accent' : 'border-border',
          draggedIndex === index ? 'opacity-60' : '',
        ]"
        @dragstart="onDragStart(index, $event)"
        @dragover.prevent="onDragOver(index)"
        @drop.prevent="onDrop(index)"
        @dragend="onDragEnd"
      >
        <span
          v-if="!disabled"
          data-test="checkpoint-drag-handle"
          :title="t('courseCheckpointList.dragHandleAriaLabel')"
          class="shrink-0 cursor-grab text-ink-subtle"
          @pointerdown="armedIndex = index"
          @pointerup="armedIndex = null"
        >
          <GripVertical :size="16" aria-hidden="true" />
        </span>
        <span
          data-test="checkpoint-position"
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-raised text-xs font-semibold text-ink-muted"
        >
          {{ index + 1 }}
        </span>

        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <span data-test="checkpoint-path-title" class="truncate text-sm font-semibold text-ink">
            {{ checkpoint.pathTitle ?? '…' }}
          </span>
          <input
            type="text"
            data-test="checkpoint-override"
            :value="checkpoint.override"
            :placeholder="checkpoint.pathTitle ?? ''"
            :aria-label="t('courseCheckpointList.overrideAriaLabel', { position: index + 1 })"
            :disabled="disabled"
            class="w-full rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm disabled:cursor-not-allowed"
            @input="onOverrideInput(index, $event)"
          />
        </div>

        <template v-if="!disabled">
          <button
            type="button"
            data-test="checkpoint-move-up"
            :aria-label="t('courseCheckpointList.moveUpAriaLabel')"
            :disabled="index === 0"
            class="flex h-[26px] w-[26px] items-center justify-center rounded-sm border border-border bg-surface-raised text-ink-subtle disabled:cursor-not-allowed disabled:opacity-40"
            @click="emit('move', index, index - 1)"
          >
            <ArrowUp :size="13" aria-hidden="true" />
          </button>
          <button
            type="button"
            data-test="checkpoint-move-down"
            :aria-label="t('courseCheckpointList.moveDownAriaLabel')"
            :disabled="index === checkpoints.length - 1"
            class="flex h-[26px] w-[26px] items-center justify-center rounded-sm border border-border bg-surface-raised text-ink-subtle disabled:cursor-not-allowed disabled:opacity-40"
            @click="emit('move', index, index + 1)"
          >
            <ArrowDown :size="13" aria-hidden="true" />
          </button>
          <button
            type="button"
            data-test="checkpoint-remove"
            :aria-label="t('courseCheckpointList.removeAriaLabel')"
            class="flex h-[26px] w-[26px] items-center justify-center rounded-sm text-ink-subtle"
            @click="emit('remove', index)"
          >
            <X :size="14" aria-hidden="true" />
          </button>
        </template>
      </li>
    </ol>
  </div>
</template>
