<script lang="ts">
export interface PathBuilderItem {
  content_node_id: string
  title: string
  content_type: 'video' | 'article' | 'diagram'
  section_label?: string
}
</script>

<script setup lang="ts">
import { ArrowDown, ArrowUp, X } from 'lucide-vue-next'
import { computed } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{ items: PathBuilderItem[] }>()
const emit = defineEmits<{
  reorder: [fromIndex: number, toIndex: number]
  relabel: [index: number, sectionLabel: string]
  remove: [index: number]
}>()

const { t } = useTypedT()

interface PathSection {
  label: string | undefined
  entries: { item: PathBuilderItem; index: number }[]
}

// Consecutive items sharing the same section_label (including consecutive
// unlabeled items) belong to the same visual group -- there is no separate
// section entity, just a label string carried on each item.
const sections = computed<PathSection[]>(() => {
  const groups: PathSection[] = []
  props.items.forEach((item, index) => {
    const previous = groups[groups.length - 1]
    if (previous && previous.label === item.section_label) {
      previous.entries.push({ item, index })
    } else {
      groups.push({ label: item.section_label, entries: [{ item, index }] })
    }
  })
  return groups
})

function moveUp(index: number) {
  if (index === 0) return
  emit('reorder', index, index - 1)
}

function moveDown(index: number) {
  if (index === props.items.length - 1) return
  emit('reorder', index, index + 1)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <p v-if="items.length === 0" data-test="path-empty" class="text-sm text-ink-subtle">
      {{ t('sectionedPathList.emptyMessage') }}
    </p>

    <div
      v-for="(section, sectionIndex) in sections"
      :key="sectionIndex"
      data-test="path-section"
      class="flex flex-col gap-2"
    >
      <span class="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {{ section.label || t('sectionedPathList.noSection') }}
      </span>

      <div
        v-for="{ item, index } in section.entries"
        :key="item.content_node_id"
        data-test="path-item"
        class="flex items-center gap-3 rounded-md border border-border bg-surface-sunken px-3 py-2.5"
      >
        <div class="flex flex-1 flex-col gap-1">
          <span class="text-sm font-semibold text-ink">{{ item.title }}</span>
          <span class="text-xs text-ink-subtle">{{ t(`common.contentTypes.${item.content_type}`) }}</span>
        </div>

        <input
          type="text"
          data-test="section-label-input"
          :placeholder="t('sectionedPathList.sectionPlaceholder')"
          class="w-32 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-xs"
          :value="item.section_label ?? ''"
          @change="emit('relabel', index, ($event.target as HTMLInputElement).value)"
        />

        <button
          type="button"
          data-test="move-up"
          :aria-label="t('sectionedPathList.moveUpAriaLabel')"
          :disabled="index === 0"
          class="flex h-[26px] w-[26px] items-center justify-center rounded-sm border border-border bg-surface-raised text-ink-subtle disabled:cursor-not-allowed disabled:opacity-40"
          @click="moveUp(index)"
        >
          <ArrowUp :size="13" aria-hidden="true" />
        </button>

        <button
          type="button"
          data-test="move-down"
          :aria-label="t('sectionedPathList.moveDownAriaLabel')"
          :disabled="index === items.length - 1"
          class="flex h-[26px] w-[26px] items-center justify-center rounded-sm border border-border bg-surface-raised text-ink-subtle disabled:cursor-not-allowed disabled:opacity-40"
          @click="moveDown(index)"
        >
          <ArrowDown :size="13" aria-hidden="true" />
        </button>

        <button
          type="button"
          data-test="remove-item"
          :aria-label="t('sectionedPathList.removeAriaLabel')"
          class="flex h-[26px] w-[26px] items-center justify-center rounded-sm text-ink-subtle"
          @click="emit('remove', index)"
        >
          <X :size="14" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>
