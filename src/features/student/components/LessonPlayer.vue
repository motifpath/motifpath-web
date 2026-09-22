<script setup lang="ts">
/**
 * The lesson video player: one control surface for a self-hosted video and an
 * embedded YouTube video alike. The library ships as web components, so this
 * is the only file that knows about it.
 *
 * Three things here are deliberate and easy to break:
 * - The provider is left exactly as the library styles it. For an embedded
 *   video the library crops the host's own title bar and controls out of view
 *   by enlarging and clipping the frame; restyling the provider undoes that.
 * - A tap-to-toggle overlay sits over the video. Without it a tap lands on the
 *   embedded host's own interface instead of the player's.
 * - The `aside` slot renders inside `<media-player>`, not beside it, so its
 *   content is still there when the player goes fullscreen — the browser's
 *   Fullscreen API only shows an element's own descendants. The player itself
 *   is forced to a 16:9 box by the library's own styles; that forced ratio is
 *   undone here and reapplied to just the video's own wrapper, so an aside
 *   panel doesn't squash the video's proportions.
 * - `resetToken` is keyed only on `<media-provider>`, not on the whole
 *   player. A stuck video engine needs a genuinely new provider element to
 *   recover — the same swap Vidstack itself does when `src` changes providers
 *   — but keying the whole player would tear down and rebuild the aside slot
 *   too, and that's exactly the element an aria-live announcement needs to
 *   stay mounted.
 * - The aside's width is student-controlled (drag or arrow keys on the
 *   handle) and remembered per browser, only while in landscape — in
 *   portrait the aside stacks full-width below the video, where a pixel
 *   width would fight the layout.
 */
import 'vidstack/player'
import 'vidstack/player/ui'
import 'vidstack/player/styles/base.css'

import { computed, onMounted, ref } from 'vue'

import Icon from '@/shared/components/Icon.vue'
import { useMediaQuery } from '@/shared/composables/useMediaQuery'
import { useTypedT } from '@/shared/composables/useTypedT'

defineProps<{
  src: string
  /** Changing this value throws away and reconnects the video provider. */
  resetToken?: number | string
}>()

const emit = defineEmits<{
  /** The playback position, in seconds, as it advances. */
  time: [seconds: number]
  ended: []
  /** The video could not be loaded or played. */
  error: []
}>()

const { t } = useTypedT()

function onTimeUpdate(event: CustomEvent<{ currentTime: number }>): void {
  emit('time', event.detail.currentTime)
}

const controlClass =
  'group flex shrink-0 items-center justify-center rounded-sm p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus'

const { matches: canResizeAside } = useMediaQuery(
  '(orientation: landscape) and (min-width: 1024px)',
)

const ASIDE_MIN_PX = 240
const ASIDE_MAX_PX = 640
const ASIDE_STEP_PX = 16
const ASIDE_WIDTH_STORAGE_KEY = 'motifpath:lesson-aside-width'

function clamp(value: number): number {
  return Math.min(ASIDE_MAX_PX, Math.max(ASIDE_MIN_PX, value))
}

// null means "use the default responsive width" (the landscape:w-80
// classes below) — set once the student has ever dragged or keyed a size,
// here or in an earlier lesson.
const asideWidthPx = ref<number | null>(null)
const asideEl = ref<HTMLElement | null>(null)
const asideStyle = computed(() =>
  asideWidthPx.value === null ? undefined : { width: `${asideWidthPx.value}px` },
)

onMounted(() => {
  try {
    const stored = localStorage.getItem(ASIDE_WIDTH_STORAGE_KEY)
    const parsed = stored === null ? NaN : Number(stored)
    if (Number.isFinite(parsed)) asideWidthPx.value = clamp(parsed)
  } catch {
    // Storage unavailable (private browsing, etc.) — the default width
    // still works fine for this viewing, just isn't remembered.
  }
})

function persistAsideWidth(width: number): void {
  try {
    localStorage.setItem(ASIDE_WIDTH_STORAGE_KEY, String(width))
  } catch {
    // Resizing still works for this viewing; it just won't be remembered.
  }
}

function resetAsideWidth(): void {
  asideWidthPx.value = null
  try {
    localStorage.removeItem(ASIDE_WIDTH_STORAGE_KEY)
  } catch {
    // Nothing to clean up if storage was never available.
  }
}

function beginAsideDrag(event: PointerEvent): void {
  const startX = event.clientX
  const startWidth = asideWidthPx.value ?? asideEl.value?.getBoundingClientRect().width ?? 0

  function onMove(moveEvent: PointerEvent): void {
    // The aside sits to the right of the video, so dragging the handle left
    // (toward the video) widens it — moving right narrows it back.
    asideWidthPx.value = clamp(startWidth + (startX - moveEvent.clientX))
  }
  function onUp(): void {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    if (asideWidthPx.value !== null) persistAsideWidth(asideWidthPx.value)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

function onAsideHandleKeydown(event: KeyboardEvent): void {
  const current = asideWidthPx.value ?? asideEl.value?.getBoundingClientRect().width ?? 0
  if (event.key === 'ArrowLeft') asideWidthPx.value = clamp(current + ASIDE_STEP_PX)
  else if (event.key === 'ArrowRight') asideWidthPx.value = clamp(current - ASIDE_STEP_PX)
  else if (event.key === 'Home') asideWidthPx.value = ASIDE_MIN_PX
  else if (event.key === 'End') asideWidthPx.value = ASIDE_MAX_PX
  else return

  event.preventDefault()
  persistAsideWidth(asideWidthPx.value)
}
</script>

<template>
  <media-player
    :src="src"
    playsinline
    data-test="lesson-player"
    class="flex aspect-auto flex-col overflow-hidden rounded-lg bg-brand-ground landscape:flex-row"
    @time-update="onTimeUpdate"
    @ended="emit('ended')"
    @error="emit('error')"
  >
    <div class="relative aspect-video w-full min-w-80 flex-1">
      <media-provider :key="resetToken" />

      <media-gesture
        event="pointerup"
        action="toggle:paused"
        data-test="tap-to-toggle"
        class="absolute inset-0 bottom-12 z-10 block"
      />

      <div
        class="absolute inset-x-0 bottom-0 z-20 flex items-center gap-3 bg-surface/90 px-3 py-2 text-ink"
      >
        <media-play-button :aria-label="t('lessonPlayer.play')" :class="controlClass">
          <Icon name="play" :size="20" class="hidden group-data-[paused]:block" />
          <Icon name="pause" :size="20" class="group-data-[paused]:hidden" />
        </media-play-button>

        <media-time type="current" class="text-sm tabular-nums" />

        <media-time-slider
          :aria-label="t('lessonPlayer.seek')"
          class="group relative flex h-6 min-w-0 flex-1 items-center"
        >
          <div class="relative h-1 w-full rounded-full bg-surface-sunken">
            <div class="absolute inset-y-0 left-0 w-[var(--slider-fill)] rounded-full bg-accent" />
          </div>
          <div
            class="absolute left-[var(--slider-fill)] top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
          />
        </media-time-slider>

        <media-time type="duration" class="text-sm tabular-nums" />

        <media-mute-button :aria-label="t('lessonPlayer.mute')" :class="controlClass">
          <Icon name="volume" :size="20" class="group-data-[muted]:hidden" />
          <Icon name="volume-off" :size="20" class="hidden group-data-[muted]:block" />
        </media-mute-button>

        <media-fullscreen-button :aria-label="t('lessonPlayer.fullscreen')" :class="controlClass">
          <Icon name="fullscreen" :size="20" />
        </media-fullscreen-button>
      </div>
    </div>

    <div
      v-if="$slots.aside && canResizeAside"
      data-test="aside-resize-handle"
      role="separator"
      aria-orientation="vertical"
      tabindex="0"
      :aria-label="t('lessonPlayer.resizeAside')"
      :aria-valuenow="asideWidthPx ?? undefined"
      :aria-valuemin="ASIDE_MIN_PX"
      :aria-valuemax="ASIDE_MAX_PX"
      class="w-1 shrink-0 self-stretch cursor-col-resize rounded-full bg-border hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
      @pointerdown="beginAsideDrag"
      @keydown="onAsideHandleKeydown"
      @dblclick="resetAsideWidth"
    />

    <div
      v-if="$slots.aside"
      ref="asideEl"
      data-test="player-aside"
      :style="asideStyle"
      class="w-full shrink-0 overflow-y-auto p-3 landscape:w-80 landscape:xl:w-96"
    >
      <slot name="aside" />
    </div>
  </media-player>
</template>
