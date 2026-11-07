<script setup lang="ts">
/**
 * One progression in Admin › Progressions: its name, one line on where it comes from and which
 * charts tag it, and whether it is in the drills. Only a chart-only progression has a ⋮ menu, since
 * a progression in the drills is never removed.
 */
import { EllipsisVertical, Trash2 } from 'lucide-vue-next'
import { ref, useId } from 'vue'

import MenuRow from '@/shared/components/MenuRow.vue'
import OverlayLayer from '@/shared/components/OverlayLayer.vue'
import SheetHeader from '@/shared/components/SheetHeader.vue'
import StatusChip from '@/shared/components/StatusChip.vue'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'

defineProps<{
  name: string
  meta: string
  inDrills: boolean
}>()
const emit = defineEmits<{ remove: [] }>()

const { t } = useTypedT()
const { isCompact } = useSizeClass()
const menuOpen = ref(false)
const menuTitleId = useId()

function chooseRemove() {
  menuOpen.value = false
  emit('remove')
}
</script>

<template>
  <div data-test="progression-row" class="flex min-h-20 items-center gap-3 rounded-2xl border border-border bg-surface-raised py-3 pl-4" :class="inDrills ? 'pr-4' : 'pr-2'">
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <span data-test="progression-row-name" class="break-words text-base font-semibold text-ink">{{ name }}</span>
      <span data-test="progression-row-meta" class="text-xs font-medium text-ink-muted">{{ meta }}</span>
    </div>
    <StatusChip
      data-test="progression-row-status"
      class="shrink-0"
      :label="inDrills ? t('progressionList.inDrills') : t('songChartEditor.chartOnly')"
      :tone="inDrills ? 'success' : 'neutral'"
    />
    <template v-if="!inDrills">
      <button
        type="button"
        data-test="progression-row-menu"
        :aria-label="t('orderedRow.more', { title: name })"
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        @click="menuOpen = true"
      >
        <EllipsisVertical :size="20" aria-hidden="true" />
      </button>
      <OverlayLayer :open="menuOpen" :placement="isCompact ? 'bottom' : 'center'" @close="menuOpen = false">
        <div
          role="dialog"
          aria-modal="true"
          :aria-labelledby="menuTitleId"
          class="flex flex-col bg-surface-raised pb-2 shadow-level3"
          :class="isCompact ? 'w-full rounded-t-xl pb-safe' : 'w-[min(22rem,calc(100vw-2rem))] rounded-xl'"
        >
          <SheetHeader :kind="isCompact ? 'sheet' : 'dialog'" :title="name" :title-id="menuTitleId" closable @close="menuOpen = false" />
          <MenuRow data-test="progression-row-remove" :icon="Trash2" :label="t('progressionList.remove.action')" danger @click="chooseRemove" />
        </div>
      </OverlayLayer>
    </template>
  </div>
</template>
