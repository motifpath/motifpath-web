<script setup lang="ts">
/**
 * The picture an instrument's icon key names, drawn in the current text color. The set of keys is
 * open: a key this client doesn't know is drawn as its family's generic picture, so a new
 * instrument always has one. Decorative: the instrument's name beside it says what it is.
 */
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'

type Family = components['schemas']['Instrument']['family']

const props = defineProps<{ icon: string; family: Family }>()

const KNOWN = ['acoustic_guitar', 'electric_guitar', 'electric_bass', 'piano', 'fretted', 'keyboard']

const drawn = computed(() => (KNOWN.includes(props.icon) ? props.icon : props.family))
</script>

<template>
  <svg
    :data-icon="drawn"
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="drawn === 'acoustic_guitar'">
      <g transform="rotate(40 24 24) translate(24 24) scale(1.12) translate(-24 -24)">
        <path d="M21 2h6v5h-6z" />
        <path d="M22.5 7h3v15h-3z" />
        <path
          d="M24 21c6 0 8 4 6.5 8 3.5 2 4.5 6 3.5 10-1 5-6 7-10 7s-9-2-10-7c-1-4 0-8 3.5-10-1.5-4 .5-8 6.5-8z"
        />
        <circle cx="24" cy="31" r="2.6" />
        <path d="M21 40h6" />
      </g>
    </template>

    <template v-else-if="drawn === 'electric_guitar'">
      <g transform="rotate(40 24 24) translate(24 24) scale(1.12) translate(-24 -24)">
        <path d="M22 2l5-1 .5 5H22z" />
        <path d="M22.5 6h3v19h-3z" />
        <path
          d="M19 24c-2-3-2-6 0-6s3 4 3.5 7h3c.5-4 2.5-9 4.5-8s1 5-1 8c4 2 6 7 4 12-2 6-6 8-9 8-5 0-10-3-10-9 0-5 2-9 5-12z"
        />
        <path d="M21 31h6M21 35h6M21.5 39.5h5" />
      </g>
    </template>

    <template v-else-if="drawn === 'electric_bass'">
      <g transform="rotate(40 24 24) translate(24 24) scale(1.12) translate(-24 -24)">
        <path d="M21.5 1h5l.5 4h-5.5z" />
        <path d="M22.75 5h2.5v23h-2.5z" />
        <path
          d="M20 28c-2-3-2-6 0-6s2.5 3 3 6h2c.5-4 2.5-7 4.5-6s1 4-1 7c3.5 2 4.5 6 3 10-1.5 5-5 7-7.5 7-3.5 0-7.5-2-8-7-.5-5 1-9 4-11z"
        />
        <path d="M21.5 35h5M22 41h4" />
      </g>
    </template>

    <template v-else-if="drawn === 'piano'">
      <rect x="5" y="11" width="38" height="26" rx="2" />
      <path d="M11.3 11v26M17.6 11v26M23.9 11v26M30.2 11v26M36.5 11v26" />
      <path
        d="M9.8 11h3v14h-3zM16.1 11h3v14h-3zM28.7 11h3v14h-3zM35 11h3v14h-3z"
        fill="currentColor"
        stroke="none"
      />
    </template>

    <template v-else-if="drawn === 'keyboard'">
      <rect x="4" y="13" width="40" height="22" rx="2" />
      <path d="M4 19h40" />
      <path d="M12 19v16M20 19v16M28 19v16M36 19v16" />
      <path d="M10.5 19h3v9h-3zM18.5 19h3v9h-3zM34.5 19h3v9h-3z" fill="currentColor" stroke="none" />
    </template>

    <template v-else>
      <rect x="4" y="15" width="40" height="18" rx="1.5" />
      <path d="M14 15v18M24 15v18M34 15v18" />
      <path d="M4 20h40M4 24h40M4 28h40" stroke-width="1" />
    </template>
  </svg>
</template>
