<script setup lang="ts">
/**
 * Confirms merging the overlaid diagrams into the one being authored, and asks
 * whether to add a highlighted region for each of them (pre-selected, so each
 * original shape stays recognisable once merged). Only asks; the caller merges.
 */
import { ref, useId, watch } from 'vue'

import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ confirm: [regionPerLayer: boolean]; cancel: [] }>()

const { t } = useTypedT()
const titleId = useId()

const regionPerLayer = ref(true)
watch(
  () => props.open,
  (open) => {
    if (open) regionPerLayer.value = true
  },
)
</script>

<template>
  <ModalOverlay
    :open="open"
    panel-class="flex w-[min(440px,calc(100vw-32px))] flex-col gap-4 rounded-xl bg-surface-raised p-5 shadow-level2"
    @close="emit('cancel')"
  >
    <div role="dialog" aria-modal="true" :aria-labelledby="titleId" class="flex flex-col gap-4">
      <h2 :id="titleId" class="text-base font-bold text-ink">{{ t('mergeLayersModal.title') }}</h2>
      <p class="text-sm text-ink-muted">{{ t('mergeLayersModal.message') }}</p>
      <label class="flex items-start gap-2.5 text-sm text-ink">
        <input
          v-model="regionPerLayer"
          type="checkbox"
          data-test="merge-region-per-layer"
          class="mt-0.5"
        />
        <span>{{ t('mergeLayersModal.regionPerLayer') }}</span>
      </label>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          data-test="merge-cancel"
          class="rounded-md border border-border bg-surface-raised px-3.5 py-2 text-[0.8125rem] font-semibold text-ink"
          @click="emit('cancel')"
        >
          {{ t('mergeLayersModal.cancel') }}
        </button>
        <button
          type="button"
          data-test="merge-confirm"
          class="rounded-md bg-accent px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-fg"
          @click="emit('confirm', regionPerLayer)"
        >
          {{ t('mergeLayersModal.confirm') }}
        </button>
      </div>
    </div>
  </ModalOverlay>
</template>
