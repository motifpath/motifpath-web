<script setup lang="ts">
/**
 * What a Learning row holds besides continuing: its details, and leaving it. A sheet on a phone;
 * on wider screens a menu beside the ⋯ that opened it.
 */
import { Info, LogOut } from 'lucide-vue-next'
import { ref, watch } from 'vue'

import type { LearningItem } from '@/features/student/utils/learning'
import MenuRow from '@/shared/components/MenuRow.vue'
import OverlayLayer from '@/shared/components/OverlayLayer.vue'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'
import { anchoredPosition, type AnchoredPosition } from '@/shared/utils/anchoredPosition'

const props = defineProps<{ open: boolean; item: LearningItem | null; trigger: HTMLElement | null }>()
const emit = defineEmits<{ close: []; details: []; leave: [] }>()

const { t } = useTypedT()
const { isCompact } = useSizeClass()

const position = ref<AnchoredPosition>({})
watch(
  () => props.open,
  (open) => {
    const rect = open ? props.trigger?.getBoundingClientRect() : undefined
    if (rect) position.value = anchoredPosition(rect, { width: window.innerWidth, height: window.innerHeight })
  },
  { immediate: true },
)
</script>

<template>
  <OverlayLayer
    :open="open && !!item"
    :placement="isCompact ? 'bottom' : 'none'"
    :scrim="isCompact ? 'dim' : 'clear'"
    @close="emit('close')"
  >
    <div
      v-if="item"
      data-test="learning-menu"
      :data-presentation="isCompact ? 'sheet' : 'menu'"
      role="dialog"
      aria-modal="true"
      :aria-label="item.title"
      class="flex flex-col bg-surface-raised"
      :class="
        isCompact
          ? 'w-full rounded-t-xl pb-safe shadow-level3'
          : 'fixed w-[16rem] rounded-lg border border-border py-1 shadow-level2'
      "
      :style="isCompact ? undefined : position"
    >
      <template v-if="isCompact">
        <div class="mx-auto mt-2 h-1 w-9 rounded-full bg-border" aria-hidden="true" />
        <p class="truncate px-4 pb-1 pt-3 text-base font-semibold text-ink">{{ item.title }}</p>
      </template>
      <MenuRow
        data-test="learning-menu-details"
        :icon="Info"
        :label="item.kind === 'course' ? t('learningMenu.courseDetails') : t('learningMenu.pathDetails')"
        @click="emit('details')"
      />
      <MenuRow
        v-if="item.state !== 'left'"
        data-test="learning-menu-leave"
        :icon="LogOut"
        :label="item.kind === 'course' ? t('learningMenu.leaveCourse') : t('learningMenu.removePath')"
        @click="emit('leave')"
      />
    </div>
  </OverlayLayer>
</template>
