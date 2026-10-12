<script setup lang="ts">
import { ChevronRight, CirclePlay, EllipsisVertical, Link, Play, RotateCcw, Trash2, TriangleAlert, Upload, X } from 'lucide-vue-next'
import { computed, ref, useId } from 'vue'

import type { VideoUploadState } from '@/features/teacher/composables/useVideoUpload'
import MenuRow from '@/shared/components/MenuRow.vue'
import OverlayLayer from '@/shared/components/OverlayLayer.vue'
import SheetHeader from '@/shared/components/SheetHeader.vue'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'

/**
 * Everything an upload can be in, plus `stored`: a video uploaded in an
 * earlier visit, of which only the URL is known.
 */
export type VideoSourceState = VideoUploadState | { status: 'stored' }

const props = defineProps<{ state: VideoSourceState }>()
const emit = defineEmits<{
  choose: [file: File]
  cancel: []
  retry: []
  play: []
  useLink: []
  remove: []
}>()

const { t } = useTypedT()
const { isCompact } = useSizeClass()
const menuTitleId = useId()
const menuOpen = ref(false)

const MB = 1024 * 1024
const GB = 1024 * MB

function formatSize(bytes: number): string {
  if (bytes >= GB) return t('videoSource.gigabytes', { value: (bytes / GB).toFixed(1) })
  return t('videoSource.megabytes', { value: Math.max(1, Math.round(bytes / MB)) })
}

const percent = computed(() => {
  const s = props.state
  if (s.status !== 'uploading' || s.total === 0) return 0
  return Math.round((s.loaded / s.total) * 100)
})

const title = computed(() => {
  const s = props.state
  switch (s.status) {
    case 'idle':
      return t('videoSource.upload')
    case 'stored':
      return t('videoSource.storedTitle')
    case 'refused':
      return t('videoSource.refusedTitle', { name: s.fileName })
    default:
      return s.fileName
  }
})

const meta = computed(() => {
  const s = props.state
  switch (s.status) {
    case 'idle':
      return t('videoSource.limits')
    case 'uploading':
      // Both sides in megabytes, so "490 of 980 MB" reads as one quantity.
      return t('videoSource.progress', {
        loaded: Math.round(s.loaded / MB),
        total: formatSize(s.total),
        percent: percent.value,
      })
    case 'uploaded':
      return t('videoSource.uploaded', { size: formatSize(s.total) })
    case 'stored':
      return t('videoSource.stored')
    case 'failed':
      return t('videoSource.failed')
    case 'refused':
      return s.reason === 'size'
        ? t('videoSource.refusedSize', { name: s.fileName, size: formatSize(s.size) })
        : t('videoSource.refusedFormat')
  }
  return ''
})

const isProblem = computed(() => props.state.status === 'failed' || props.state.status === 'refused')
const hasVideo = computed(() => props.state.status === 'uploaded' || props.state.status === 'stored')
/** Idle and refused cards are themselves the file picker. */
const picksFile = computed(() => props.state.status === 'idle' || props.state.status === 'refused')

function onFileChange(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) return
  const file = event.target.files?.[0]
  event.target.value = ''
  menuOpen.value = false
  if (file) emit('choose', file)
}

function fromMenu(action: 'play' | 'useLink' | 'remove') {
  menuOpen.value = false
  if (action === 'play') emit('play')
  else if (action === 'useLink') emit('useLink')
  else emit('remove')
}

const ACCEPT = 'video/mp4,.mp4'
const MENU_ROW =
  'flex min-h-12 w-full cursor-pointer items-center gap-3 px-4 text-left text-base text-ink hover:bg-surface-sunken focus-within:bg-surface-sunken'
</script>

<template>
  <div
    data-test="video-source"
    :data-status="state.status"
    class="flex flex-col gap-2.5 rounded-xl border bg-surface-raised py-3 pl-3 pr-2"
    :class="[
      isProblem ? 'border-danger' : 'border-border',
      picksFile ? 'border-dashed focus-within:ring-2 focus-within:ring-focus' : '',
    ]"
  >
    <component :is="picksFile ? 'label' : 'div'" class="flex items-center gap-3" :class="picksFile ? 'cursor-pointer' : ''">
      <span
        class="flex size-14 shrink-0 items-center justify-center rounded-[0.625rem]"
        :class="isProblem ? 'bg-danger-muted text-danger' : hasVideo ? 'bg-accent-muted text-accent' : 'bg-surface-sunken text-ink-muted'"
        aria-hidden="true"
      >
        <TriangleAlert v-if="isProblem" :size="24" />
        <Upload v-else-if="state.status === 'idle'" :size="24" />
        <CirclePlay v-else :size="24" />
      </span>
      <span class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span data-test="video-source-title" class="break-words text-sm font-semibold text-ink">{{ title }}</span>
        <span data-test="video-source-meta" class="text-xs font-medium" :class="isProblem ? 'text-danger' : 'text-ink-muted'">{{ meta }}</span>
      </span>
      <template v-if="picksFile">
        <ChevronRight :size="20" class="mx-2.5 shrink-0 text-ink-muted" aria-hidden="true" />
        <input
          data-test="video-source-file-input"
          type="file"
          :accept="ACCEPT"
          class="sr-only"
          :aria-label="state.status === 'refused' ? t('videoSource.chooseAnother') : t('videoSource.upload')"
          @change="onFileChange"
        />
      </template>
      <button
        v-else-if="state.status === 'uploading'"
        type="button"
        data-test="video-source-cancel"
        :aria-label="t('videoSource.cancel')"
        class="flex h-12 w-10 shrink-0 items-center justify-center text-ink"
        @click="emit('cancel')"
      >
        <X :size="22" aria-hidden="true" />
      </button>
      <button
        v-else-if="state.status === 'failed'"
        type="button"
        data-test="video-source-retry"
        :aria-label="t('videoSource.retry')"
        class="flex h-12 w-10 shrink-0 items-center justify-center text-danger"
        @click="emit('retry')"
      >
        <RotateCcw :size="22" aria-hidden="true" />
      </button>
      <button
        v-else
        type="button"
        data-test="video-source-more"
        :aria-label="t('videoSource.more')"
        aria-haspopup="dialog"
        class="flex h-12 w-10 shrink-0 items-center justify-center text-ink"
        @click="menuOpen = true"
      >
        <EllipsisVertical :size="22" aria-hidden="true" />
      </button>
    </component>

    <div
      v-if="state.status === 'uploading'"
      role="progressbar"
      class="mr-1 h-2 rounded-full bg-surface-sunken"
      :aria-valuenow="percent"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="t('videoSource.progressLabel', { name: state.fileName, percent })"
    >
      <!-- The width is the live percentage, which no utility class can express. -->
      <div class="h-2 rounded-full bg-accent" :style="{ width: `${percent}%` }" />
    </div>

    <OverlayLayer :open="menuOpen" :placement="isCompact ? 'bottom' : 'center'" @close="menuOpen = false">
      <div
        data-test="video-source-menu"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="menuTitleId"
        class="flex flex-col bg-surface-raised pb-2 shadow-level3"
        :class="isCompact ? 'w-full rounded-t-xl pb-safe' : 'w-[min(22rem,calc(100vw-2rem))] rounded-xl'"
      >
        <SheetHeader :kind="isCompact ? 'sheet' : 'dialog'" :title="t('videoSource.menuTitle')" :title-id="menuTitleId" closable @close="menuOpen = false" />
        <MenuRow data-test="video-source-play" :icon="Play" :label="t('videoSource.play')" @click="fromMenu('play')" />
        <label :class="MENU_ROW">
          <Upload :size="20" class="shrink-0 text-ink-muted" aria-hidden="true" />
          <span class="flex-1">{{ t('videoSource.replace') }}</span>
          <input data-test="video-source-replace-input" type="file" :accept="ACCEPT" class="sr-only" @change="onFileChange" />
        </label>
        <MenuRow data-test="video-source-use-link" :icon="Link" :label="t('videoSource.useLink')" @click="fromMenu('useLink')" />
        <MenuRow data-test="video-source-remove" :icon="Trash2" :label="t('videoSource.remove')" @click="fromMenu('remove')" />
      </div>
    </OverlayLayer>
  </div>
</template>
