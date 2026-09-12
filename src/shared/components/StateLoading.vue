<script setup lang="ts">
withDefaults(defineProps<{ noun?: string }>(), { noun: '' })
</script>

<template>
  <p class="text-sm text-ink-muted">Loading{{ noun ? ` ${noun}` : '' }}…</p>
</template>
