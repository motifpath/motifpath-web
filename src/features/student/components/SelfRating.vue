<script setup lang="ts">
/**
 * How a play-along take went, asked in the action bar once the take ends: the rating is the commit,
 * so one tap (or key 1–3) sends it. Restart without rating throws the take away instead.
 */
import { onBeforeUnmount, onMounted } from 'vue'
import { RotateCcw } from 'lucide-vue-next'

import type { TakeRating } from '@/features/student/utils/tempoLadder'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

defineProps<{
  /** The tempo the take was played at. */
  bpm: number
}>()

const emit = defineEmits<{ rate: [rating: TakeRating]; restart: [] }>()

const { t } = useTypedT()

const ratings = [
  {
    rating: 'struggled',
    label: 'playAlongTake.ratings.struggled',
    hint: 'playAlongTake.ratingHints.struggled',
    tone: 'border-danger bg-danger-muted',
  },
  {
    rating: 'almost',
    label: 'playAlongTake.ratings.almost',
    hint: 'playAlongTake.ratingHints.almost',
    tone: 'border-warning bg-warning-muted',
  },
  {
    rating: 'clean',
    label: 'playAlongTake.ratings.clean',
    hint: 'playAlongTake.ratingHints.clean',
    tone: 'border-success bg-success-muted',
  },
] as const satisfies readonly { rating: TakeRating; label: string; hint: string; tone: string }[]

function onKeydown(event: KeyboardEvent) {
  if (event.defaultPrevented || !/^[1-9]$/.test(event.key)) return
  const option = ratings[Number(event.key) - 1]
  if (option) emit('rate', option.rating)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="flex flex-col items-start gap-3" data-test="self-rating">
    <button
      type="button"
      data-test="restart-take"
      class="flex min-h-12 items-center gap-1.5 font-medium text-accent-text"
      @click="emit('restart')"
    >
      <RotateCcw :size="16" aria-hidden="true" />
      {{ t('playAlongTake.restartUnrated') }}
    </button>

    <PracticeActionBar>
      <div class="flex w-full flex-col gap-3">
        <p data-test="rate-prompt" class="font-medium">{{ t('playAlongTake.ratePrompt', { bpm }) }}</p>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="(option, index) in ratings"
            :key="option.rating"
            type="button"
            :data-test="`rate-${option.rating}`"
            :aria-keyshortcuts="String(index + 1)"
            class="flex min-h-12 flex-col items-center rounded-lg border p-3 text-ink"
            :class="option.tone"
            @click="emit('rate', option.rating)"
          >
            <span class="text-base font-semibold">{{ t(option.label) }}</span>
            <span class="text-center text-xs text-ink-muted">{{ t(option.hint) }}</span>
          </button>
        </div>
      </div>
    </PracticeActionBar>
  </div>
</template>
