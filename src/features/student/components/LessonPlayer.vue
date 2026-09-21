<script setup lang="ts">
/**
 * The lesson video player: one control surface for a self-hosted video and an
 * embedded YouTube video alike. The library ships as web components, so this
 * is the only file that knows about it.
 *
 * Two things here are deliberate and easy to break:
 * - The provider is left exactly as the library styles it. For an embedded
 *   video the library crops the host's own title bar and controls out of view
 *   by enlarging and clipping the frame; restyling the provider undoes that.
 * - A tap-to-toggle overlay sits over the video. Without it a tap lands on the
 *   embedded host's own interface instead of the player's.
 */
import 'vidstack/player'
import 'vidstack/player/ui'
import 'vidstack/player/styles/base.css'

import Icon from '@/shared/components/Icon.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

defineProps<{ src: string }>()

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
</script>

<template>
  <media-player
    :src="src"
    playsinline
    data-test="lesson-player"
    class="overflow-hidden rounded-lg bg-brand-ground"
    @time-update="onTimeUpdate"
    @ended="emit('ended')"
    @error="emit('error')"
  >
    <media-provider />

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
  </media-player>
</template>
