<script setup lang="ts">
import { FileText, Video } from 'lucide-vue-next'

import type { components } from '@/api/generated/core-domain'

type ContentType = components['schemas']['CreateContentNodeRequest']['content_type']

defineProps<{ modelValue: ContentType; disabled: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: ContentType] }>()

const contentTypes: { value: ContentType; label: string; icon: typeof Video }[] = [
  { value: 'video', label: 'Video', icon: Video },
  { value: 'article', label: 'Article', icon: FileText },
]
</script>

<template>
  <div class="flex w-fit gap-2 rounded-lg bg-surface-sunken p-1">
    <button
      v-for="type in contentTypes"
      :key="type.value"
      type="button"
      :data-test="`content-type-${type.value}`"
      :disabled="disabled"
      class="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      :class="modelValue === type.value ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
      @click="emit('update:modelValue', type.value)"
    >
      <component :is="type.icon" :size="16" aria-hidden="true" />
      {{ type.label }}
    </button>
  </div>
</template>
