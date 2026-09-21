<script setup lang="ts">
import { Minus, Plus, X } from 'lucide-vue-next'
import { ref } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'

import type { components } from '@/api/generated/core-domain'

type ExpandedContent = components['schemas']['ExpandedContent']

defineProps<{ items: ExpandedContent[] }>()
const emit = defineEmits<{
  adjustTrigger: [id: string, deltaSeconds: number]
  adjustHide: [id: string, deltaSeconds: number]
  remove: [id: string]
  add: [
    {
      content_type: 'image' | 'gif'
      media_url: string
      trigger_at_seconds: number
      hide_at_seconds: number
      caption?: string
    },
  ]
}>()

const { t } = useTypedT()

const newTriggerSeconds = ref('')
const newHideSeconds = ref('')
const newMediaUrl = ref('')
const newCaption = ref('')

function submitAdd() {
  const trigger = Number(newTriggerSeconds.value)
  const hide = Number(newHideSeconds.value)
  if (!newTriggerSeconds.value || !newHideSeconds.value || !newMediaUrl.value) return

  emit('add', {
    content_type: 'image',
    media_url: newMediaUrl.value,
    trigger_at_seconds: trigger,
    hide_at_seconds: hide,
    ...(newCaption.value ? { caption: newCaption.value } : {}),
  })
  newTriggerSeconds.value = ''
  newHideSeconds.value = ''
  newMediaUrl.value = ''
  newCaption.value = ''
}
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

      <span v-if="item.caption" class="flex-1 text-sm text-ink-subtle">{{ item.caption }}</span>

      <button
        type="button"
        data-test="timeline-item-remove"
        :aria-label="t('videoTimelineEditor.removeAriaLabel')"
        class="ml-auto text-ink-subtle"
        @click="emit('remove', item.expanded_content_id)"
      >
        <X :size="14" aria-hidden="true" />
      </button>
    </div>

    <div class="flex flex-wrap items-end gap-2 border-t border-border pt-3">
      <div class="flex flex-col gap-1">
        <label class="text-xs text-ink-subtle">{{ t('videoTimelineEditor.triggerSecondsLabel') }}</label>
        <input
          v-model="newTriggerSeconds"
          data-test="new-trigger-seconds"
          type="number"
          min="0"
          class="w-24 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-ink-subtle">{{ t('videoTimelineEditor.hideSecondsLabel') }}</label>
        <input
          v-model="newHideSeconds"
          data-test="new-hide-seconds"
          type="number"
          min="0"
          class="w-24 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm"
        />
      </div>
      <div class="flex flex-1 flex-col gap-1">
        <label class="text-xs text-ink-subtle">{{ t('videoTimelineEditor.mediaUrlLabel') }}</label>
        <input
          v-model="newMediaUrl"
          data-test="new-media-url"
          type="text"
          class="w-full min-w-[160px] rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm"
        />
      </div>
      <div class="flex flex-1 flex-col gap-1">
        <label class="text-xs text-ink-subtle">{{ t('videoTimelineEditor.captionLabel') }}</label>
        <input
          v-model="newCaption"
          data-test="new-caption"
          type="text"
          class="w-full min-w-[160px] rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="button"
        data-test="add-timeline-item"
        class="rounded-md border border-dashed border-border px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-text"
        @click="submitAdd"
      >
        {{ t('videoTimelineEditor.addPopup') }}
      </button>
    </div>
  </div>
</template>
