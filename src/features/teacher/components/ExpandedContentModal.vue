<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import PromptEditor from '@/features/teacher/components/PromptEditor.vue'
import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { isHttpUrl } from '@/shared/utils/httpUrl'
import type { components } from '@/api/generated/core-domain'

type ExpandedContent = components['schemas']['ExpandedContent']
type CreateExpandedContentRequest = components['schemas']['CreateExpandedContentRequest']
type PromptDocument = components['schemas']['PromptDocument']
type ContentKind = CreateExpandedContentRequest['content_type']

const EMPTY_BODY: PromptDocument = { type: 'doc', content: [] }
const CONTENT_KINDS: ContentKind[] = ['image', 'gif', 'rich_text']

const props = defineProps<{
  open: boolean
  /** Video nodes time a pop-up in seconds, article nodes by paragraph and duration. */
  timing: 'seconds' | 'paragraph'
  /** The pop-up being edited, or null when adding a new one. */
  item: ExpandedContent | null
  saving: boolean
}>()
const emit = defineEmits<{
  save: [CreateExpandedContentRequest]
  close: []
}>()

const { t } = useTypedT()

const kind = ref<ContentKind>('image')
const triggerSeconds = ref<string | number>('')
const hideSeconds = ref<string | number>('')
const paragraph = ref<string | number>('')
const durationMs = ref<string | number>('')
const mediaUrl = ref('')
const caption = ref('')
const richContent = ref<PromptDocument>(EMPTY_BODY)

// Every open starts from the pop-up being edited (or a blank one), so edits
// closed without saving never leak into the next open.
watch(
  () => props.open,
  (open) => {
    if (!open) return
    const item = props.item
    kind.value = item?.content_type ?? 'image'
    triggerSeconds.value = item?.trigger_at_seconds?.toString() ?? ''
    hideSeconds.value = item?.hide_at_seconds?.toString() ?? ''
    paragraph.value = item?.trigger_at_paragraph?.toString() ?? ''
    durationMs.value = item?.duration_ms?.toString() ?? ''
    mediaUrl.value = item?.media_url ?? ''
    caption.value = item?.caption ?? ''
    richContent.value = item?.rich_content ?? EMPTY_BODY
  },
  { immediate: true },
)

const isRichText = computed(() => kind.value === 'rich_text')

// A number input's v-model yields a number once it has a value and '' when empty.
function wholeNumber(raw: string | number, min: number): number | null {
  if (String(raw).trim() === '') return null
  const value = Number(raw)
  return Number.isInteger(value) && value >= min ? value : null
}

const timingFilledIn = computed(() =>
  props.timing === 'seconds'
    ? wholeNumber(triggerSeconds.value, 0) !== null && wholeNumber(hideSeconds.value, 0) !== null
    : wholeNumber(paragraph.value, 1) !== null && wholeNumber(durationMs.value, 1) !== null,
)

// Hiding must come strictly after showing, otherwise the pop-up never displays.
const hideNotAfterTrigger = computed(() => {
  const trigger = wholeNumber(triggerSeconds.value, 0)
  const hide = wholeNumber(hideSeconds.value, 0)
  return props.timing === 'seconds' && trigger !== null && hide !== null && hide <= trigger
})

// An empty field is just "not filled in yet"; only a typed-but-unusable value
// (decimal, negative, zero paragraph) is an error worth explaining.
const timingInvalid = computed(() => {
  const fields: [string | number, number][] =
    props.timing === 'seconds'
      ? [
          [triggerSeconds.value, 0],
          [hideSeconds.value, 0],
        ]
      : [
          [paragraph.value, 1],
          [durationMs.value, 1],
        ]
  return fields.some(([raw, min]) => String(raw).trim() !== '' && wholeNumber(raw, min) === null)
})

const mediaUrlInvalid = computed(
  () => !isRichText.value && mediaUrl.value.trim() !== '' && !isHttpUrl(mediaUrl.value.trim()),
)

const hasBody = computed(() =>
  isRichText.value ? richContent.value.content.length > 0 : isHttpUrl(mediaUrl.value.trim()),
)

const canSave = computed(() => !props.saving && timingFilledIn.value && !hideNotAfterTrigger.value && hasBody.value)

function save() {
  if (!canSave.value) return

  const timingFields =
    props.timing === 'seconds'
      ? {
          trigger_at_seconds: Number(triggerSeconds.value),
          hide_at_seconds: Number(hideSeconds.value),
        }
      : {
          trigger_at_paragraph: Number(paragraph.value),
          duration_ms: Number(durationMs.value),
        }

  const captionField = caption.value.trim() ? { caption: caption.value.trim() } : {}

  if (isRichText.value) {
    emit('save', { content_type: 'rich_text', rich_content: richContent.value, ...timingFields, ...captionField })
    return
  }
  emit('save', { content_type: kind.value, media_url: mediaUrl.value.trim(), ...timingFields, ...captionField })
}

const inputClass = 'w-full rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm'
</script>

<template>
  <ModalOverlay
    :open="open"
    panel-class="flex max-h-[90vh] w-[640px] max-w-[92vw] flex-col gap-4 overflow-y-auto rounded-xl bg-surface-raised p-5 shadow-level2"
    @close="emit('close')"
  >
    <div data-test="popup-modal" class="contents">
      <div class="flex items-center justify-between">
        <span class="text-base font-bold">
          {{ item ? t('expandedContentModal.editTitle') : t('expandedContentModal.addTitle') }}
        </span>
        <ModalCloseButton @close="emit('close')" />
      </div>

      <div class="flex flex-col gap-1">
        <label for="popup-kind" class="text-xs text-ink-subtle">{{ t('expandedContentModal.kindLabel') }}</label>
        <select id="popup-kind" v-model="kind" data-test="popup-kind" :class="inputClass">
          <option v-for="option in CONTENT_KINDS" :key="option" :value="option">
            {{ t(`expandedContentModal.kinds.${option}`) }}
          </option>
        </select>
      </div>

      <div v-if="timing === 'seconds'" class="flex flex-wrap gap-3">
        <div class="flex flex-col gap-1">
          <label for="popup-trigger-seconds" class="text-xs text-ink-subtle">
            {{ t('expandedContentModal.triggerSecondsLabel') }}
          </label>
          <input
            id="popup-trigger-seconds"
            v-model="triggerSeconds"
            data-test="popup-trigger-seconds"
            type="number"
            min="0"
            class="w-28 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="popup-hide-seconds" class="text-xs text-ink-subtle">
            {{ t('expandedContentModal.hideSecondsLabel') }}
          </label>
          <input
            id="popup-hide-seconds"
            v-model="hideSeconds"
            data-test="popup-hide-seconds"
            type="number"
            min="0"
            class="w-28 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <div v-else class="flex flex-wrap gap-3">
        <div class="flex flex-col gap-1">
          <label for="popup-paragraph" class="text-xs text-ink-subtle">
            {{ t('expandedContentModal.paragraphLabel') }}
          </label>
          <input
            id="popup-paragraph"
            v-model="paragraph"
            data-test="popup-paragraph"
            type="number"
            min="1"
            class="w-28 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="popup-duration-ms" class="text-xs text-ink-subtle">
            {{ t('expandedContentModal.durationMsLabel') }}
          </label>
          <input
            id="popup-duration-ms"
            v-model="durationMs"
            data-test="popup-duration-ms"
            type="number"
            min="1"
            class="w-28 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <p v-if="timingInvalid" data-test="popup-timing-invalid" class="text-sm text-danger">
        {{ timing === 'seconds' ? t('expandedContentModal.timingInvalidSeconds') : t('expandedContentModal.timingInvalidParagraph') }}
      </p>
      <p v-if="hideNotAfterTrigger" data-test="popup-timing-error" class="text-sm text-danger">
        {{ t('expandedContentModal.hideNotAfterTrigger') }}
      </p>

      <div v-if="isRichText" class="flex flex-col gap-1">
        <span class="text-xs text-ink-subtle">{{ t('expandedContentModal.richContentLabel') }}</span>
        <PromptEditor v-model="richContent" />
      </div>
      <template v-else>
        <div class="flex flex-col gap-1">
          <label for="popup-media-url" class="text-xs text-ink-subtle">
            {{ t('expandedContentModal.mediaUrlLabel') }}
          </label>
          <input
            id="popup-media-url"
            v-model="mediaUrl"
            data-test="popup-media-url"
            type="text"
            :aria-invalid="mediaUrlInvalid"
            :class="[inputClass, mediaUrlInvalid ? 'border-danger' : '']"
          />
          <span v-if="mediaUrlInvalid" data-test="popup-media-url-error" class="text-sm text-danger">
            {{ t('expandedContentModal.mediaUrlInvalid') }}
          </span>
        </div>
      </template>

      <div class="flex flex-col gap-1">
        <label for="popup-caption" class="text-xs text-ink-subtle">{{ t('expandedContentModal.captionLabel') }}</label>
        <input id="popup-caption" v-model="caption" data-test="popup-caption" type="text" :class="inputClass" />
      </div>

      <div class="flex justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          data-test="popup-cancel"
          class="rounded-md border border-border bg-surface-raised px-3.5 py-2 text-[0.8125rem] font-semibold"
          @click="emit('close')"
        >
          {{ t('expandedContentModal.cancel') }}
        </button>
        <button
          type="button"
          data-test="popup-save"
          :disabled="!canSave"
          class="rounded-md bg-accent px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-fg disabled:cursor-not-allowed disabled:opacity-60"
          @click="save"
        >
          {{ t('expandedContentModal.save') }}
        </button>
      </div>
    </div>
  </ModalOverlay>
</template>
