<script setup lang="ts">
/**
 * One row of Learning: a course or a path, recognised by its picture first. The whole row is the
 * action; ⋯ holds the rest. It never carries a button of its own.
 */
import { BookOpen, Ellipsis, Route } from 'lucide-vue-next'
import { computed } from 'vue'

import type { LearningItem } from '@/features/student/utils/learning'
import ProgressMeter from '@/shared/components/ProgressMeter.vue'
import ThumbnailImage from '@/shared/components/ThumbnailImage.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{ item: LearningItem }>()
const emit = defineEmits<{ open: []; more: [trigger: HTMLElement] }>()

const { t } = useTypedT()

const eyebrow = computed(() => {
  const { item } = props
  const kind = item.kind === 'course' ? t('learningCard.course') : t('learningCard.path')
  if (item.state === 'finished') return `${kind} · ${t('learningCard.finished')}`
  if (item.state === 'left') return kind
  if (item.part) return `${kind} · ${t('learningCard.part', item.part)}`
  if (item.assignedBy) return `${kind} · ${t('learningCard.assignedBy', { name: item.assignedBy })}`
  return kind
})

const progressLabels = computed(() => {
  const progress = props.item.progress
  if (!progress) return null
  const named = { completed: progress.completed, count: progress.total }
  return progress.unit === 'parts'
    ? { label: t('learningCard.parts', named), summary: t('learningCard.partsSummary', named) }
    : { label: t('learningCard.lessons', named), summary: t('learningCard.lessonsSummary', named) }
})

function onMore(event: MouseEvent) {
  if (event.currentTarget instanceof HTMLElement) emit('more', event.currentTarget)
}
</script>

<template>
  <div
    data-test="learning-card"
    :data-state="item.state"
    class="flex items-start rounded-lg bg-surface-raised"
    :class="item.state === 'current' ? 'border-2 border-accent' : 'border border-border'"
  >
    <button
      type="button"
      data-test="learning-row"
      class="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      @click="emit('open')"
    >
      <span class="relative shrink-0">
        <ThumbnailImage v-if="item.thumbnailUrl" :url="item.thumbnailUrl" size-class="aspect-video w-24 rounded-md" />
        <span
          v-else
          data-test="learning-thumb-fallback"
          class="flex aspect-video w-24 items-center justify-center rounded-md bg-accent-muted text-accent-text"
        >
          <component :is="item.kind === 'course' ? BookOpen : Route" :size="22" aria-hidden="true" />
        </span>
        <span
          v-if="item.state === 'current'"
          data-test="learning-current"
          class="absolute bottom-1 left-1 rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-fg"
        >
          {{ t('learningCard.current') }}
        </span>
      </span>
      <span class="flex min-w-0 flex-1 flex-col gap-1">
        <span data-test="learning-eyebrow" class="truncate text-xs font-semibold text-ink-muted">{{ eyebrow }}</span>
        <span data-test="learning-title" class="line-clamp-2 text-base font-semibold text-ink">{{ item.title }}</span>
        <ProgressMeter
          v-if="item.progress && progressLabels"
          :completed="item.progress.completed"
          :total="item.progress.total"
          :label="progressLabels.label"
          :summary="progressLabels.summary"
          :tone="item.state === 'finished' ? 'success' : 'accent'"
        />
        <span v-else-if="item.state === 'left'" class="text-sm text-ink-muted">
          {{ item.kind === 'course' ? t('learningCard.startAgainCourse') : t('learningCard.startAgainPath') }}
        </span>
      </span>
    </button>
    <button
      type="button"
      data-test="learning-more"
      :aria-label="t('learningCard.more', { title: item.title })"
      aria-haspopup="dialog"
      class="m-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      @click="onMore"
    >
      <Ellipsis :size="20" aria-hidden="true" />
    </button>
  </div>
</template>
