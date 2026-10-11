<script setup lang="ts">
/**
 * A board drawn at a readable size in a window that may be narrower than it. A board that fits
 * shows as it is; one too wide scrolls sideways, its edges fading where more of it lies beyond, with
 * the overview strip under it to show where the window is and to scroll by. The parent can scroll
 * it too, as when following the sounding note.
 */
import { computed, ref } from 'vue'

import OverviewStrip from '@/shared/components/diagram/OverviewStrip.vue'

const props = defineProps<{
  /** The board's full width, in its own pixels. */
  contentWidth: number
  /** The width the window has. */
  viewWidth: number
  /** The diagram's name, for the strip's window. */
  label: string
}>()

const emit = defineEmits<{ scroll: [left: number] }>()

defineSlots<{
  default: () => unknown
  /** The board in miniature, for the overview strip. */
  overview?: () => unknown
}>()

const scroller = ref<HTMLElement | null>(null)
const scrollLeft = ref(0)

/** Under a pixel of overflow is rounding, not a board too wide. */
const overflows = computed(() => props.contentWidth - props.viewWidth >= 1)
const maxLeft = computed(() => Math.max(0, props.contentWidth - props.viewWidth))

const fade = computed(() => {
  if (!overflows.value) return undefined
  const before = scrollLeft.value > 0
  const after = scrollLeft.value < maxLeft.value - 1
  if (before && after) return 'both'
  if (before) return 'start'
  return after ? 'end' : undefined
})

function onScroll() {
  if (!scroller.value) return
  scrollLeft.value = scroller.value.scrollLeft
  emit('scroll', scrollLeft.value)
}

function scrollTo(left: number, behavior: ScrollBehavior = 'auto') {
  scroller.value?.scrollTo?.({ left, behavior })
  scrollLeft.value = left
}

defineExpose({ scrollTo })
</script>

<template>
  <div class="flex min-w-0 flex-col gap-2">
    <div
      ref="scroller"
      data-test="board-scroll"
      class="board-viewport overflow-x-auto overflow-y-hidden"
      :data-fade="fade"
      :tabindex="overflows ? 0 : undefined"
      :role="overflows ? 'region' : undefined"
      :aria-label="overflows ? label : undefined"
      @scroll="onScroll"
    >
      <slot />
    </div>
    <OverviewStrip
      v-if="overflows && $slots.overview"
      :content-width="contentWidth"
      :view-width="viewWidth"
      :scroll-left="scrollLeft"
      :label="label"
      @scroll-to="scrollTo"
    >
      <slot name="overview" />
    </OverviewStrip>
  </div>
</template>

<style scoped>
/* Tailwind has no mask utilities: the fade must show whatever is behind the board, so it masks
   the board itself instead of painting a gradient in some assumed background colour. */
.board-viewport[data-fade='start'] {
  mask-image: linear-gradient(to right, transparent, black 2rem);
}
.board-viewport[data-fade='end'] {
  mask-image: linear-gradient(to left, transparent, black 2rem);
}
.board-viewport[data-fade='both'] {
  mask-image: linear-gradient(to right, transparent, black 2rem, black calc(100% - 2rem), transparent);
}
</style>
