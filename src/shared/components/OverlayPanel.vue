<script setup lang="ts">
import { useId } from 'vue'

import OverlayLayer from '@/shared/components/OverlayLayer.vue'
import SheetHeader from '@/shared/components/SheetHeader.vue'
import { useSizeClass } from '@/shared/composables/useSizeClass'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    /** A sub-step of the task: a back arrow replaces ×, and Back goes to the previous step. */
    back?: boolean
  }>(),
  { back: false },
)
const emit = defineEmits<{ close: []; back: [] }>()

const { isCompact } = useSizeClass()
const titleId = useId()
</script>

<template>
  <!-- One short task, two presentations: a bottom sheet on a phone, a centred dialog on
       anything wider. Same title, body and actions either way. -->
  <OverlayLayer :open="open" :placement="isCompact ? 'bottom' : 'center'" @close="emit('close')">
    <div
      v-if="isCompact"
      data-test="overlay-sheet"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      class="flex max-h-[90vh] w-full flex-col rounded-t-xl bg-surface-raised shadow-level3"
    >
      <SheetHeader kind="sheet" :title="title" :title-id="titleId" :back="back" @close="emit('close')" @back="emit('back')" />
      <div class="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-2">
        <slot />
      </div>
      <div v-if="$slots.actions" class="flex flex-col gap-2 px-5 pb-safe pt-2">
        <slot name="actions" />
      </div>
    </div>
    <div
      v-else
      data-test="overlay-dialog"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      class="flex max-h-[90vh] w-[min(30rem,calc(100vw-2rem))] flex-col rounded-xl bg-surface-raised shadow-level3"
    >
      <SheetHeader kind="dialog" :title="title" :title-id="titleId" :back="back" @close="emit('close')" @back="emit('back')" />
      <div class="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-2">
        <slot />
      </div>
      <div v-if="$slots.actions" class="flex justify-end gap-2 px-5 pb-5">
        <slot name="actions" />
      </div>
    </div>
  </OverlayLayer>
</template>
