<script setup lang="ts">
/** An applied filter: its name, and × to remove just that filter. */
import { X } from 'lucide-vue-next'

import { useTypedT } from '@/shared/composables/useTypedT'

defineProps<{ label: string }>()
const emit = defineEmits<{ remove: [] }>()

const { t } = useTypedT()
</script>

<template>
  <span
    data-test="filter-chip"
    class="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-accent-muted pl-3 pr-1 text-sm font-semibold text-accent-text"
  >
    {{ label }}
    <button
      type="button"
      class="inline-flex size-8 items-center justify-center rounded-full hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      :aria-label="t('filters.remove', { label })"
      @click="emit('remove')"
    >
      <X :size="16" aria-hidden="true" />
    </button>
  </span>
</template>
