<script setup lang="ts">
import { ArrowDown, ArrowUp, EllipsisVertical, GripVertical } from 'lucide-vue-next'
import { computed, inject, ref, useId, type Component } from 'vue'

import MenuRow from '@/shared/components/MenuRow.vue'
import OverlayLayer from '@/shared/components/OverlayLayer.vue'
import SheetHeader from '@/shared/components/SheetHeader.vue'
import { ORDERED_LIST } from '@/shared/components/orderedListContext'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'

export interface OrderedRowAction {
  id: string
  label: string
  icon: Component
  /** Removes something: reads in the danger colour. */
  danger?: boolean
}

/**
 * One row of an OrderedList: dragged by its handle on every size, and moved from its ⋮ menu — the
 * way to reorder on a phone, with a keyboard or with a screen reader. Rows in a fixed order (in
 * time order, say) set `draggable` false and keep only their own actions.
 */
const props = withDefaults(
  defineProps<{
    index: number
    count: number
    title: string
    /** One line under the title; `warning` when it says what blocks publishing. */
    meta?: string
    metaTone?: 'muted' | 'warning'
    actions?: OrderedRowAction[]
    draggable?: boolean
  }>(),
  { meta: undefined, metaTone: 'muted', actions: () => [], draggable: true },
)
const emit = defineEmits<{ action: [id: string] }>()

const { t } = useTypedT()
const { isCompact } = useSizeClass()
const list = inject(ORDERED_LIST, null)

// Reordering needs the list around the row: it owns the order.
const canReorder = computed(() => props.draggable && list !== null)
const isDragging = computed(() => list?.draggingIndex.value === props.index)
const isDropTarget = computed(
  () => list?.draggingIndex.value !== null && list?.overIndex.value === props.index && !isDragging.value,
)

const menuOpen = ref(false)
const menuTitleId = useId()

const moves = computed<OrderedRowAction[]>(() => {
  if (!canReorder.value) return []
  const items: OrderedRowAction[] = []
  if (props.index > 0) items.push({ id: 'move-up', label: t('orderedRow.moveUp'), icon: ArrowUp })
  if (props.index < props.count - 1) items.push({ id: 'move-down', label: t('orderedRow.moveDown'), icon: ArrowDown })
  return items
})

function choose(id: string) {
  menuOpen.value = false
  if (id === 'move-up') emitMove(props.index - 1)
  else if (id === 'move-down') emitMove(props.index + 1)
  else emit('action', id)
}

// Moves from the menu go through the list, like a drag, so its owner handles both the same way.
function emitMove(to: number) {
  list?.move(props.index, to)
}

function onHandleDown(event: PointerEvent) {
  list?.startDrag(props.index, event)
}
</script>

<template>
  <li
    data-test="ordered-row"
    :data-ordered-index="index"
    :data-dragging="isDragging ? 'true' : undefined"
    class="flex min-h-14 items-center gap-1 rounded-xl border bg-surface-raised py-2 pl-1 pr-1"
    :class="[
      isDragging ? 'border-accent shadow-level2' : isDropTarget ? 'border-accent' : 'border-border',
      canReorder ? '' : 'pl-4',
    ]"
  >
    <span
      v-if="canReorder"
      data-test="ordered-row-handle"
      class="flex h-10 w-8 shrink-0 cursor-grab touch-none items-center justify-center text-ink-subtle active:cursor-grabbing"
      aria-hidden="true"
      @pointerdown="onHandleDown"
    >
      <GripVertical :size="18" />
    </span>
    <div class="flex min-w-0 flex-1 flex-col">
      <span data-test="ordered-row-title" class="truncate text-sm font-medium text-ink">{{ title }}</span>
      <span
        v-if="meta"
        data-test="ordered-row-meta"
        class="truncate text-xs"
        :class="metaTone === 'warning' ? 'text-warning' : 'text-ink-muted'"
      >{{ meta }}</span>
    </div>
    <slot />
    <button
      v-if="moves.length || actions.length"
      type="button"
      data-test="ordered-row-menu"
      :aria-label="t('orderedRow.more', { title })"
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken"
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
        <SheetHeader :kind="isCompact ? 'sheet' : 'dialog'" :title="title" :title-id="menuTitleId" closable @close="menuOpen = false" />
        <MenuRow
          v-for="item in [...moves, ...actions]"
          :key="item.id"
          data-test="ordered-row-menu-item"
          :icon="item.icon"
          :label="item.label"
          :danger="item.danger"
          @click="choose(item.id)"
        />
      </div>
    </OverlayLayer>
  </li>
</template>
