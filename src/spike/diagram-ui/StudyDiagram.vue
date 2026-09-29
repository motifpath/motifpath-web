<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { components } from '@/api/generated/core-domain'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import StudyPlayer from './StudyPlayer.vue'

const props = withDefaults(defineProps<{
  diagram: components['schemas']['Diagram']
  instrument: components['schemas']['Instrument']
  diagramRef: components['schemas']['DiagramRef']
  playback: components['schemas']['DiagramRef']['playback']
  presentation?: 'study' | 'classic'
  texture?: boolean
  drawingInert?: boolean
  selectablePositionIds?: string[]
  selectedPositionIds?: string[]
}>(), { presentation: 'study', texture: true, drawingInert: false, selectablePositionIds: () => [], selectedPositionIds: () => [] })
defineEmits<{ select: [id: string] }>()
const active = ref<string[]>([])
const playable = computed(() => props.playback != null && props.diagram.sequence.some(step => step.position_ids.length > 0))
watch(() => [props.diagram, props.playback], () => { active.value = [] })
</script>

<template>
  <FrettedDiagramView :diagram="diagram" :instrument="instrument" :diagram-ref="diagramRef" :presentation="presentation" :texture="texture" :drawing-inert="drawingInert" :controls-width="playable ? 112 : 0" :active-position-ids="active" :selectable-position-ids="selectablePositionIds" :selected-position-ids="selectedPositionIds" multiple @select="$emit('select', $event)">
    <template v-if="playable" #controls>
      <StudyPlayer :diagram="diagram" :instrument="instrument" :playback="playback" @active="active = $event"/>
    </template>
  </FrettedDiagramView>
</template>
