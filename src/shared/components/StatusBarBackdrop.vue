<script setup lang="ts">
/**
 * The page's surface behind the status bar, for a screen with no top bar to fill it: what scrolls
 * passes under it instead of under the clock. Zero height wherever the device takes nothing from
 * the top edge.
 */
</script>

<template>
  <div data-test="status-bar-backdrop" aria-hidden="true" class="sticky top-0 z-30 h-inset-top shrink-0 bg-surface" />
</template>
