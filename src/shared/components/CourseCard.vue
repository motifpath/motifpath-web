<script setup lang="ts">
import type { components } from '@/api/generated/core-domain'
import ThumbnailImage from '@/shared/components/ThumbnailImage.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { languageBadge } from '@/shared/utils/languageLabels'

type CourseLevel = components['schemas']['CourseCatalogEntry']['level']
type UserRef = components['schemas']['UserRef']

defineProps<{
  title: string
  summary: string
  createdBy: UserRef
  level: CourseLevel
  checkpointCount: number
  lessonCount?: number
  language?: string
  thumbnailUrl?: string
}>()

const { t } = useTypedT()
</script>

<template>
  <article
    data-test="course-card"
    class="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface-raised shadow-sm"
  >
    <ThumbnailImage
      :url="thumbnailUrl"
      size-class="aspect-video h-auto w-full rounded-none"
    />
    <div class="flex flex-1 flex-col gap-3 p-4">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div class="min-w-0">
          <span
            data-test="course-card-label"
            class="text-xs font-semibold uppercase tracking-wide text-ink-subtle"
          >
            {{ t('courseCard.label') }}
          </span>
          <h2 class="mt-1 text-lg font-semibold text-ink">{{ title }}</h2>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-muted">
          <span
            v-if="language"
            data-test="course-language"
            class="rounded-full bg-surface-sunken px-2.5 py-0.5"
          >
            {{ languageBadge(language).flag }} {{ languageBadge(language).shortCode }}
          </span>
          <span data-test="course-level" class="rounded-full bg-surface-sunken px-2.5 py-0.5">
            {{ t(`levels.${level}`) }}
          </span>
          <slot name="badges" />
        </div>
      </div>

      <p data-test="course-summary" class="line-clamp-2 text-sm text-ink-muted">{{ summary }}</p>
      <p data-test="course-byline" class="text-sm text-ink-subtle">
        {{ t('courseCard.byline', { name: createdBy.display_name }) }}
      </p>
      <div class="flex flex-wrap gap-2 text-sm text-ink-subtle">
        <span v-if="lessonCount !== undefined" data-test="course-lessons">
          {{ t('courseCard.lessons', { count: lessonCount }) }}
        </span>
        <span data-test="course-checkpoints">
          {{ t('courseCard.checkpoints', { count: checkpointCount }) }}
        </span>
      </div>
      <slot name="supporting" />
      <div data-test="course-card-actions" class="mt-auto flex flex-wrap items-center gap-3 pt-1">
        <slot name="actions" />
      </div>
    </div>
  </article>
</template>
