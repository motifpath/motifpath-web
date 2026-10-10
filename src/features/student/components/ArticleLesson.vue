<script setup lang="ts">
/**
 * An article lesson's text in one readable column, with its diagrams, song charts and pictures in
 * it. Each paragraph cue sits under its paragraph and stays there, so nothing appears or disappears
 * while the student reads. A diagram that fails to load says so where it would be, with Try again,
 * and the rest of the text still reads.
 */
import { computed } from 'vue'

import CuePanel from '@/features/student/components/CuePanel.vue'
import { articleSections } from '@/features/student/utils/articleSections'
import PromptRenderer from '@/shared/components/PromptRenderer.vue'
import type { components } from '@/api/generated/core-domain'

type ExpandedContent = components['schemas']['ExpandedContent']
type PromptDocument = components['schemas']['PromptDocument']

const props = defineProps<{ document: PromptDocument; cues: ExpandedContent[] }>()

const sections = computed(() => articleSections(props.document, props.cues))
</script>

<template>
  <div data-test="article" class="flex max-w-prose flex-col gap-4 text-ink">
    <template v-for="(section, index) in sections" :key="index">
      <PromptRenderer v-if="section.document.content.length > 0" :document="section.document" retryable-diagrams />
      <div
        v-for="cue in section.cues"
        :key="cue.expanded_content_id"
        data-test="paragraph-cue"
        class="rounded-lg bg-surface-sunken p-3 empty:hidden"
      >
        <CuePanel :cue="cue" />
      </div>
    </template>
  </div>
</template>
