<script setup lang="ts">
import { Circle, ImageOff, Minus, Plus, Square, X } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'

import { clamp, type Region } from '@/features/teacher/composables/useExerciseForm'

const props = defineProps<{
  imageUrl: string
  regions: Region[]
  newRegionShape: 'circle' | 'rectangle'
}>()

const emit = defineEmits<{
  'add-region': [x: number, y: number]
  'move-region': [id: string, x: number, y: number]
  'resize-region': [id: string, deltaWidth: number, deltaHeight: number]
  'toggle-region': [id: string]
  'remove-region': [id: string]
  'update:newRegionShape': [shape: 'circle' | 'rectangle']
  'update:stimulus-size': [width: number, height: number]
}>()

const { t } = useTypedT()

const stimulusImage = ref<HTMLImageElement | null>(null)
// True only once the current imageUrl has actually finished loading — until
// then the image has no reliable rendered size, and clicking/dragging would
// compute a position against a layout that's about to change size.
const imageLoaded = ref(false)

function measureStimulusSize() {
  if (!stimulusImage.value) return
  const rect = stimulusImage.value.getBoundingClientRect()
  emit('update:stimulus-size', rect.width, rect.height)
}

function onImageLoad() {
  imageLoaded.value = true
  measureStimulusSize()
}

watch(
  () => props.imageUrl,
  () => {
    imageLoaded.value = false
  },
)

function onWindowResize() {
  if (imageLoaded.value) measureStimulusSize()
}

onMounted(() => {
  window.addEventListener('resize', onWindowResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize)
})

function percentFromEvent(container: HTMLElement, clientX: number, clientY: number) {
  const rect = container.getBoundingClientRect()
  const x = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100)
  const y = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100)
  return { x, y }
}

function onCanvasClick(event: MouseEvent) {
  if (!props.imageUrl || !imageLoaded.value) return
  const container = event.currentTarget as HTMLElement
  const { x, y } = percentFromEvent(container, event.clientX, event.clientY)
  emit('add-region', x, y)
}

function startDrag(region: Region, event: MouseEvent) {
  if (!imageLoaded.value) return
  event.stopPropagation()
  event.preventDefault()
  const container = (event.currentTarget as HTMLElement).parentElement
  if (!container) return

  function onMove(moveEvent: MouseEvent) {
    if (!container) return
    const { x, y } = percentFromEvent(container, moveEvent.clientX, moveEvent.clientY)
    emit('move-region', region.id, x, y)
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}
</script>

<template>
  <div class="flex flex-col gap-3.5">
    <div class="flex items-center gap-2">
      <span class="text-sm text-ink-subtle">{{ t('imageRegionEditor.newRegion') }}</span>
      <div class="flex gap-1 rounded-md bg-surface-sunken p-1">
        <button
          type="button"
          data-test="shape-circle"
          class="flex h-[26px] w-[30px] items-center justify-center rounded"
          :class="props.newRegionShape === 'circle' ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="emit('update:newRegionShape', 'circle')"
        >
          <Circle :size="14" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-test="shape-rectangle"
          class="flex h-[26px] w-[30px] items-center justify-center rounded"
          :class="props.newRegionShape === 'rectangle' ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="emit('update:newRegionShape', 'rectangle')"
        >
          <Square :size="14" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div
      data-test="region-canvas"
      class="relative overflow-hidden rounded-lg border border-border bg-surface-sunken"
      :class="props.imageUrl ? 'cursor-crosshair' : 'cursor-default'"
      @click="onCanvasClick"
    >
      <div
        v-if="!props.imageUrl"
        data-test="no-image-placeholder"
        class="flex h-60 w-full flex-col items-center justify-center gap-2 text-ink-subtle"
      >
        <ImageOff :size="26" aria-hidden="true" />
        <span class="text-[0.8125rem]">{{ t('imageRegionEditor.noImagePlaceholder') }}</span>
      </div>
      <img
        v-else
        ref="stimulusImage"
        :src="props.imageUrl"
        alt=""
        class="block w-full h-auto"
        draggable="false"
        @load="onImageLoad"
      />
      <div
        v-for="(region, index) in props.regions"
        :key="region.id"
        class="absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab select-none items-center justify-center text-xs font-bold shadow"
        :class="[
          region.shape === 'circle' ? 'rounded-full' : 'rounded-sm',
          region.correct ? 'border-2 border-success bg-success-muted text-success' : 'border-2 border-accent bg-accent-muted text-accent',
        ]"
        :style="{
          left: region.x + '%',
          top: region.y + '%',
          width: region.width + 'px',
          height: region.height + 'px',
        }"
        @mousedown="startDrag(region, $event)"
        @click.stop
      >
        {{ index + 1 }}
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <div
        v-for="(region, index) in props.regions"
        :key="region.id"
        data-test="region-controls"
        class="flex flex-col gap-2 rounded-md border border-border bg-surface-raised p-2.5"
      >
        <div class="flex items-center gap-2.5">
          <span
            class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
            :class="region.correct ? 'bg-success-muted text-success' : 'bg-accent-muted text-accent'"
            >{{ index + 1 }}</span
          >
          <span class="flex-1 text-sm text-ink-muted">{{ t('imageRegionEditor.region', { number: index + 1 }) }}</span>
          <button
            type="button"
            data-test="region-toggle"
            :aria-pressed="region.correct"
            class="rounded-sm border px-2.5 py-[5px] text-[0.8125rem] font-semibold"
            :class="region.correct ? 'border-success bg-success-muted text-success' : 'border-border bg-surface-raised text-ink-muted'"
            @click="emit('toggle-region', region.id)"
          >
            {{ t('common.correctAnswer') }}
          </button>
          <button
            type="button"
            data-test="region-remove"
            :aria-label="t('imageRegionEditor.removeRegionAriaLabel')"
            class="flex h-[26px] w-[26px] items-center justify-center rounded-sm text-ink-subtle"
            @click="emit('remove-region', region.id)"
          >
            <X :size="14" aria-hidden="true" />
          </button>
        </div>

        <div v-if="region.shape === 'circle'" class="flex items-center gap-2 pl-10">
          <span class="w-11 text-xs text-ink-subtle">{{ t('imageRegionEditor.size') }}</span>
          <button
            type="button"
            data-test="shrink"
            class="flex h-5 w-5 items-center justify-center rounded-sm border border-border bg-surface-sunken"
            @click="emit('resize-region', region.id, -8, -8)"
          ><Minus :size="14" aria-hidden="true" /></button>
          <button
            type="button"
            data-test="grow"
            class="flex h-5 w-5 items-center justify-center rounded-sm border border-border bg-surface-sunken"
            @click="emit('resize-region', region.id, 8, 8)"
          ><Plus :size="14" aria-hidden="true" /></button>
        </div>
        <div v-else class="flex items-center gap-4 pl-10">
          <div class="flex items-center gap-2">
            <span class="w-11 text-xs text-ink-subtle">{{ t('imageRegionEditor.width') }}</span>
            <button
              type="button"
              data-test="shrink-width"
              class="flex h-5 w-5 items-center justify-center rounded-sm border border-border bg-surface-sunken"
              @click="emit('resize-region', region.id, -8, 0)"
            ><Minus :size="14" aria-hidden="true" /></button>
            <button
              type="button"
              data-test="grow-width"
              class="flex h-5 w-5 items-center justify-center rounded-sm border border-border bg-surface-sunken"
              @click="emit('resize-region', region.id, 8, 0)"
            ><Plus :size="14" aria-hidden="true" /></button>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-ink-subtle">{{ t('imageRegionEditor.height') }}</span>
            <button
              type="button"
              data-test="shrink-height"
              class="flex h-5 w-5 items-center justify-center rounded-sm border border-border bg-surface-sunken"
              @click="emit('resize-region', region.id, 0, -8)"
            ><Minus :size="14" aria-hidden="true" /></button>
            <button
              type="button"
              data-test="grow-height"
              class="flex h-5 w-5 items-center justify-center rounded-sm border border-border bg-surface-sunken"
              @click="emit('resize-region', region.id, 0, 8)"
            ><Plus :size="14" aria-hidden="true" /></button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
