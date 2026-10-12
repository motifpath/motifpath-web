<script setup lang="ts">
/**
 * The filters applied to a list, as removable chips in one row that scrolls sideways, then
 * Clear all. Nothing shows while no filter is applied.
 */
import FilterChip from '@/shared/components/FilterChip.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

defineProps<{ chips: { id: string; label: string }[] }>()
const emit = defineEmits<{ remove: [id: string]; clear: [] }>()

const { t } = useTypedT()
</script>

<template>
  <div v-if="chips.length" data-test="applied-filters" class="flex items-center gap-2 overflow-x-auto">
    <FilterChip v-for="chip in chips" :key="chip.id" :label="chip.label" @remove="emit('remove', chip.id)" />
    <button
      type="button"
      data-test="clear-all-filters"
      class="shrink-0 px-2 text-sm font-semibold text-accent-text hover:underline"
      @click="emit('clear')"
    >{{ t('filters.clearAll') }}</button>
  </div>
</template>
