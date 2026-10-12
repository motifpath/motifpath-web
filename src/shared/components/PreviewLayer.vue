<script setup lang="ts">
import { Eye, X } from 'lucide-vue-next'
import { useId } from 'vue'

import OverlayLayer from '@/shared/components/OverlayLayer.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

/**
 * The real learner screen, full screen, under an accent Preview bar. What it holds must record
 * nothing and start nothing for real; × returns to the editor as it was.
 */
defineProps<{ open: boolean; title: string }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useTypedT()
const titleId = useId()
</script>

<template>
  <OverlayLayer :open="open" placement="none" @close="emit('close')">
    <div
      data-test="preview-layer"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      class="fixed inset-0 flex flex-col bg-surface"
    >
      <div data-test="preview-bar" class="flex h-14 shrink-0 items-center gap-2 bg-accent px-4 text-accent-fg">
        <Eye :size="20" aria-hidden="true" />
        <h2 :id="titleId" class="flex-1 truncate text-sm font-semibold">{{ title }}</h2>
        <button
          type="button"
          data-test="preview-close"
          :aria-label="t('previewLayer.close')"
          class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent-fg/10"
          @click="emit('close')"
        >
          <X :size="20" aria-hidden="true" />
        </button>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto">
        <div class="mx-auto w-full max-w-[1000px] px-4 py-6 lg:px-10">
          <slot />
        </div>
      </div>
    </div>
  </OverlayLayer>
</template>
