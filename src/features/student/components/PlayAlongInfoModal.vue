<script setup lang="ts">
/**
 * What a play-along item is for: what is being practised and why it came up now, the skills and
 * concepts it works on, and how a take, its rating and the tempo work.
 */
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

type Diagram = components['schemas']['Diagram']
type Reason = components['schemas']['PracticeSessionItem']['reason']

const props = defineProps<{ open: boolean; reason: Reason; diagram: Diagram }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()

const whyKeys = {
  teacher_suggested: 'playAlongInfo.why.teacher_suggested',
  due: 'playAlongInfo.why.due',
  weak: 'playAlongInfo.why.weak',
  new: 'playAlongInfo.why.new',
  warm_up: 'playAlongInfo.why.warm_up',
  application: 'playAlongInfo.why.application',
  review_ahead: 'playAlongInfo.why.review_ahead',
  stretch: 'playAlongInfo.why.stretch',
} as const

// A diagram drawn for a preview may come without its classification.
const skills = computed(() => props.diagram.classification?.skills ?? [])
const concepts = computed(() => props.diagram.classification?.concepts ?? [])
</script>

<template>
  <ModalOverlay
    :open="open"
    panel-class="flex max-h-[85vh] w-[min(360px,calc(100vw-2rem))] flex-col gap-4 overflow-y-auto rounded-xl bg-surface-raised p-5 shadow-level2"
    @close="emit('close')"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex flex-col gap-0.5">
        <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{{ t('playAlongInfo.title') }}</span>
        <span class="text-base font-bold text-ink">{{ localizedName(diagram.names) }}</span>
      </div>
      <ModalCloseButton @close="emit('close')" />
    </div>

    <section class="flex flex-col gap-1">
      <h2 class="text-sm font-semibold">{{ t('playAlongInfo.whyTitle') }}</h2>
      <p class="text-sm text-ink-muted">{{ t(whyKeys[reason]) }}</p>
    </section>

    <section v-if="skills.length > 0" data-test="info-skills" class="flex flex-col gap-1.5">
      <h2 class="text-sm font-semibold">{{ t('playAlongInfo.skills') }}</h2>
      <ul class="flex flex-wrap gap-1.5">
        <li v-for="skill in skills" :key="skill.node_id" class="rounded-full bg-accent-muted px-2.5 py-0.5 text-xs">
          {{ localizedName(skill.names) }}
        </li>
      </ul>
    </section>

    <section v-if="concepts.length > 0" data-test="info-concepts" class="flex flex-col gap-1.5">
      <h2 class="text-sm font-semibold">{{ t('playAlongInfo.concepts') }}</h2>
      <ul class="flex flex-wrap gap-1.5">
        <li v-for="concept in concepts" :key="concept.node_id" class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-xs">
          {{ localizedName(concept.names) }}
        </li>
      </ul>
    </section>

    <section class="flex flex-col gap-1">
      <h2 class="text-sm font-semibold">{{ t('playAlongInfo.howTitle') }}</h2>
      <ul class="flex list-disc flex-col gap-1 pl-5 text-sm text-ink-muted">
        <li>{{ t('playAlongInfo.howTake') }}</li>
        <li>{{ t('playAlongInfo.howRate') }}</li>
        <li v-if="reason === 'warm_up'">{{ t('playAlongInfo.howWarmUp') }}</li>
        <li v-else>{{ t('playAlongInfo.howLadder') }}</li>
        <li>{{ t('playAlongInfo.howTempo') }}</li>
      </ul>
    </section>
  </ModalOverlay>
</template>
