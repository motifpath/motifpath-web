<script setup lang="ts">
import { Minus, Pencil, Plus, X } from 'lucide-vue-next'
import { useTypedT } from '@/shared/composables/useTypedT'

import type { components } from '@/api/generated/core-domain'

type ExpandedContent = components['schemas']['ExpandedContent']

defineProps<{ items: ExpandedContent[] }>()
const emit = defineEmits<{
  adjustTrigger: [id: string, deltaSeconds: number]
  adjustHide: [id: string, deltaSeconds: number]
  remove: [id: string]
  add: []
  edit: [id: string]
}>()

const { t } = useTypedT()
</script>

<template>
  <div class="flex flex-col gap-3">
    <p v-if="items.length === 0" class="text-sm text-ink-subtle">{{ t('videoTimelineEditor.emptyMessage') }}</p>

    <div
      v-for="item in items"
      :key="item.expanded_content_id"
      data-test="timeline-item"
      class="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface-sunken px-3 py-2.5"
    >
      <div class="flex items-center gap-1.5 text-sm">
        <span class="text-ink-subtle">{{ t('videoTimelineEditor.showsAt') }}</span>
        <button
          type="button"
          data-test="trigger-decrement"
          :disabled="(item.trigger_at_seconds ?? 0) <= 0"
          class="flex h-6 w-6 items-center justify-center rounded-full border border-border disabled:cursor-not-allowed disabled:opacity-40"
          @click="emit('adjustTrigger', item.expanded_content_id, -1)"
        >
          <Minus :size="12" aria-hidden="true" />
        </button>
        <span class="w-6 text-center font-semibold">{{ item.trigger_at_seconds }}</span>
        <button
          type="button"
          data-test="trigger-increment"
          class="flex h-6 w-6 items-center justify-center rounded-full border border-border"
          @click="emit('adjustTrigger', item.expanded_content_id, 1)"
        >
          <Plus :size="12" aria-hidden="true" />
        </button>
      </div>

      <div class="flex items-center gap-1.5 text-sm">
        <span class="text-ink-subtle">{{ t('videoTimelineEditor.hidesAt') }}</span>
        <button
          type="button"
          data-test="hide-decrement"
          :disabled="(item.hide_at_seconds ?? 0) <= 0"
          class="flex h-6 w-6 items-center justify-center rounded-full border border-border disabled:cursor-not-allowed disabled:opacity-40"
          @click="emit('adjustHide', item.expanded_content_id, -1)"
        >
          <Minus :size="12" aria-hidden="true" />
        </button>
        <span class="w-6 text-center font-semibold">{{ item.hide_at_seconds }}</span>
        <button
          type="button"
          data-test="hide-increment"
          class="flex h-6 w-6 items-center justify-center rounded-full border border-border"
          @click="emit('adjustHide', item.expanded_content_id, 1)"
        >
          <Plus :size="12" aria-hidden="true" />
        </button>
      </div>

      <span data-test="timeline-item-kind" class="rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-semibold text-accent-text">
        {{ t(`expandedContentModal.kinds.${item.content_type}`) }}
      </span>
      <span v-if="item.caption" class="flex-1 text-sm text-ink-subtle">{{ item.caption }}</span>

      <button
        type="button"
        data-test="timeline-item-edit"
        :aria-label="t('videoTimelineEditor.editAriaLabel')"
        class="ml-auto text-ink-subtle"
        @click="emit('edit', item.expanded_content_id)"
      >
        <Pencil :size="14" aria-hidden="true" />
      </button>

      <button
        type="button"
        data-test="timeline-item-remove"
        :aria-label="t('videoTimelineEditor.removeAriaLabel')"
        class="text-ink-subtle"
        @click="emit('remove', item.expanded_content_id)"
      >
        <X :size="14" aria-hidden="true" />
      </button>
    </div>

    <button
      type="button"
      data-test="add-timeline-item"
      class="flex w-fit items-center gap-1.5 rounded-md border border-dashed border-border px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-text"
      @click="emit('add')"
    >
      <Plus :size="14" aria-hidden="true" />
      {{ t('videoTimelineEditor.addPopup') }}
    </button>
  </div>
</template>
