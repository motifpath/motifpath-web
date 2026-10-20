<script setup lang="ts">
withDefaults(defineProps<{ initial: string; size?: 'sm' | 'md' }>(), { size: 'sm' })
</script>

<template>
  <span
    class="flex shrink-0 items-center justify-center rounded-full bg-accent font-bold text-accent-fg"
    :class="size === 'md' ? 'h-12 w-12 text-lg' : 'h-6 w-6 text-sm'"
    aria-hidden="true"
  >
    {{ initial }}
  </span>
</template>
