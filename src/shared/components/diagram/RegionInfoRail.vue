<script setup lang="ts">
/**
 * The rail above a fretboard holding one information control per region, near the region's last
 * fret and colored like it, and the region's description, opened on demand under its control.
 * Other controls, such as a player, can take the rail's left end (`leading`, `leadingWidth`
 * wide): when a region's control would sit under them, the regions' controls move to a row below.
 * The student's viewer and the teacher's editor both use it, so an author finds a region's
 * description where a student will.
 *
 * One description is open at a time (`v-model:openId`). It closes from its close control, its
 * control again, Escape (both returning focus to the control), or a click anywhere outside this
 * diagram's region UI (`[data-region-ui]` inside the nearest `[data-region-scope]`) without taking
 * focus — a click, not a press, so swiping the board or dragging its scrollbar leaves it open.
 */
import { computed, onMounted, onUnmounted, ref, useId } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { Info, X } from 'lucide-vue-next'

import { CONTROL_SIZE, anchorDescription, placeRegionControls } from '@/shared/utils/regionInfoLayout'
import { useTypedT } from '@/shared/composables/useTypedT'

export interface RailRegion {
  id: string
  /** The region's right edge, in the rail's own pixels. */
  right: number
  /** The region's #RRGGBB color; null = the accent color. */
  color: string | null
  /** Names the control and is the description it opens. */
  label: string
}

const props = defineProps<{
  regions: RailRegion[]
  /** The rail's width: the board's drawn width. */
  width: number
  /** How far the board is scrolled, and how much of it shows, so a description stays in view. */
  scrollLeft: number
  visibleWidth: number
  /** Room kept at the rail's left end for the `leading` slot's controls. */
  leadingWidth?: number
}>()

defineSlots<{ leading?: () => unknown }>()

const openId = defineModel<string | null>('openId', { default: null })

const { t } = useTypedT()

const rail = ref<HTMLElement | null>(null)
const descriptionId = `region-description-${useId()}`

const controls = computed(() => {
  const placed = placeRegionControls(
    props.regions.map((region) => ({ id: region.id, right: region.right })),
    props.width,
  )
  const leading = props.leadingWidth ?? 0
  // The regions' controls keep their places relative to one another, as one row below the leading
  // controls rather than under them.
  const clearsLeading = placed.every((control) => control.row > 0 || control.center - CONTROL_SIZE / 2 >= leading)
  const rowOffset = leading > 0 && !clearsLeading ? 1 : 0
  return props.regions.map((region, index) => ({
    region,
    left: placed[index]!.center - CONTROL_SIZE / 2,
    top: (placed[index]!.row + rowOffset) * CONTROL_SIZE,
  }))
})
// A board wide enough keeps every control on one row; a narrow one wraps them onto more.
const railHeight = computed(() => Math.max(1, ...controls.value.map((control) => control.top / CONTROL_SIZE + 1)) * CONTROL_SIZE)

const openRegion = computed(() => props.regions.find((region) => region.id === openId.value))

const DESCRIPTION_WIDTH = 248
const descriptionPlacement = computed(() => {
  const control = controls.value.find((item) => item.region.id === openId.value)
  return anchorDescription({
    controlCenter: (control?.left ?? 0) + CONTROL_SIZE / 2,
    width: DESCRIPTION_WIDTH,
    scrollLeft: props.scrollLeft,
    visibleWidth: props.visibleWidth,
  })
})

function colorStyle(region: RailRegion): { color: string } | undefined {
  return region.color ? { color: region.color } : undefined
}

const controlElements = new Map<string, HTMLElement>()
function setControlElement(regionId: string, element: Element | ComponentPublicInstance | null) {
  if (element instanceof HTMLElement) controlElements.set(regionId, element)
  else controlElements.delete(regionId)
}

function toggle(region: RailRegion) {
  openId.value = openId.value === region.id ? null : region.id
}

/** Closes the open description; from the keyboard or its close control, focus goes back to the
 *  control that opened it. */
function close(returnFocus: boolean) {
  const regionId = openId.value
  openId.value = null
  if (returnFocus && regionId) controlElements.get(regionId)?.focus()
}

/** Listened to while capturing, so it's seen even where a click stops propagating (another
 *  diagram's rail). */
function onDocumentClick(event: Event) {
  const target = event.target instanceof Element ? event.target : null
  const scope = rail.value?.closest('[data-region-scope]') ?? rail.value
  if (target && scope?.contains(target) && target.closest('[data-region-ui]')) return
  openId.value = null
}

onMounted(() => document.addEventListener('click', onDocumentClick, true))
onUnmounted(() => document.removeEventListener('click', onDocumentClick, true))
</script>

<template>
  <!-- A press on the controls or a description never reaches whatever holds the diagram (such as
       an answer card). -->
  <div ref="rail" data-test="region-rail" class="relative z-10" :style="{ height: `${railHeight}px` }" @click.stop>
    <div v-if="(leadingWidth ?? 0) > 0" data-test="rail-leading" class="absolute left-0 top-0 z-20 flex">
      <slot name="leading" />
    </div>
    <button
      v-for="control in controls"
      :key="control.region.id"
      :ref="(element) => setControlElement(control.region.id, element)"
      type="button"
      data-test="region-info"
      data-region-ui
      class="absolute flex h-11 w-11 items-end justify-center rounded-md pb-1.5 hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus"
      :class="control.region.color ? '' : 'text-accent'"
      :style="{ left: `${control.left}px`, top: `${control.top}px`, ...colorStyle(control.region) }"
      :aria-label="control.region.label"
      :aria-expanded="openId === control.region.id"
      :aria-controls="openId === control.region.id ? descriptionId : undefined"
      @click="toggle(control.region)"
      @keydown.escape="close(true)"
    >
      <Info :size="18" aria-hidden="true" />
    </button>
    <div
      v-if="openRegion"
      :id="descriptionId"
      data-test="region-description"
      data-region-ui
      role="status"
      class="absolute top-full z-30 mt-1 rounded-md border border-t-2 border-border bg-surface-raised text-sm text-ink shadow-level2"
      :class="openRegion.color ? '' : 'border-t-accent'"
      :style="{
        left: `${descriptionPlacement.left}px`,
        width: `${descriptionPlacement.width}px`,
        ...(openRegion.color ? { borderTopColor: openRegion.color } : {}),
      }"
      @keydown.escape="close(true)"
    >
      <span
        data-test="region-description-arrow"
        aria-hidden="true"
        class="absolute -top-1.5 h-2.5 w-2.5 rotate-45 border-l-2 border-t-2 bg-surface-raised"
        :class="openRegion.color ? '' : 'border-accent'"
        :style="{
          left: `${descriptionPlacement.arrow - 5}px`,
          ...(openRegion.color ? { borderColor: openRegion.color } : {}),
        }"
      />
      <div class="flex items-center gap-1 py-1 pl-3 pr-1">
        <span class="flex-1 break-words leading-snug">{{ openRegion.label }}</span>
        <button
          type="button"
          data-test="region-description-close"
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
          :aria-label="t('fretboard.closeDescription')"
          @click="close(true)"
        >
          <X :size="16" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>
