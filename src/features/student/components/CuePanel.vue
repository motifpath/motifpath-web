<script setup lang="ts">
/**
 * One timed cue of a lesson: an image, a GIF or a piece of rich text, with an
 * optional caption. It has no heading or frame of its own — it is shown
 * beside or below the video and should read as part of the lesson, not as a
 * separate panel.
 *
 * An image address that is not an absolute http(s) URL is never loaded, and a
 * cue with nothing safe to show renders nothing rather than an empty panel.
 */
import { computed } from 'vue'

import PromptRenderer from '@/shared/components/PromptRenderer.vue'
import { isHttpUrl } from '@/shared/utils/httpUrl'
import type { components } from '@/api/generated/core-domain'

type ExpandedContent = components['schemas']['ExpandedContent']

const props = defineProps<{ cue: ExpandedContent }>()

const imageUrl = computed(() => {
  const isPicture = props.cue.content_type === 'image' || props.cue.content_type === 'gif'
  const url = props.cue.media_url
  return isPicture && url !== undefined && isHttpUrl(url) ? url : null
})

const richContent = computed(() =>
  props.cue.content_type === 'rich_text' ? (props.cue.rich_content ?? null) : null,
)
</script>

<template>
  <figure v-if="imageUrl || richContent" data-test="cue" class="flex max-h-full flex-col gap-2">
    <!-- Decorative: the caption, when there is one, already says what it shows. -->
    <img v-if="imageUrl" :src="imageUrl" alt="" class="w-full rounded-lg object-contain" />
    <div v-else-if="richContent" class="text-ink">
      <PromptRenderer :document="richContent" />
    </div>
    <figcaption v-if="cue.caption" class="text-sm text-ink-muted">{{ cue.caption }}</figcaption>
  </figure>
</template>
