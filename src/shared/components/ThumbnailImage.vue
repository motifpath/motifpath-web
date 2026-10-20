<script setup lang="ts">
import { ImageIcon } from 'lucide-vue-next'
import { ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    url?: string
    /** Size and shape classes, e.g. "h-12 w-16 rounded". */
    sizeClass?: string
    /**
     * cover fills the box and crops the overflow; contain shows the whole
     * image, letterboxed on a neutral backdrop.
     */
    fit?: 'cover' | 'contain'
  }>(),
  { url: undefined, sizeClass: 'h-12 w-16 rounded-md', fit: 'cover' },
)

// A broken url shows the same neutral placeholder as a missing one, rather
// than the browser's broken-image icon; a new url gets a fresh try.
const failed = ref(false)
watch(
  () => props.url,
  () => (failed.value = false),
)
</script>

<template>
  <img
    v-if="url && !failed"
    :src="url"
    alt=""
    class="shrink-0"
    :class="[sizeClass, fit === 'contain' ? 'bg-surface-sunken object-contain' : 'object-cover']"
    @error="failed = true"
  />
  <div
    v-else
    data-test="thumbnail-placeholder"
    class="flex shrink-0 items-center justify-center bg-surface-sunken text-ink-subtle"
    :class="sizeClass"
  >
    <ImageIcon :size="18" aria-hidden="true" />
  </div>
</template>
