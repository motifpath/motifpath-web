<script setup lang="ts">
/**
 * A search field: a magnifier, the text, and × to clear it while there is any. The placeholder
 * names what is searched ("Search title or artist") and labels the field for screen readers.
 */
import { Search, X } from 'lucide-vue-next'

defineProps<{ placeholder: string }>()
const text = defineModel<string>({ required: true })
</script>

<template>
  <label class="flex h-12 min-w-0 items-center gap-2 rounded-xl bg-surface-sunken pl-3.5 pr-1.5 text-ink-subtle focus-within:ring-2 focus-within:ring-focus">
    <Search :size="20" class="shrink-0" aria-hidden="true" />
    <input
      v-model="text"
      type="search"
      :placeholder="placeholder"
      :aria-label="placeholder"
      class="min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-ink-subtle focus:outline-none [&::-webkit-search-cancel-button]:hidden"
    />
    <button
      v-if="text"
      type="button"
      data-test="search-clear"
      class="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface"
      :aria-label="placeholder"
      @click="text = ''"
    >
      <X :size="18" aria-hidden="true" />
    </button>
  </label>
</template>
