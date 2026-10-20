<script setup lang="ts">
/**
 * A Teach list's count line and its sort. The count is the section's total while nothing
 * narrows the list, and how many match out of it once a search, a filter or a status chip does
 * ("46 of 1,284 diagrams"). The sort opens a short choice: Name A–Z or Recently changed.
 */
import { Check, ChevronDown } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import type { AuthoringSection, AuthoringSort } from '@/features/teacher/utils/authoringListQuery'
import OverlayPanel from '@/shared/components/OverlayPanel.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{
  section: AuthoringSection
  /** How many items match the list as it is. */
  shown: number
  /** How many the section has with nothing chosen; null while unknown. */
  sectionTotal: number | null
  /** Whether a search, a filter or a status chip narrows the list. */
  narrowed: boolean
  sort: AuthoringSort
}>()
const emit = defineEmits<{ 'update:sort': [sort: AuthoringSort] }>()

const { t, locale } = useTypedT()

const format = (n: number) => new Intl.NumberFormat(locale.value).format(n)

const countLine = computed(() => {
  if (props.narrowed && props.sectionTotal !== null) {
    return t(`authoringList.countOf.${props.section}`, {
      count: props.sectionTotal,
      shown: format(props.shown),
      total: format(props.sectionTotal),
    })
  }
  return t(`authoringList.count.${props.section}`, { count: props.shown, shown: format(props.shown) })
})

const SORTS: { value: AuthoringSort; label: 'authoringList.sort.byTitle' | 'authoringList.sort.byUpdated' }[] = [
  { value: 'title', label: 'authoringList.sort.byTitle' },
  { value: 'updated', label: 'authoringList.sort.byUpdated' },
]
const currentLabel = computed(() => t(SORTS.find((option) => option.value === props.sort)!.label))

const isOpen = ref(false)

function choose(sort: AuthoringSort) {
  isOpen.value = false
  if (sort !== props.sort) emit('update:sort', sort)
}
</script>

<template>
  <div class="flex items-center justify-between gap-3">
    <p data-test="list-count" class="text-xs font-medium text-ink-muted">{{ countLine }}</p>
    <button
      type="button"
      data-test="sort-button"
      class="inline-flex min-h-12 items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink"
      :aria-label="t('authoringList.sort.buttonAriaLabel', { sort: currentLabel })"
      @click="isOpen = true"
    >
      {{ currentLabel }}
      <ChevronDown :size="14" aria-hidden="true" />
    </button>

    <OverlayPanel :open="isOpen" :title="t('authoringList.sort.title')" @close="isOpen = false">
      <div role="radiogroup" :aria-label="t('authoringList.sort.title')" class="-mx-5 flex flex-col">
        <button
          v-for="option in SORTS"
          :key="option.value"
          type="button"
          role="radio"
          data-test="sort-option"
          :aria-checked="option.value === sort ? 'true' : 'false'"
          class="flex min-h-12 items-center gap-3 px-5 text-left text-base text-ink hover:bg-surface-sunken focus-visible:bg-surface-sunken focus-visible:outline-none"
          @click="choose(option.value)"
        >
          <Check :size="20" :class="option.value === sort ? 'text-accent-text' : 'invisible'" aria-hidden="true" />
          {{ t(option.label) }}
        </button>
      </div>
    </OverlayPanel>
  </div>
</template>
