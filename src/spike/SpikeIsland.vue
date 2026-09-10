<script setup lang="ts">
/**
 * PB-34 spike — the ~20-line Vue wrapper around a framework-agnostic engine.
 * The wrapper owns the DOM node and the lifecycle; the engine owns everything
 * that happens inside the canvas.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { PulseEngine } from '@/spike/PulseEngine'

const canvas = ref<HTMLCanvasElement | null>(null)
let engine: PulseEngine | null = null

onMounted(() => {
  if (!canvas.value) return
  engine = new PulseEngine(canvas.value)
  engine.start()
})

onBeforeUnmount(() => {
  engine?.stop()
  engine = null
})
</script>

<template>
  <canvas ref="canvas" width="120" height="60" class="rounded-md bg-surface-raised text-accent" />
</template>
