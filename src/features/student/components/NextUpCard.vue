<script setup lang="ts">
/**
 * Between a play-along and the next item: what was just played and how fast, then what's next and
 * why. Play-alongs of one session can look alike, so the change is said, and the next item starts
 * only when the student continues.
 */
import type { components } from '@/api/generated/core-domain'
import { pickReasonKeys } from '@/features/student/utils/pickReason'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

type Reason = components['schemas']['PracticeSessionItem']['reason']

defineProps<{
  doneLabel: string
  fastestBpm: number
  nextLabel: string
  nextReason: Reason
}>()

const emit = defineEmits<{ continue: [] }>()

const { t } = useTypedT()
</script>

<template>
  <section class="flex flex-col gap-5" data-test="next-up" aria-live="polite">
    <p data-test="next-up-done" class="text-ink-muted">{{ t('sessionPlan.nextUp.played', { name: doneLabel, bpm: fastestBpm }) }}</p>

    <div class="flex flex-col gap-1 rounded-lg border border-border bg-surface-raised p-4">
      <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{{ t('sessionPlan.nextUp.next') }}</span>
      <h2 data-test="next-up-name" class="text-lg font-semibold">{{ nextLabel }}</h2>
      <span data-test="next-up-reason" class="self-start rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium">
        {{ t(pickReasonKeys[nextReason]) }}
      </span>
    </div>

    <PracticeActionBar>
      <PrimaryButton data-test="next-up-continue" data-primary-action class="h-12 w-full" @click="emit('continue')">
        {{ t('sessionPlan.nextUp.continue') }}
      </PrimaryButton>
    </PracticeActionBar>
  </section>
</template>
