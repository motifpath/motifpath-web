<script setup lang="ts">
// PB-34 spike — throwaway route so `npm run build` pulls the Reka primitive and
// the canvas island into a real chunk for bundle-delta measurement. Never merged.
import SpikeDialog from '@/spike/SpikeDialog.vue'
import SpikeIsland from '@/spike/SpikeIsland.vue'
</script>

<template>
  <main class="mx-auto max-w-md space-y-6 p-6 text-ink">
    <h1 class="text-2xl font-medium">PB-34 spike</h1>
    <SpikeDialog title="Reka dialog" description="Focus trap and Esc handled by Reka UI." />
    <SpikeIsland />
  </main>
</template>
