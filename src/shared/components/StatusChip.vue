<script setup lang="ts">
/**
 * A small status label, such as "2 fading" or "New". The label always says what the chip means,
 * so its colour is never the only cue. It informs; it is never a control.
 */
withDefaults(defineProps<{ label: string; tone?: 'neutral' | 'warning' | 'accent' | 'success' | 'danger' }>(), { tone: 'neutral' })

const toneClass = {
  neutral: 'bg-surface-sunken text-ink-muted',
  warning: 'bg-warning-muted text-warning',
  accent: 'bg-accent-muted text-accent-text',
  success: 'bg-success-muted text-success',
  danger: 'bg-danger-muted text-danger',
} as const
</script>

<template>
  <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold" :class="toneClass[tone]">{{ label }}</span>
</template>
