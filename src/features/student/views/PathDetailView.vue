<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { useCatalogPath } from '@/features/student/composables/useCatalogPath'
import { useEnrollInLearningPath } from '@/features/student/composables/useEnrollInLearningPath'
import { useMyStandalonePaths } from '@/features/student/composables/useMyStandalonePaths'
import { groupPathSections } from '@/features/student/utils/groupPathSections'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateEmpty from '@/shared/components/StateEmpty.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import ThumbnailImage from '@/shared/components/ThumbnailImage.vue'
import { useInstrumentNames } from '@/shared/composables/useInstrumentNames'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'
import { languageBadge } from '@/shared/utils/languageLabels'

const route = useRoute()
const router = useRouter()
const { t } = useTypedT()
const toast = useToast()
const { instrumentsLabel } = useInstrumentNames()
const learningPathId = String(route.params.learningPathId)
const { path, isLoading, error, notFound, retry } = useCatalogPath(learningPathId)
const held = useMyStandalonePaths()
const { enrollInLearningPath } = useEnrollInLearningPath()

const backToCatalog = computed(() =>
  route.query.fromCatalog === 'true'
    ? { name: 'path-catalog', query: { returnFromPath: learningPathId } }
    : { name: 'path-catalog' },
)

// Enrolling in a path the learner already holds reopens their copy, so the
// same action continues it.
const alreadyHeld = computed(() =>
  held.paths.value.some((p) => !p.archived_at && p.source_template_id === learningPathId),
)
const sections = computed(() => groupPathSections(path.value?.items ?? []))

const enrolling = ref(false)

// Enrolling always makes the path the learner's current one, so they land on it.
async function enroll() {
  if (!path.value) return
  const wasHeld = alreadyHeld.value
  enrolling.value = true
  try {
    await enrollInLearningPath(learningPathId)
    if (!wasHeld) toast.success(t('pathDetailView.enrolledToast', { title: path.value.title }))
    await router.push({ name: 'path' })
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
  } finally {
    enrolling.value = false
  }
}
</script>

<template>
  <section class="flex flex-col gap-6">
    <div data-test="back-to-catalog" class="w-fit">
      <RouterLink :to="backToCatalog" class="text-sm font-semibold text-accent-text underline">
        {{ t('pathDetailView.backToCatalog') }}
      </RouterLink>
    </div>

    <StateLoading v-if="isLoading" data-test="loading" :noun="t('pathDetailView.loadingNoun')" />

    <StateEmpty
      v-else-if="notFound"
      data-test="not-found"
      :heading="t('pathDetailView.notFoundHeading')"
      :message="t('pathDetailView.notFoundMessage')"
    >
      <template #action>
        <RouterLink :to="{ name: 'path-catalog' }" class="text-sm font-semibold text-accent-text underline">
          {{ t('nav.findPath') }}
        </RouterLink>
      </template>
    </StateEmpty>

    <StateError v-else-if="error" data-test="error" :message="t('pathDetailView.errorMessage')" @retry="retry" />

    <template v-else-if="path">
      <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <div class="flex flex-col gap-4">
          <ThumbnailImage :url="path.thumbnail_url" size-class="aspect-video h-auto w-full rounded-lg" />
          <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-muted">
            <span class="rounded-full bg-surface-sunken px-2.5 py-0.5">
              {{ languageBadge(path.language).flag }} {{ languageBadge(path.language).shortCode }}
            </span>
            <span class="rounded-full bg-surface-sunken px-2.5 py-0.5">
              {{ t(`levels.${path.level}`) }}
            </span>
            <span class="rounded-full bg-surface-sunken px-2.5 py-0.5">
              {{ instrumentsLabel(path.instrument_ids) }}
            </span>
          </div>
          <div>
            <h1 data-test="path-detail-title" class="text-2xl font-semibold text-ink sm:text-3xl">{{ path.title }}</h1>
            <p data-test="path-detail-byline" class="mt-2 text-sm text-ink-subtle">
              {{ t('courseCard.byline', { name: path.created_by.display_name }) }}
            </p>
          </div>
          <p class="text-base text-ink-muted">{{ path.summary }}</p>
          <p data-test="path-detail-lessons" class="text-sm text-ink-subtle">
            {{ t('courseCard.lessons', { count: path.lesson_count }) }}
          </p>
        </div>

        <aside class="flex h-fit flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4">
          <PrimaryButton data-test="enroll" :disabled="enrolling" @click="enroll">
            {{
              enrolling
                ? t('pathDetailView.enrolling')
                : alreadyHeld
                  ? t('pathDetailView.continue')
                  : t('pathDetailView.enroll')
            }}
          </PrimaryButton>
        </aside>
      </div>

      <div v-if="sections.length" class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold text-ink">{{ t('pathDetailView.outlineHeading') }}</h2>
        <!-- Outline items carry no id and titles can repeat, so their order is their identity. -->
        <div
          v-for="(section, sectionIndex) in sections"
          :key="sectionIndex"
          data-test="outline-section"
          class="rounded-lg border border-border bg-surface-raised p-4"
        >
          <h3 v-if="section.label" class="font-semibold text-ink">{{ section.label }}</h3>
          <ul class="list-disc space-y-1 pl-5 text-sm text-ink-muted" :class="{ 'mt-2': section.label }">
            <li v-for="(item, index) in section.items" :key="index">{{ item.title }}</li>
          </ul>
        </div>
      </div>
    </template>
  </section>
</template>
