<script setup lang="ts">
defineProps<{ heading: string; message: string }>()
</script>

<template>
  <div class="flex flex-col items-start gap-2">
    <h2 class="text-lg font-medium text-ink">{{ heading }}</h2>
    <p class="text-ink-muted">{{ message }}</p>
    <slot name="action" />
  </div>
</template>
