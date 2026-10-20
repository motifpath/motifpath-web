<script setup lang="ts">
/**
 * A sound to choose among others. Its play button only plays: listening is not answering, so
 * playing never chooses it. Tapping the rest of the row does. Once the answer is in, it takes no
 * more choices but can still be played, to hear the difference.
 */
import { CircleCheck, CircleX, Play } from 'lucide-vue-next'
import { computed } from 'vue'

import { useTypedT } from '@/shared/composables/useTypedT'
import { isSettled, OPTION_STATE_CLASSES } from '@/shared/utils/optionState'
import type { OptionState } from '@/shared/utils/optionState'

const props = withDefaults(defineProps<{ label: string; state?: OptionState; playing?: boolean }>(), { state: 'default', playing: false })

const emit = defineEmits<{ select: []; play: [] }>()

const { t } = useTypedT()

/** A waveform's bars; the first ones light up while the clip plays. */
const BARS = ['h-[8px]', 'h-[14px]', 'h-[20px]', 'h-[12px]', 'h-[18px]', 'h-[10px]', 'h-[16px]']
const LIT_BARS = 4

const settled = computed(() => isSettled(props.state))

function select() {
  if (!settled.value) emit('select')
}
</script>

<template>
  <div
    :data-state="state"
    :data-playing="playing"
    class="flex items-center gap-3 rounded-lg py-2 pl-2 pr-4"
    :class="[OPTION_STATE_CLASSES[state], settled ? 'cursor-default' : 'cursor-pointer']"
    @click="select"
  >
    <button
      type="button"
      data-test="option-play"
      class="flex size-[48px] shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      :class="playing ? 'bg-accent text-accent-fg' : 'bg-accent-muted text-accent'"
      :aria-label="t(playing ? 'audioOption.stop' : 'audioOption.play', { label })"
      @click.stop="emit('play')"
    >
      <Play :size="20" aria-hidden="true" />
    </button>
    <button
      type="button"
      data-test="option-label"
      class="min-w-0 flex-1 py-2 text-left text-base font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      :aria-pressed="state === 'selected'"
      :disabled="settled"
    >
      {{ label }}
    </button>
    <span v-if="state === 'right' || state === 'wrong'" data-test="answer-mark" :class="state === 'right' ? 'text-success' : 'text-danger'">
      <CircleCheck v-if="state === 'right'" :size="24" aria-hidden="true" />
      <CircleX v-else :size="24" aria-hidden="true" />
      <span class="sr-only">{{ state === 'right' ? t('optionTile.markRight') : t('optionTile.markWrong') }}</span>
    </span>
    <span v-else class="flex shrink-0 items-center gap-0.5" aria-hidden="true">
      <span
        v-for="(height, i) in BARS"
        :key="i"
        class="w-[3px] rounded-sm"
        :class="[height, playing && i < LIT_BARS ? 'bg-accent' : 'bg-border']"
      />
    </span>
  </div>
</template>
