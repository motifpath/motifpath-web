<script setup lang="ts">
import type { components } from '@/api/generated/core-domain'
import { usePublishedCourse } from '@/features/teacher/composables/useCourseAuthoring'
import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

type OutlineItem = components['schemas']['CourseOutlineItem']

const props = defineProps<{ courseId: string }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useTypedT()
const { outline, isLoading, error, retry } = usePublishedCourse(props.courseId)

interface OutlineSection {
  label: string | undefined
  items: OutlineItem[]
}

// Consecutive items with the same section label form one section, as they
// do on the learner's own path.
function sectionsOf(items: OutlineItem[]): OutlineSection[] {
  const sections: OutlineSection[] = []
  for (const item of items) {
    const last = sections[sections.length - 1]
    if (last && last.label === item.section_label) last.items.push(item)
    else sections.push({ label: item.section_label, items: [item] })
  }
  return sections
}
</script>

<template>
  <ModalOverlay
    :open="true"
    panel-class="flex max-h-[85vh] w-[min(560px,calc(100vw-32px))] flex-col gap-4 overflow-y-auto rounded-xl bg-surface-raised p-5 shadow-level2"
    @close="emit('close')"
  >
    <div class="flex items-center justify-between">
      <span class="text-base font-bold">{{ t('publishedCourseModal.title') }}</span>
      <ModalCloseButton @close="emit('close')" />
    </div>

    <StateLoading v-if="isLoading" :noun="t('publishedCourseModal.loadingNoun')" />
    <StateError v-else-if="error || !outline" :message="t('publishedCourseModal.errorMessage')" @retry="retry" />

    <template v-else>
      <div class="flex flex-col gap-1">
        <h2 class="text-lg font-bold text-ink">{{ outline.title }}</h2>
        <p class="text-sm text-ink-muted">{{ outline.summary }}</p>
      </div>
      <ol class="flex flex-col gap-3">
        <li
          v-for="checkpoint in outline.checkpoints"
          :key="checkpoint.position"
          data-test="outline-checkpoint"
          class="flex flex-col gap-2 rounded-md border border-border bg-surface-sunken p-3"
        >
          <span class="text-sm font-semibold text-ink">{{ checkpoint.title }}</span>
          <div
            v-for="(section, index) in sectionsOf(checkpoint.items)"
            :key="index"
            data-test="outline-section"
            class="flex flex-col gap-1"
          >
            <span v-if="section.label" class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
              {{ section.label }}
            </span>
            <ul class="flex flex-col gap-0.5">
              <li v-for="(item, itemIndex) in section.items" :key="itemIndex" class="text-sm text-ink-muted">
                {{ item.title }}
              </li>
            </ul>
          </div>
        </li>
      </ol>
    </template>
  </ModalOverlay>
</template>
