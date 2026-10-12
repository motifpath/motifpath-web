<script setup lang="ts">
/**
 * A course or a path in Discover: a 16:9 thumbnail, "level · language", the title, the teacher and
 * the size. The whole card opens the detail; there is no button on it. A badge on the thumbnail
 * says when the student already has the item. As a row it lists; as a tile it sits in a grid.
 */
import { BookOpen, Route } from 'lucide-vue-next'
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import type { CatalogBadge, CatalogItem } from '@/features/student/utils/catalogItem'
import ThumbnailImage from '@/shared/components/ThumbnailImage.vue'
import { useInstrumentNames } from '@/shared/composables/useInstrumentNames'
import { useTypedT } from '@/shared/composables/useTypedT'
import { languageLabelKey } from '@/shared/utils/languageLabels'

const props = defineProps<{
  item: CatalogItem
  badge: CatalogBadge | null
  layout: 'row' | 'tile'
  to: RouteLocationRaw
}>()

const { t } = useTypedT()
const { instrumentsLabel } = useInstrumentNames()

const eyebrow = computed(() => {
  const languageKey = languageLabelKey(props.item.language)
  return `${t(`levels.${props.item.level}`)} · ${languageKey ? t(languageKey) : props.item.language}`
})

const size = computed(() => {
  const parts = [instrumentsLabel(props.item.instrumentIds).split(', ').join(' · ')]
  if (props.item.partCount !== undefined) parts.push(t('catalogCard.parts', { count: props.item.partCount }))
  parts.push(t('catalogCard.lessons', { count: props.item.lessonCount }))
  return parts.join(' · ')
})

const isRow = computed(() => props.layout === 'row')
</script>

<template>
  <RouterLink
    :to="to"
    data-test="catalog-card"
    :data-layout="layout"
    class="flex overflow-hidden rounded-lg border border-border bg-surface-raised hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    :class="isRow ? 'items-start gap-3 p-3' : 'h-full flex-col'"
  >
    <span class="relative shrink-0" :class="isRow ? 'w-28' : 'w-full'">
      <ThumbnailImage
        v-if="item.thumbnailUrl"
        :url="item.thumbnailUrl"
        :size-class="isRow ? 'aspect-video w-28 rounded-md' : 'aspect-video w-full'"
      />
      <span
        v-else
        data-test="catalog-thumb-fallback"
        class="flex aspect-video items-center justify-center bg-accent-muted text-accent-text"
        :class="isRow ? 'w-28 rounded-md' : 'w-full'"
      >
        <component :is="item.kind === 'course' ? BookOpen : Route" :size="22" aria-hidden="true" />
      </span>
      <span
        v-if="badge"
        data-test="catalog-badge"
        class="absolute bottom-1 left-1 rounded-full px-1.5 text-xs font-semibold"
        :class="badge === 'finished' ? 'bg-success-muted text-success' : 'bg-surface-raised text-accent-text'"
      >
        {{ badge === 'finished' ? t('catalogCard.finished') : t('catalogCard.inLearning') }}
      </span>
    </span>
    <span class="flex min-w-0 flex-1 flex-col gap-0.5" :class="{ 'p-3': !isRow }">
      <span data-test="catalog-eyebrow" class="truncate text-xs font-semibold uppercase tracking-wide text-accent-text">
        {{ eyebrow }}
      </span>
      <span data-test="catalog-title" class="line-clamp-2 text-base font-semibold text-ink">{{ item.title }}</span>
      <span data-test="catalog-byline" class="truncate text-xs text-ink-muted">
        {{ t('courseCard.byline', { name: item.createdBy.display_name }) }}
      </span>
      <span data-test="catalog-size" class="text-xs text-ink-muted">{{ size }}</span>
    </span>
  </RouterLink>
</template>
