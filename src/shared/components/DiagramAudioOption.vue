<script setup lang="ts">
/**
 * A sound to choose among others, played from a diagram rather than a clip: the same row as any
 * other sound, under its neutral label, the diagram never drawn or named before the answer. It
 * says when it starts and stops sounding, and when its sound can't be heard.
 */
import { computed, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { components as EventComponents } from '@/api/generated/event-ingestion'
import AudioOption from '@/shared/components/AudioOption.vue'
import { useDiagramSound } from '@/shared/composables/useDiagramSound'
import type { OptionState } from '@/shared/utils/optionState'

type DiagramRef = components['schemas']['DiagramRef']
type MissingReason = EventComponents['schemas']['NotAnsweredResponse']['reason']

const props = withDefaults(defineProps<{ label: string; sound: DiagramRef; state?: OptionState }>(), { state: 'default' })

const emit = defineEmits<{ select: []; playing: [playing: boolean]; missing: [reason: MissingReason] }>()

const { state: playState, missing, toggle } = useDiagramSound(() => props.sound)

const sounding = computed(() => playState.value === 'playing' || playState.value === 'loading')
watch(sounding, (now) => emit('playing', now))
watch(missing, (reason) => {
  if (reason) emit('missing', reason)
})
</script>

<template>
  <AudioOption :label="label" :state="state" :playing="sounding" @select="emit('select')" @play="toggle" />
</template>
