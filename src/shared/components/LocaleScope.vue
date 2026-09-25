<script setup lang="ts">
/**
 * Shows everything inside it in `locale` rather than the UI locale — messages,
 * interval labels and per-language names — without touching the user's
 * language setting. The diagram editor uses it so each language tab shows the
 * diagram as a reader of that language will see it (ADR-034, 2026-09-25 amendment).
 */
import { toRef } from 'vue'

import type { SupportedLocale } from '@/i18n'
import { provideScopedLocale } from '@/shared/composables/useScopedLocale'

const props = defineProps<{ locale: SupportedLocale }>()

provideScopedLocale(toRef(props, 'locale'))
</script>

<template>
  <slot />
</template>
