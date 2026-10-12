<script setup lang="ts">
import type { components } from '@/api/generated/core-domain'
import ThumbnailImage from '@/shared/components/ThumbnailImage.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { languageBadge } from '@/shared/utils/languageLabels'

type CourseDetail = components['schemas']['CourseDetail']

/** A published course as a learner sees it before enrolling; the action (enroll, continue) is the page's. */
defineProps<{ course: CourseDetail }>()

const { t } = useTypedT()
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
      <div class="flex flex-col gap-4">
        <ThumbnailImage :url="course.thumbnail_url" fit="contain" size-class="aspect-video h-auto w-full rounded-lg" />
        <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-muted">
          <span class="rounded-full bg-surface-sunken px-2.5 py-0.5">
            {{ languageBadge(course.language).flag }} {{ languageBadge(course.language).shortCode }}
          </span>
          <span class="rounded-full bg-surface-sunken px-2.5 py-0.5">
            {{ t(`levels.${course.level}`) }}
          </span>
        </div>
        <div>
          <h1 data-test="course-detail-title" class="text-2xl font-semibold text-ink sm:text-3xl">{{ course.title }}</h1>
          <p v-if="course.created_by" data-test="course-detail-byline" class="mt-2 text-sm text-ink-subtle">
            {{ t('courseCard.byline', { name: course.created_by.display_name }) }}
          </p>
        </div>
        <p class="text-base text-ink-muted">{{ course.summary }}</p>
        <div class="flex flex-wrap gap-3 text-sm text-ink-subtle">
          <span v-if="course.lesson_count !== undefined" data-test="course-detail-lessons">
            {{ t('courseCard.lessons', { count: course.lesson_count }) }}
          </span>
          <span v-if="course.checkpoint_count !== undefined" data-test="course-detail-checkpoints">
            {{ t('courseCard.learningPaths', { count: course.checkpoint_count }) }}
          </span>
        </div>
      </div>

      <aside class="flex h-fit flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4">
        <slot name="action" />
      </aside>
    </div>

    <div v-if="course.checkpoints.length" class="flex flex-col gap-3">
      <h2 class="text-xl font-semibold text-ink">{{ t('courseDetailContent.outlineHeading') }}</h2>
      <ol class="flex flex-col gap-3">
        <li
          v-for="checkpoint in course.checkpoints"
          :key="checkpoint.position"
          class="rounded-lg border border-border bg-surface-raised p-4"
        >
          <h3 class="font-semibold text-ink">
            {{ t('courseDetailContent.learningPath', { position: checkpoint.position }) }} · {{ checkpoint.title }}
          </h3>
          <ul v-if="checkpoint.items.length" class="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
            <!-- Outline items carry no id and titles can repeat, so their order is their identity. -->
            <li v-for="(item, index) in checkpoint.items" :key="index">{{ item.title }}</li>
          </ul>
        </li>
      </ol>
    </div>
  </div>
</template>
