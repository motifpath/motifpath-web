<script setup lang="ts">
import { computed } from 'vue'

import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

const isDark = computed(() => themeStore.theme === 'dark')
const label = computed(() => (isDark.value ? 'Dark' : 'Light'))
</script>

<template>
  <button
    type="button"
    data-test="theme-toggle"
    :aria-pressed="isDark"
    class="rounded border border-border px-2 py-1 text-xs text-ink-muted hover:text-ink"
    @click="themeStore.toggle()"
  >
    {{ label }}
  </button>
</template>
