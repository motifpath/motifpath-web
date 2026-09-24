<script setup lang="ts">
import { ref } from 'vue'

import ColorPalette from '@/shared/components/ColorPalette.vue'

defineProps<{ title: string; testId: string; modelValue?: string | null }>()
const emit = defineEmits<{ select: [color: string | null] }>()

const open = ref(false)

function choose(color: string | null): void {
  emit('select', color)
  open.value = false
}
</script>

<template>
  <div
    data-test="color-palette-menu"
    class="relative"
    @keydown.escape="open = false"
  >
    <button
      type="button"
      :data-test="`${testId}-trigger`"
      :title="title"
      :aria-label="title"
      :aria-expanded="open"
      class="flex flex-col items-center gap-0.5 rounded p-1.5 text-ink-muted"
      @click="open = !open"
    >
      <slot />
      <span
        :data-test="`${testId}-indicator`"
        :data-color="modelValue ?? ''"
        class="h-0.5 w-4 rounded-full"
        :class="modelValue ? '' : 'bg-border'"
        :style="modelValue ? { backgroundColor: modelValue } : undefined"
      />
    </button>
    <template v-if="open">
      <div data-test="color-palette-overlay" class="fixed inset-0 z-30" @click="open = false" />
      <div class="absolute left-0 top-full z-40 mt-1 rounded-lg border border-border bg-surface-raised p-2 shadow-level2">
        <ColorPalette :model-value="modelValue" @select="choose" />
      </div>
    </template>
  </div>
</template>
