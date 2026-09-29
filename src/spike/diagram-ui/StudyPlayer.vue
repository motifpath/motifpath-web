<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { Play, Square, LoaderCircle, RotateCcw, ChevronDown, X } from 'lucide-vue-next'
import type { components } from '@/api/generated/core-domain'
import { useDiagramPlayback } from '@/shared/composables/useDiagramPlayback'
import { i18n } from '@/i18n'

const props = defineProps<{
  diagram: components['schemas']['Diagram']
  instrument: components['schemas']['Instrument']
  playback: components['schemas']['DiagramRef']['playback']
}>()
const emit = defineEmits<{ active: [ids: string[]] }>()
const { canPlay, state, activePositionIds, tempo, toggle, prefetch } = useDiagramPlayback(() => ({
  diagram: props.diagram, instrument: props.instrument, playback: props.playback ?? null,
}))
watch(activePositionIds, ids => emit('active', ids))
const expanded = ref(false)
const tempoInputId = `study-tempo-${useId()}`
const tempoButton = ref<HTMLButtonElement | null>(null)
const root = ref<HTMLElement | null>(null)
const pt = computed(() => i18n.global.locale.value === 'pt-BR')
const busy = computed(() => state.value === 'playing' || state.value === 'loading')
const action = computed(() => state.value === 'error' ? (pt.value ? 'Tentar de novo' : 'Retry') : busy.value ? (pt.value ? 'Parar' : 'Stop') : (pt.value ? 'Ouvir' : 'Play'))
function setTempo(event: Event) {
  const input = event.target as HTMLInputElement
  const value = Number(input.value)
  if (Number.isInteger(value) && value >= 20 && value <= 300) tempo.value = value
}
function closeTempo(restoreFocus = false) {
  expanded.value = false
  if (restoreFocus) tempoButton.value?.focus()
}
function outside(event: PointerEvent) {
  if (event.target instanceof Node && !root.value?.contains(event.target)) closeTempo()
}
onMounted(() => {
  void prefetch()
  document.addEventListener('pointerdown', outside)
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', outside))
</script>

<template>
  <section v-if="canPlay" ref="root" data-test="study-player" class="relative" :aria-label="pt ? 'Reprodução do diagrama' : 'Diagram playback'" @click.stop @keydown.esc.stop.prevent="closeTempo(true)">
    <div class="study-control-rail pointer-events-auto flex items-center">
      <button type="button" data-test="study-play" class="study-transport inline-flex shrink-0 items-center justify-center rounded-md text-accent-text hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]" :title="action" :aria-label="action" :aria-busy="state === 'loading' ? 'true' : undefined" @click="toggle">
        <LoaderCircle v-if="state === 'loading'" :size="16" class="animate-spin motion-reduce:animate-none"/>
        <Square v-else-if="state === 'playing'" :size="14" fill="currentColor"/>
        <RotateCcw v-else-if="state === 'error'" :size="16"/>
        <Play v-else :size="16" fill="currentColor"/>
        <span class="sr-only">{{ action }}</span>
      </button>
      <span role="status" class="sr-only">{{ state === 'loading' ? (pt ? 'Carregando…' : 'Loading…') : state === 'playing' ? (pt ? 'Reproduzindo' : 'Playing') : '' }}</span>
      <button ref="tempoButton" type="button" data-test="tempo-toggle" class="study-tempo-toggle inline-flex shrink-0 items-center justify-center gap-1 rounded-md text-accent-text hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]" :aria-label="`${pt ? 'Ajustar andamento' : 'Adjust tempo'} · ${tempo} BPM`" :title="`${tempo} BPM`" :aria-expanded="expanded" @click="expanded = !expanded">
        <span class="flex flex-col items-center leading-none"><strong class="text-sm font-medium tabular-nums">{{ tempo }}</strong><span class="study-bpm-label">BPM</span></span><ChevronDown :size="12" :class="expanded ? 'rotate-180' : ''"/>
      </button>
    </div>
    <div v-if="expanded" data-test="tempo-panel" class="study-tempo-panel pointer-events-auto absolute left-0 top-11 z-30 rounded-md border border-border bg-surface-raised p-3 shadow-level2">
      <div class="flex items-center justify-between gap-2"><label :for="tempoInputId" class="text-sm text-ink-muted">{{ pt ? 'Andamento' : 'Tempo' }}</label><button type="button" class="study-close flex items-center justify-center rounded-md text-ink-muted" :aria-label="pt ? 'Fechar andamento' : 'Close tempo'" @click="closeTempo(true)"><X :size="16"/></button></div>
      <div class="flex items-center gap-3">
        <input type="range" min="20" max="300" step="1" :value="tempo" :aria-label="pt ? 'Andamento' : 'Tempo'" class="study-tempo min-w-0 flex-1 accent-accent" @input="setTempo">
        <input :id="tempoInputId" type="number" min="20" max="300" step="1" :value="tempo" class="study-tempo w-20 rounded-md border border-border bg-surface-raised px-2 text-sm tabular-nums text-ink" @input="setTempo" @blur="($event.target as HTMLInputElement).value = String(tempo)">
      </div>
      <p class="mt-1 text-xs text-ink-subtle">{{ pt ? '20–300 BPM · muda na próxima nota' : '20–300 BPM · changes on the next step' }}</p>
    </div>
    <p v-if="state === 'error' && !expanded" role="alert" class="pointer-events-auto absolute left-0 top-11 z-30 w-full rounded-md border border-border bg-surface-raised p-3 text-sm text-danger shadow-level2">{{ pt ? 'Não foi possível carregar o áudio. Tente novamente.' : 'Could not load the audio. Try again.' }}</p>
  </section>
</template>

<style scoped>
.study-control-rail { width: 112px; height: 44px; }
.study-transport { height: 44px; width: 44px; }
.study-tempo-toggle { height: 44px; width: 68px; }
.study-bpm-label { font-size: 9px; margin-top: 3px; }
.study-tempo-panel { width: min(100%, 300px); }
.study-tempo, .study-close { min-height: 44px; }
.study-close { min-width: 44px; }
</style>
