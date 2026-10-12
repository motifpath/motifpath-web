<script setup lang="ts">
/**
 * One sound of a listening exercise, as its author sets it: an uploaded file or a diagram's
 * playback. With none yet, the card opens the choice of where it comes from (Upload audio or From
 * a diagram); a file is handed back as picked, and From a diagram asks the holder to open the
 * diagram picker. Once set, it says where the sound comes from and plays it, and ⋮ offers Change
 * sound, Edit settings (a diagram's) and Remove. A diagram sound notes it is hidden from students
 * until they answer.
 */
import { AudioLines, ChevronRight, EllipsisVertical, Pencil, Play, Plus, SlidersHorizontal, Square, Trash2, Upload, Waypoints } from 'lucide-vue-next'
import { computed, ref, useId } from 'vue'

import DiagramSoundSummary from '@/features/teacher/components/DiagramSoundSummary.vue'
import MenuRow from '@/shared/components/MenuRow.vue'
import OverlayLayer from '@/shared/components/OverlayLayer.vue'
import SheetHeader from '@/shared/components/SheetHeader.vue'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { components } from '@/api/generated/core-domain'

type DiagramRef = components['schemas']['DiagramRef']

/** Where a sound comes from: an uploaded file (or one picked, not uploaded yet) or a diagram's playback. */
export type SoundValue = { kind: 'file'; url: string } | { kind: 'diagram'; ref: DiagramRef }

const props = defineProps<{
  sound: SoundValue | null
  /** What the sheets are titled, such as "Sound 2" for an option. */
  title: string
}>()
const emit = defineEmits<{ file: [file: File]; diagram: []; edit: []; remove: [] }>()

const { t } = useTypedT()
const { isCompact } = useSizeClass()
const sheetTitleId = useId()

/** Which sheet is open: the choice of where the sound comes from, or a set sound's actions. */
const sheet = ref<'choose' | 'actions' | null>(null)

const actions = computed(() => [
  { id: 'change', label: t('soundSource.change'), icon: Pencil },
  ...(props.sound?.kind === 'diagram' ? [{ id: 'edit', label: t('soundSource.edit'), icon: SlidersHorizontal }] : []),
  { id: 'remove', label: t('soundSource.remove'), icon: Trash2, danger: true },
])

function onAction(id: string) {
  if (id === 'change') {
    sheet.value = 'choose'
    return
  }
  sheet.value = null
  if (id === 'edit') emit('edit')
  else emit('remove')
}

function onFileChange(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) return
  const file = event.target.files?.[0]
  event.target.value = ''
  sheet.value = null
  if (file) emit('file', file)
}

function fromDiagram() {
  sheet.value = null
  emit('diagram')
}

// An uploaded file plays through one hidden player.
const player = ref<HTMLAudioElement | null>(null)
const filePlaying = ref(false)
function toggleFile() {
  const el = player.value
  if (!el) return
  if (filePlaying.value) {
    el.pause()
    return
  }
  el.currentTime = 0
  el.play().catch(() => (filePlaying.value = false))
}

const MENU_ROW =
  'flex min-h-12 w-full cursor-pointer items-center gap-3 px-4 text-left text-base text-ink hover:bg-surface-sunken focus-within:bg-surface-sunken'
</script>

<template>
  <div data-test="sound-source" class="flex flex-col gap-1.5">
    <button
      v-if="!sound"
      type="button"
      data-test="sound-source-choose"
      class="flex items-center gap-3 rounded-xl border border-dashed border-border bg-surface-raised py-3 pl-3 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      @click="sheet = 'choose'"
    >
      <span class="flex size-14 shrink-0 items-center justify-center rounded-[0.625rem] bg-surface-sunken text-ink-muted" aria-hidden="true">
        <Plus :size="24" />
      </span>
      <span class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span data-test="sound-source-title" class="text-sm font-semibold text-ink">{{ t('soundSource.choose') }}</span>
        <span class="text-xs font-medium text-ink-muted">{{ t('soundSource.chooseHint') }}</span>
      </span>
      <ChevronRight :size="20" class="mx-2.5 shrink-0 text-ink-muted" aria-hidden="true" />
    </button>

    <div v-else class="flex items-center gap-3 rounded-xl border border-border bg-surface-raised py-3 pl-3 pr-1">
      <DiagramSoundSummary v-if="sound.kind === 'diagram'" :sound="sound.ref" />
      <template v-else>
        <span class="flex size-14 shrink-0 items-center justify-center rounded-[0.625rem] bg-accent-muted text-accent" aria-hidden="true">
          <AudioLines :size="24" />
        </span>
        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
          <span data-test="sound-source-title" class="text-sm font-semibold text-ink">{{ t('soundSource.fileTitle') }}</span>
          <span data-test="sound-source-meta" class="text-xs font-medium text-ink-muted">{{ t('soundSource.fileMeta') }}</span>
        </span>
        <button
          type="button"
          data-test="sound-source-play"
          class="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          :aria-label="filePlaying ? t('soundSource.stop') : t('soundSource.play')"
          @click="toggleFile"
        >
          <Square v-if="filePlaying" :size="16" fill="currentColor" aria-hidden="true" />
          <Play v-else :size="20" aria-hidden="true" />
        </button>
        <audio ref="player" :src="sound.url" class="hidden" @play="filePlaying = true" @pause="filePlaying = false" @ended="filePlaying = false" />
      </template>
      <button
        type="button"
        data-test="sound-source-menu"
        :aria-label="t('soundSource.more', { title })"
        class="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        @click="sheet = 'actions'"
      >
        <EllipsisVertical :size="20" aria-hidden="true" />
      </button>
    </div>
    <p v-if="sound?.kind === 'diagram'" data-test="sound-source-hidden" class="text-xs text-ink-muted">{{ t('soundSource.hidden') }}</p>

    <OverlayLayer :open="sheet !== null" :placement="isCompact ? 'bottom' : 'center'" @close="sheet = null">
      <div
        role="dialog"
        aria-modal="true"
        :aria-labelledby="sheetTitleId"
        class="flex flex-col bg-surface-raised pb-2 shadow-level3"
        :class="isCompact ? 'w-full rounded-t-xl pb-safe' : 'w-[min(24rem,calc(100vw-2rem))] rounded-xl'"
      >
        <SheetHeader
          :kind="isCompact ? 'sheet' : 'dialog'"
          :title="sheet === 'choose' ? t('soundSource.chooseTitle') : title"
          :title-id="sheetTitleId"
          closable
          @close="sheet = null"
        />
        <template v-if="sheet === 'choose'">
          <label data-test="sound-source-menu-item" :class="MENU_ROW">
            <Upload :size="20" class="shrink-0 text-ink-muted" aria-hidden="true" />
            <span class="flex-1">{{ t('soundSource.upload') }}</span>
            <input data-test="sound-source-file-input" type="file" accept="audio/*" class="sr-only" @change="onFileChange" />
          </label>
          <MenuRow data-test="sound-source-menu-item" :icon="Waypoints" :label="t('soundSource.fromDiagram')" @click="fromDiagram" />
          <p class="px-4 pt-2 text-xs text-ink-muted">{{ t('soundSource.chooseNote') }}</p>
        </template>
        <template v-else>
          <MenuRow
            v-for="action in actions"
            :key="action.id"
            data-test="sound-source-menu-item"
            :icon="action.icon"
            :label="action.label"
            :danger="action.danger"
            @click="onAction(action.id)"
          />
        </template>
      </div>
    </OverlayLayer>
  </div>
</template>
