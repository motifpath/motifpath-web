<script setup lang="ts">
/**
 * A song chart's sections as written, each headed by its label (or its kind) and the progressions
 * it plays, with each chord over the word it falls on. Lines wrap between words, so a chord never
 * leaves its word. A chord that has something to show is a button; the one shown is pressed.
 */
import type { components } from '@/api/generated/core-domain'
import ProgressionChips from '@/shared/components/songChart/ProgressionChips.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { lineSegments } from '@/shared/utils/songChartReading'

type SongChartBody = components['schemas']['LearnerSongChart']['body']
type Anchor = components['schemas']['SongChartChordAnchor']['attrs']

withDefaults(
  defineProps<{
    body: SongChartBody
    /** Whether a chord can be tapped; none can by default. */
    isTappable?: (anchor: Anchor) => boolean
    /** The chord whose card is showing. */
    selectedAnchorId?: string | null
  }>(),
  { isTappable: () => false, selectedAnchorId: null },
)
const emit = defineEmits<{ tap: [anchor: Anchor] }>()

const { t } = useTypedT()
</script>

<template>
  <section v-for="(section, sectionIndex) in body.content" :key="sectionIndex" class="flex flex-col gap-1">
    <div data-test="section-header" class="flex flex-wrap items-center gap-2">
      <h2 data-test="section-heading" class="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
        {{ section.attrs.label ?? t(`songChart.sectionKind.${section.attrs.kind}`) }}
      </h2>
      <ProgressionChips v-if="section.attrs.progression_keys?.length" :keys="section.attrs.progression_keys" />
    </div>

    <template v-for="(line, lineIndex) in section.content" :key="lineIndex">
      <p v-if="line.type === 'comment'" class="text-sm italic text-ink-muted">
        {{ line.content.map((c) => c.text).join('') }}
      </p>
      <p v-else class="flex flex-wrap items-end gap-y-1 text-base text-ink">
        <span
          v-for="(segment, i) in lineSegments(line)"
          :key="i"
          :data-test="segment.anchor ? 'chord-segment' : undefined"
          class="inline-flex flex-col whitespace-pre"
        >
          <template v-if="segment.anchor">
            <button
              v-if="isTappable(segment.anchor)"
              type="button"
              data-test="chord-symbol"
              :aria-pressed="selectedAnchorId === segment.anchor.anchorId"
              class="h-6 self-start rounded-md px-[3px] text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              :class="selectedAnchorId === segment.anchor.anchorId ? 'bg-accent text-accent-fg' : 'text-accent-text'"
              @click="emit('tap', segment.anchor)"
            >
              {{ segment.anchor.writtenSymbol }}
            </button>
            <span v-else data-test="chord-symbol" class="h-6 self-start px-[3px] text-sm font-semibold text-ink-muted">
              {{ segment.anchor.writtenSymbol }}
            </span>
          </template>
          <span v-else class="h-6" aria-hidden="true" />
          <span data-test="chord-word" class="leading-6">{{ segment.text }}</span>
        </span>
      </p>
    </template>
  </section>
</template>
