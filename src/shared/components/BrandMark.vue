<script setup lang="ts">
import { computed, useId } from 'vue'

import { useTypedT } from '@/shared/composables/useTypedT'

/**
 * `sm` and `md` sit on a tile in the app bar, rail and sidebar, as the simplified monogram: at that
 * size the notes would be specks. `lg` (96 px) and `xl` (220 px) are the full mark the landing and
 * its brand panel show — the monogram with its three quavers and detached legato — with a soft glow
 * behind it on the brand panel.
 */
type Size = 'sm' | 'md' | 'lg' | 'xl'
const props = withDefaults(defineProps<{ size?: Size }>(), { size: 'sm' })
const full = computed(() => props.size === 'lg' || props.size === 'xl')

const BOX: Record<Size, string> = {
  sm: 'h-[1.875rem] w-[1.875rem] rounded-md bg-accent-muted',
  md: 'h-9 w-9 rounded-md bg-accent-muted',
  lg: 'h-[6rem] w-[6rem]',
  xl: 'h-[13.75rem] w-[13.75rem]',
}
const GLYPH: Record<Size, number> = { sm: 16, md: 20, lg: 96, xl: 220 }

const { t } = useTypedT()
// One set of ids per mark: two marks on a page (app bar and rail, landing and brand panel) must not
// share one.
const uid = useId()
const gradientId = `${uid}-ribbon`
const ids = {
  light: `${uid}-light`,
  edge: `${uid}-edge`,
  glow: `${uid}-glow`,
  leftClip: `${uid}-left`,
  rightClip: `${uid}-right`,
  quaver: `${uid}-quaver`,
}

// The monogram's two halves, shared by the simplified and the full mark.
const LEFT =
  'M346 203C314 203 290 218 279 243c-4 9-6 19-6 30v526c0 41 32 74 73 74h85c40 0 80-11 108-33 20-16 19-38 8-57-8-16-23-32-41-49l-53-50c-32-31-47-58-40-84 8-30 38-58 81-82l46-27c36-21 49-45 41-71-3-13-10-23-21-34L397 225c-14-14-32-22-51-22Z'
const RIGHT =
  'M689 873c38-24 49-54 35-85-13-30-42-55-83-80l-71-44c-50-31-77-58-73-86 4-29 29-55 69-84 34-24 63-50 89-77l191-193c18-18 41-25 64-25 42 0 76 33 76 77v522c0 42-33 75-75 75H689Z'
// Three quavers rising along the right half, smallest first.
const NOTES = ['translate(566 589) scale(.33 .31)', 'translate(673 477) scale(.46 .48)', 'translate(830 249) scale(.66 .73)']
</script>

<template>
  <div
    class="flex shrink-0 items-center justify-center"
    :class="BOX[size]"
  >
    <svg :width="GLYPH[size]" :height="GLYPH[size]" viewBox="200 100 860 860" role="img" :aria-label="t('appBar.brand')">
      <defs>
        <linearGradient :id="gradientId" x1="309" y1="190" x2="938" y2="890" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#a14cff" />
          <stop offset=".27" stop-color="#8134ff" />
          <stop offset=".62" stop-color="#6421fa" />
          <stop offset="1" stop-color="#4714df" />
        </linearGradient>
        <template v-if="full">
          <radialGradient :id="ids.light" cx="0" cy="0" r="1" gradientTransform="translate(455 337) rotate(43) scale(575 515)" gradientUnits="userSpaceOnUse">
            <stop stop-color="#d06dff" stop-opacity=".48" />
            <stop offset=".43" stop-color="#8a3aff" stop-opacity=".18" />
            <stop offset="1" stop-color="#4814e6" stop-opacity="0" />
          </radialGradient>
          <linearGradient :id="ids.edge" x1="300" y1="205" x2="956" y2="866" gradientUnits="userSpaceOnUse">
            <stop stop-color="#f0b2ff" />
            <stop offset=".36" stop-color="#c274ff" />
            <stop offset=".72" stop-color="#7d3cff" />
            <stop offset="1" stop-color="#5724ef" />
          </linearGradient>
          <filter :id="ids.glow" x="-18%" y="-18%" width="136%" height="136%">
            <feGaussianBlur stdDeviation="14" result="blur" />
            <feColorMatrix in="blur" type="matrix" values=".45 0 0 0 .22 0 .15 0 0 .03 0 0 .9 0 .7 0 0 0 .55 0" />
          </filter>
          <clipPath :id="ids.leftClip"><path :d="LEFT" /></clipPath>
          <clipPath :id="ids.rightClip"><path :d="RIGHT" /></clipPath>
          <path
            :id="ids.quaver"
            d="M84 7h14c2 22 16 35 35 50 30 23 43 52 41 83-2 23-14 46-31 67l-7-5c10-19 16-36 15-53-1-25-19-46-48-66v156c0 35-24 60-58 65-29 4-52-9-57-32-6-24 8-47 31-56 23-9 48-5 65 8V7Z"
            fill="#08072b"
            stroke="#c97cff"
            stroke-width="6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </template>
      </defs>

      <g v-if="size === 'xl'" opacity=".52" :filter="`url(#${ids.glow})`" fill="#6124ff">
        <path :d="LEFT" />
        <path :d="RIGHT" />
      </g>
      <path :d="LEFT" :fill="`url(#${gradientId})`" :stroke="full ? `url(#${ids.edge})` : undefined" :stroke-width="full ? 3 : undefined" />
      <path :d="RIGHT" :fill="`url(#${gradientId})`" :stroke="full ? `url(#${ids.edge})` : undefined" :stroke-width="full ? 3 : undefined" />
      <template v-if="full">
        <rect x="250" y="180" width="760" height="720" :fill="`url(#${ids.light})`" :clip-path="`url(#${ids.leftClip})`" />
        <rect x="250" y="180" width="760" height="720" :fill="`url(#${ids.light})`" :clip-path="`url(#${ids.rightClip})`" opacity=".68" />
        <path data-test="brand-legato" d="M607 668c89-2 168-30 218-78 24-23 41-56 51-97-7 42-24 78-48 102-51 50-130 80-221 73Z" fill="#a958ff" />
        <use v-for="transform in NOTES" :key="transform" data-test="brand-note" :href="`#${ids.quaver}`" :transform="transform" />
      </template>
    </svg>
  </div>
</template>
