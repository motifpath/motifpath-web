<script setup lang="ts">
import { ref, useId } from 'vue'

import WhatsAppIcon from '@/features/student/components/WhatsAppIcon.vue'
import { useSendToTeacherHref } from '@/features/student/composables/useSendToTeacherHref'
import { useDraggableFloat } from '@/shared/composables/useDraggableFloat'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{
  /** The typed short reference to what the student is looking at (see conciergeLink). */
  reference: string
  pathTitle?: string | null
  lessonTitle?: string | null
  /** Floats higher, clear of a bar fixed to the bottom of the screen. */
  raised?: boolean
}>()

const { t } = useTypedT()
const tooltipId = useId()

// No link at all — so no button — when no concierge number is configured.
const href = useSendToTeacherHref(props)

// The tooltip is for a mouse hover or keyboard focus only. A touch has no
// hover to preview with — the tap opens WhatsApp straight away — and the focus
// a tap or click leaves behind must not pop the tooltip up afterwards.
const hovered = ref(false)
const keyboardFocused = ref(false)
let pointerPressed = false

function onPointerEnter(event: PointerEvent): void {
  if (event.pointerType === 'mouse') hovered.value = true
}

// The student can drag the button off whatever it covers. Its geometry
// matches the classes below: a 3rem (48px) button, 1rem (16px) from the edges,
// kept below the 4rem app bar plus that same gap, and above a bottom bar
// (5rem) when raised.
const float = useDraggableFloat({
  storageKey: 'motifpath:send-to-teacher-position',
  size: 48,
  edge: 16,
  topReserve: 80,
  minBottom: () => (props.raised ? 80 : 16),
})

function onPointerDown(event: PointerEvent): void {
  pointerPressed = true
  float.handlers.pointerdown(event)
}

function onFocus(): void {
  keyboardFocused.value = !pointerPressed
}

function onBlur(): void {
  keyboardFocused.value = false
  pointerPressed = false
}
</script>

<template>
  <div
    v-if="href"
    data-test="send-to-teacher-float"
    class="fixed z-10"
    :class="float.side.value === 'left' ? 'left-4' : 'right-4'"
    :style="float.style.value"
  >
    <div
      v-show="(hovered || keyboardFocused) && !float.dragging.value"
      :id="tooltipId"
      role="tooltip"
      class="absolute bottom-full mb-2 w-60 rounded bg-surface-raised px-3 py-2 text-left shadow-level1"
      :class="float.side.value === 'left' ? 'left-0' : 'right-0'"
    >
      <p class="text-sm font-medium text-ink">{{ t('sendToTeacher.button') }}</p>
      <p class="text-xs text-ink-muted">{{ t('sendToTeacher.hint') }}</p>
    </div>

    <a
      data-test="send-to-teacher"
      :href="href"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="t('sendToTeacher.button')"
      :aria-describedby="tooltipId"
      draggable="false"
      class="flex h-7 w-7 touch-none select-none items-center justify-center rounded-full bg-whatsapp text-white shadow-level1"
      @pointerenter="onPointerEnter"
      @pointerleave="hovered = false"
      @pointerdown="onPointerDown"
      @pointermove="float.handlers.pointermove"
      @pointerup="float.handlers.pointerup"
      @pointercancel="float.handlers.pointercancel"
      @click="float.handlers.click"
      @focus="onFocus"
      @blur="onBlur"
    >
      <WhatsAppIcon class="h-5 w-5" />
    </a>
  </div>
</template>
