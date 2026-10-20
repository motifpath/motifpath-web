<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'

import ExerciseView from '@/shared/components/ExerciseView.vue'
import AppButton from '@/shared/components/AppButton.vue'
import PreviewLayer from '@/shared/components/PreviewLayer.vue'
import { hasMultipleCorrectOptions } from '@/shared/utils/exerciseOptions'
import type { components } from '@/api/generated/core-domain'

type ExerciseType = components['schemas']['Exercise']['exercise_type']
type Option = components['schemas']['Option']
type PromptDocument = components['schemas']['PromptDocument']
type DiagramRef = components['schemas']['DiagramRef']

const props = defineProps<{
  open: boolean
  prompt: PromptDocument
  exerciseType: ExerciseType
  options: Option[]
  imageUrl?: string
  /** A prebuilt diagram as the image_recognition stimulus, in place of imageUrl. */
  diagramRef?: DiagramRef
  audioUrl?: string
}>()
const emit = defineEmits<{ close: [] }>()

const orientation = ref<'portrait' | 'landscape'>('portrait')
const direction = computed(() => (orientation.value === 'landscape' ? 'row' : 'column'))
const allowMultiple = computed(() => hasMultipleCorrectOptions(props.options))

const { t } = useTypedT()

// Graded the way a student's answer would be, by the caller, so the view itself never learns
// which option is right. A fresh attempt remounts the view, dropping the previous picks.
const reveal = ref<{ correctOptionIds: string[] } | undefined>(undefined)
const attempt = ref(0)

function check() {
  reveal.value = { correctOptionIds: props.options.filter((option) => option.is_correct).map((option) => option.option_id) }
}

function tryAgain() {
  reveal.value = undefined
  attempt.value += 1
}
</script>

<template>
  <PreviewLayer :open="open" :title="t('previewLayer.asStudent')" @close="emit('close')">
    <div class="flex flex-col items-center gap-3">
      <div class="flex w-full flex-wrap items-center justify-between gap-2">
        <span class="text-xs text-ink-muted">{{ t('exercisePreviewModal.description') }}</span>
        <div class="flex gap-1 rounded-md bg-surface-sunken p-[3px]">
          <button
            type="button"
            data-test="preview-portrait"
            class="rounded-sm px-[9px] py-1 text-[11px] font-semibold"
            :class="orientation === 'portrait' ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
            @click="orientation = 'portrait'"
          >
            {{ t('exercisePreviewModal.portrait') }}
          </button>
          <button
            type="button"
            data-test="preview-landscape"
            class="rounded-sm px-[9px] py-1 text-[11px] font-semibold"
            :class="orientation === 'landscape' ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
            @click="orientation = 'landscape'"
          >
            {{ t('exercisePreviewModal.landscape') }}
          </button>
        </div>
      </div>
      <div
        data-test="preview-frame"
        class="max-w-full overflow-y-auto rounded-xl border border-border bg-surface-raised p-[18px]"
        :class="orientation === 'landscape' ? 'h-[375px] w-[667px]' : 'h-[667px] w-[375px]'"
      >
        <ExerciseView
          :key="attempt"
          :prompt="prompt"
          :exercise-type="exerciseType"
          :options="options"
          :image-url="imageUrl"
          :diagram-ref="diagramRef"
          :audio-url="audioUrl"
          :allow-multiple="allowMultiple"
          :direction="direction"
          :reveal="reveal"
        />
      </div>
      <AppButton v-if="!reveal" data-test="preview-check" @click="check">{{ t('exercisePreviewModal.check') }}</AppButton>
      <AppButton v-else data-test="preview-try-again" variant="secondary" @click="tryAgain">
        {{ t('exercisePreviewModal.tryAgain') }}
      </AppButton>
    </div>
  </PreviewLayer>
</template>
