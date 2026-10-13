<script setup lang="ts">
/**
 * The way on from a lesson reviewed in a finished course or path: the next lesson's card, with a
 * quiet way back to the course or path; after its last lesson, a line saying so and Learning,
 * where the next course or path is, rather than the same course again.
 */
import type { RouteLocationRaw } from 'vue-router'

import type { components } from '@/api/generated/core-domain'
import AppButton from '@/shared/components/AppButton.vue'
import NextStepCard from '@/shared/components/NextStepCard.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

interface NextLessonCard {
  eyebrow: string
  title: string
  kind: components['schemas']['StudentPathItem']['content_type']
  kindLabel: string
  to: RouteLocationRaw
}

defineProps<{
  next: NextLessonCard | null
  ownerTitle: string
  back: { to: RouteLocationRaw; label: string }
}>()

const { t } = useTypedT()
</script>

<template>
  <div data-test="review-way-on" class="flex flex-col gap-4">
    <template v-if="next">
      <NextStepCard
        :eyebrow="next.eyebrow"
        :title="next.title"
        :kind="next.kind"
        :kind-label="next.kindLabel"
        :action-label="t('pathView.startLesson')"
        :to="next.to"
      />
      <AppButton variant="tertiary" :to="back.to" data-test="back-to-owner" block>
        {{ back.label }}
      </AppButton>
    </template>
    <template v-else>
      <p data-test="last-lesson" class="text-sm text-ink-muted">
        {{ t('nodeView.review.lastLesson', { title: ownerTitle }) }}
      </p>
      <PrimaryButton as="RouterLink" :to="{ name: 'my-courses' }" data-test="go-to-learning" class="w-full">
        {{ t('nodeView.review.goToLearning') }}
      </PrimaryButton>
    </template>
  </div>
</template>
