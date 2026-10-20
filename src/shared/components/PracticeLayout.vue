<script setup lang="ts">
/**
 * The route layout of a practice run: the whole screen, with no app bar or footer, since a
 * student practising, often with an instrument in hand, needs no way out but the run's own exit.
 */
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-surface">
    <RouterView />
  </div>
</template>
