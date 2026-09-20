<script setup lang="ts">
import { computed } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'

import Icon from '@/shared/components/Icon.vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

const isDark = computed(() => themeStore.theme === 'dark')

const { t } = useTypedT()
</script>

<template>
  <button
    type="button"
    data-test="theme-toggle"
    :aria-pressed="isDark"
    :aria-label="t('appBar.themeToggleAriaLabel')"
    class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-ink-muted"
    @click="themeStore.toggle()"
  >
    <Icon :name="isDark ? 'sun' : 'moon'" :size="15" />
  </button>
</template>
