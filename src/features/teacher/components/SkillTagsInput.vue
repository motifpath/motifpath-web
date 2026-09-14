<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { ref } from 'vue'

defineProps<{ tags: string[] }>()
const emit = defineEmits<{ add: [tag: string]; remove: [tag: string] }>()

const draft = ref('')

function submit() {
  if (!draft.value.trim()) return
  emit('add', draft.value)
  draft.value = ''
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface-raised p-2">
    <span
      v-for="tag in tags"
      :key="tag"
      class="flex items-center gap-1.5 rounded-full bg-accent-muted py-[5px] pl-3 pr-1.5 text-[0.8125rem] font-semibold text-accent-text"
    >
      {{ tag }}
      <button
        type="button"
        data-test="tag-remove"
        class="flex h-[18px] w-[18px] items-center justify-center rounded-full text-accent-text"
        :aria-label="`Remove tag ${tag}`"
        @click="emit('remove', tag)"
      >
        <X :size="11" :stroke-width="2.4" aria-hidden="true" />
      </button>
    </span>
    <input
      v-model="draft"
      type="text"
      placeholder="Type a skill and press Enter"
      class="min-w-[140px] flex-1 border-none bg-transparent px-1 py-1.5 text-sm outline-none"
      @keydown.enter.prevent="submit"
    />
  </div>
</template>
