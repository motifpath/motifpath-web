<script setup lang="ts">
import { computed, ref, useId } from 'vue'

import { conciergeWhatsAppUrl } from '@/features/student/utils/conciergeLink'
import { useTypedT } from '@/shared/composables/useTypedT'
import { useCurrentUserStore } from '@/stores/currentUser'

const props = defineProps<{
  /** The typed short reference to what the student is looking at (see conciergeLink). */
  reference: string
  pathTitle?: string | null
  lessonTitle?: string | null
  /** Floats higher, clear of a bar fixed to the bottom of the screen. */
  raised?: boolean
}>()

const { t } = useTypedT()
const currentUser = useCurrentUserStore()
const tooltipId = useId()

// Read per render, not at module load, so the number is whatever this build
// was given — the feature is off when no number is configured.
const href = computed(() => {
  const name = currentUser.profile?.display_name?.trim()
  const lines = [
    name ? t('sendToTeacher.greetingNamed', { name }) : t('sendToTeacher.greeting'),
    props.pathTitle ? t('sendToTeacher.pathLine', { title: props.pathTitle }) : null,
    props.lessonTitle ? t('sendToTeacher.lessonLine', { title: props.lessonTitle }) : null,
    t('sendToTeacher.referenceLine', { reference: props.reference }),
    '',
    t('sendToTeacher.prompt'),
  ]
  const message = lines.filter((line): line is string => line !== null).join('\n')
  return conciergeWhatsAppUrl(import.meta.env.VITE_CONCIERGE_WHATSAPP_NUMBER, message)
})

// The tooltip is for a mouse hover or keyboard focus only. A touch has no
// hover to preview with — the tap opens WhatsApp straight away — and the focus
// a tap or click leaves behind must not pop the tooltip up afterwards.
const hovered = ref(false)
const keyboardFocused = ref(false)
let pointerPressed = false

function onPointerEnter(event: PointerEvent): void {
  if (event.pointerType === 'mouse') hovered.value = true
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
    class="fixed right-4 z-10"
    :class="raised ? 'bottom-20' : 'bottom-4'"
  >
    <div
      v-show="hovered || keyboardFocused"
      :id="tooltipId"
      role="tooltip"
      class="absolute bottom-full right-0 mb-2 w-60 rounded bg-surface-raised px-3 py-2 text-left shadow-level1"
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
      class="flex h-7 w-7 items-center justify-center rounded-full bg-whatsapp text-white shadow-level1"
      @pointerenter="onPointerEnter"
      @pointerleave="hovered = false"
      @pointerdown="pointerPressed = true"
      @focus="onFocus"
      @blur="onBlur"
    >
      <!-- The WhatsApp mark: a brand logo, so it is drawn here rather than
           taken from the app's icon set, which carries no brand marks. -->
      <svg data-test="whatsapp-icon" viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path
          d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"
        />
      </svg>
    </a>
  </div>
</template>
