<script setup lang="ts">
import { Minus, Plus, X } from 'lucide-vue-next'
import { ref } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'

import type { components } from '@/api/generated/core-domain'

type ExpandedContent = components['schemas']['ExpandedContent']

defineProps<{ items: ExpandedContent[] }>()
const emit = defineEmits<{
  adjustParagraph: [id: string, delta: number]
  remove: [id: string]
  add: [
    {
      content_type: 'image' | 'gif'
      media_url: string
      trigger_at_paragraph: number
      duration_ms: number
      caption?: string
    },
  ]
}>()

const { t } = useTypedT()

const newParagraph = ref('')
const newDurationMs = ref('')
const newMediaUrl = ref('')
const newCaption = ref('')

function submitAdd() {
  const paragraph = Number(newParagraph.value)
  const duration = Number(newDurationMs.value)
  if (!newParagraph.value || !newDurationMs.value || !newMediaUrl.value) return

  emit('add', {
    content_type: 'image',
    media_url: newMediaUrl.value,
    trigger_at_paragraph: paragraph,
    duration_ms: duration,
    ...(newCaption.value ? { caption: newCaption.value } : {}),
  })
  newParagraph.value = ''
  newDurationMs.value = ''
  newMediaUrl.value = ''
  newCaption.value = ''
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <p v-if="items.length === 0" class="text-sm text-ink-subtle">{{ t('articlePopupListEditor.emptyMessage') }}</p>

    <div
      v-for="item in items"
      :key="item.expanded_content_id"
      data-test="popup-item"
      class="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface-sunken px-3 py-2.5"
    >
      <div class="flex items-center gap-1.5 text-sm">
        <span class="text-ink-subtle">{{ t('articlePopupListEditor.afterParagraph') }}</span>
        <button
          type="button"
          data-test="paragraph-decrement"
          class="flex h-6 w-6 items-center justify-center rounded-full border border-border"
          @click="emit('adjustParagraph', item.expanded_content_id, -1)"
        >
          <Minus :size="12" aria-hidden="true" />
        </button>
        <span class="w-6 text-center font-semibold">{{ item.trigger_at_paragraph }}</span>
        <button
          type="button"
          data-test="paragraph-increment"
          class="flex h-6 w-6 items-center justify-center rounded-full border border-border"
          @click="emit('adjustParagraph', item.expanded_content_id, 1)"
        >
          <Plus :size="12" aria-hidden="true" />
        </button>
      </div>

      <span class="text-sm text-ink-subtle">{{ t('articlePopupListEditor.forDuration', { ms: item.duration_ms }) }}</span>
      <span v-if="item.caption" class="flex-1 text-sm text-ink-subtle">{{ item.caption }}</span>

      <button
        type="button"
        data-test="popup-item-remove"
        :aria-label="t('articlePopupListEditor.removeAriaLabel')"
        class="ml-auto text-ink-subtle"
        @click="emit('remove', item.expanded_content_id)"
      >
        <X :size="14" aria-hidden="true" />
      </button>
    </div>

    <div class="flex flex-wrap items-end gap-2 border-t border-border pt-3">
      <div class="flex flex-col gap-1">
        <label class="text-xs text-ink-subtle">{{ t('articlePopupListEditor.paragraphNumberLabel') }}</label>
        <input
          v-model="newParagraph"
          data-test="new-paragraph"
          type="number"
          min="1"
          class="w-24 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-ink-subtle">{{ t('articlePopupListEditor.durationMsLabel') }}</label>
        <input
          v-model="newDurationMs"
          data-test="new-duration-ms"
          type="number"
          min="0"
          class="w-28 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm"
        />
      </div>
      <div class="flex flex-1 flex-col gap-1">
        <label class="text-xs text-ink-subtle">{{ t('articlePopupListEditor.mediaUrlLabel') }}</label>
        <input
          v-model="newMediaUrl"
          data-test="new-media-url"
          type="text"
          class="w-full min-w-[160px] rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm"
        />
      </div>
      <div class="flex flex-1 flex-col gap-1">
        <label class="text-xs text-ink-subtle">{{ t('articlePopupListEditor.captionLabel') }}</label>
        <input
          v-model="newCaption"
          data-test="new-caption"
          type="text"
          class="w-full min-w-[160px] rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="button"
        data-test="add-popup-item"
        class="rounded-md border border-dashed border-border px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-text"
        @click="submitAdd"
      >
        {{ t('articlePopupListEditor.addPopup') }}
      </button>
    </div>
  </div>
</template>
