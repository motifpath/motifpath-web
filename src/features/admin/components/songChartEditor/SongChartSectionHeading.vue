<script setup lang="ts">
/**
 * A section's heading in the song chart editor: its name, the progressions it's tagged with as
 * chips (× removes one), and + Progression to tag it with another. A tag the last save found the
 * section doesn't play is marked, and why sits under the heading.
 */
import { X } from 'lucide-vue-next'

import type { components } from '@/api/generated/core-domain'
import { useProgressionNames } from '@/shared/composables/useProgressionNames'
import { useTypedT } from '@/shared/composables/useTypedT'

type SectionAttrs = components['schemas']['SongChartSection']['attrs']

const props = defineProps<{
  section: SectionAttrs
  /** The section's tags it doesn't play, as of the last save. */
  unplayed: string[]
  /** The song's key as of the last save, which is the key its tags were checked in. */
  concertKey: string | null
}>()
const emit = defineEmits<{ remove: [key: string]; add: [anchor: HTMLElement] }>()

const { t } = useTypedT()
const { nameOf } = useProgressionNames()

function notPlayed(key: string): string {
  const where = t(`songChartEditor.inThisSection.${props.section.kind}`)
  const progression = nameOf(key)
  const songKey = props.concertKey?.trim() ?? ''
  if (!songKey) return t('songChartEditor.notPlayed.noKey', { where })
  // Progressions are spelled in a major key: a minor key plays none of them.
  if (songKey.endsWith('m')) return t('songChartEditor.notPlayed.minorKey', { where, key: songKey })
  return t('songChartEditor.notPlayed.majorKey', { where, progression, key: songKey })
}

function onAdd(event: MouseEvent) {
  if (event.currentTarget instanceof HTMLElement) emit('add', event.currentTarget)
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="flex flex-wrap items-center gap-2">
      <span data-test="section-name" class="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
        {{ section.label ?? t(`songChart.sectionKind.${section.kind}`) }}
      </span>
      <span
        v-for="key in section.progression_keys ?? []"
        :key="key"
        data-test="progression-chip"
        :data-unplayed="String(unplayed.includes(key))"
        class="inline-flex h-7 items-center gap-1 rounded-full pl-2.5 pr-1 text-xs font-semibold"
        :class="unplayed.includes(key) ? 'bg-warning-muted text-warning' : 'bg-surface-sunken text-ink-muted'"
      >
        {{ nameOf(key) }}
        <button
          type="button"
          data-test="remove-progression"
          class="flex size-6 items-center justify-center rounded-full hover:bg-surface"
          :aria-label="t('songChartEditor.removeProgression', { progression: nameOf(key) })"
          @click="emit('remove', key)"
        >
          <X :size="12" aria-hidden="true" />
        </button>
      </span>
      <button type="button" data-test="add-progression" class="h-7 rounded-full px-1 text-sm font-semibold text-accent-text hover:underline" @click="onAdd">
        {{ t('songChartEditor.addProgression') }}
      </button>
    </div>
    <p v-for="key in unplayed" :key="key" data-test="not-played" class="text-xs text-ink-muted">{{ notPlayed(key) }}</p>
  </div>
</template>
