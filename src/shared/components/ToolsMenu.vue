<script setup lang="ts">
/**
 * The Practice Shell's tools, behind a wrench in the header's options slot: a sheet on a phone,
 * a menu beside the wrench on anything wider, as the account menu is. One row per tool that
 * exists; choosing one closes the list and says which to open.
 */
import { Metronome, Wrench } from 'lucide-vue-next'
import { nextTick, ref, useId } from 'vue'

import MenuRow from '@/shared/components/MenuRow.vue'
import OverlayLayer from '@/shared/components/OverlayLayer.vue'
import SheetHeader from '@/shared/components/SheetHeader.vue'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'
import { anchoredPosition, type AnchoredPosition } from '@/shared/utils/anchoredPosition'

export type PracticeTool = 'metronome'

const emit = defineEmits<{ open: [tool: PracticeTool] }>()

const { t } = useTypedT()
const { isCompact } = useSizeClass()

const open = ref(false)
const trigger = ref<HTMLElement | null>(null)
const position = ref<AnchoredPosition>({})
const titleId = useId()

function show() {
  const rect = trigger.value?.getBoundingClientRect()
  if (rect) position.value = anchoredPosition(rect, { width: window.innerWidth, height: window.innerHeight })
  open.value = true
}

async function choose(tool: PracticeTool) {
  open.value = false
  // Once the list has let go of its history entry, so the tool takes that entry over instead of
  // stacking another one that Back would have to step through.
  await nextTick()
  emit('open', tool)
}
</script>

<template>
  <button
    ref="trigger"
    type="button"
    data-test="tools"
    class="flex h-12 w-12 items-center justify-center rounded-full text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    :aria-label="t('tools.label')"
    :title="t('tools.label')"
    aria-haspopup="dialog"
    :aria-expanded="open ? 'true' : 'false'"
    @click="show"
  >
    <Wrench :size="24" aria-hidden="true" />
  </button>

  <OverlayLayer :open="open" :placement="isCompact ? 'bottom' : 'none'" :scrim="isCompact ? 'dim' : 'clear'" @close="open = false">
    <div
      data-test="tools-menu"
      :data-presentation="isCompact ? 'sheet' : 'menu'"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      class="flex flex-col bg-surface-raised"
      :class="
        isCompact
          ? 'max-h-[90vh] w-full overflow-y-auto rounded-t-xl pb-safe shadow-level3'
          : 'fixed w-[18rem] rounded-lg border border-border py-1 shadow-level2'
      "
      :style="isCompact ? undefined : position"
    >
      <SheetHeader v-if="isCompact" kind="sheet" :title="t('tools.label')" :title-id="titleId" @close="open = false" />
      <h2 v-else :id="titleId" class="sr-only">{{ t('tools.label') }}</h2>
      <MenuRow data-test="tool-metronome" :icon="Metronome" :label="t('tools.metronome')" chevron @click="choose('metronome')" />
    </div>
  </OverlayLayer>
</template>
