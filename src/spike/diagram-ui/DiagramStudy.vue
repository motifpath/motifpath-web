<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Moon, Sun, ArrowLeft, Maximize2, Music2 } from 'lucide-vue-next'
import { i18n } from '@/i18n'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StudyDiagram from './StudyDiagram.vue'
import { makeDiagramRef } from '@/shared/testUtils/diagram'
import type { components } from '@/api/generated/core-domain'
import { createStudyFixture } from './fixtures'

type PositionShape = components['schemas']['DiagramPosition']['shape']

const dark = ref(true)
watch(dark, value => document.documentElement.classList.toggle('dark', value), { immediate: true })
const fixture = ref('pentatonic')
const shapePreview = ref<PositionShape | 'mixed'>('mixed')
const frame = ref('phone')
const texture = ref(true)
const before = ref(false)
const exerciseType = ref('recognition')
const selectedChoice = ref<string | null>(null)
const sequence = ref('scale')
const loop = ref(false)
const reversed = ref(false)
const unavailableVoice = ref(false)
const expanded = ref(false)
const selected = ref<string[]>([])
const locale = ref<'en' | 'pt-BR'>('en')
watch(locale, value => { i18n.global.locale.value = value })
watch([fixture, sequence, exerciseType], () => { selected.value = []; selectedChoice.value = null })
const study = computed(() => createStudyFixture(fixture.value, shapePreview.value, sequence.value))
const instrument = computed(() => study.value.instrument)
const diagram = computed(() => study.value.diagram)
const diagramRef = computed(() => makeDiagramRef({ layers: { intervals: fixture.value !== 'pentatonic', hidden_position_ids: fixture.value === 'hidden' ? ['s1-0'] : [] }, styling: { root_color: '#bce9d1', interval_color: '#dfdcfa' } }))
const playback = computed(() => ({ direction: reversed.value ? 'reversed' as const : 'as_authored' as const, loop: loop.value, voice_id: unavailableVoice.value ? 'unavailable-study-voice' : 'acoustic-guitar' }))
const choices = computed(() => [
  { id: 'A', ...study.value },
  { id: 'B', ...createStudyFixture(fixture.value === 'open' ? 'pentatonic' : 'open', shapePreview.value, sequence.value) },
])
const choiceRef = computed(() => ({ ...diagramRef.value, layers: { ...diagramRef.value.layers, intervals: true } }))
function select(id: string) { selected.value = selected.value.includes(id) ? selected.value.filter(p => p !== id) : [...selected.value, id] }
</script>

<template>
  <main class="min-h-screen bg-surface text-ink font-sans">
    <header class="border-b border-border bg-surface-raised px-6 py-4 flex items-center justify-between gap-4">
      <div class="flex items-center gap-3"><Music2 class="text-accent-text" :size="24"/><strong>MotifPath</strong><span class="hidden sm:inline border-l border-border pl-3 text-sm text-ink-muted">Fretboard study</span></div>
      <button class="rounded-md border border-border p-2" :aria-label="dark ? 'Use light theme' : 'Use dark theme'" @click="dark = !dark"><Sun v-if="dark" :size="18"/><Moon v-else :size="18"/></button>
    </header>
    <div class="mx-auto max-w-6xl px-4 sm:px-8 py-8">
      <p class="text-xs uppercase tracking-widest font-semibold text-accent-text">Design exploration / 03 · Diagram controls</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight">An instrument you can read.</h1>
      <p class="mt-3 max-w-2xl text-ink-muted">A quieter surface, clearer musical landmarks, and room to touch each note. Compare the same diagram at the same size.</p>
      <section aria-label="Study controls" class="my-6 flex flex-wrap items-end gap-4 rounded-lg border border-border bg-surface-raised p-4 text-sm">
        <label class="flex flex-col gap-1 text-ink-muted">Exercise type<select v-model="exerciseType" data-test="exercise-preview-type" class="rounded-md border border-border bg-surface px-3 py-2 text-ink"><option value="recognition">Image recognition</option><option value="choice">Image choice</option></select></label>
        <label class="flex flex-col gap-1 text-ink-muted">Diagram<select v-model="fixture" class="rounded-md border border-border bg-surface px-3 py-2 text-ink"><option value="pentatonic">A minor pentatonic</option><option value="open">Open position · nut</option><option value="octave">Octave · double inlays</option><option value="wide">Wide fret range</option><option value="captions">Long / overlapping captions</option><option value="hidden">Hidden sounding note</option><option value="bass">Four strings</option></select></label>
        <label class="flex flex-col gap-1 text-ink-muted">Shapes<select v-model="shapePreview" data-test="shape-preview" class="rounded-md border border-border bg-surface px-3 py-2 text-ink"><option value="mixed">Mixed · roots as stars</option><option value="dot">Circles</option><option value="square">Squares</option><option value="star">Stars</option></select></label>
        <label class="flex flex-col gap-1 text-ink-muted">Width<select v-model="frame" class="rounded-md border border-border bg-surface px-3 py-2 text-ink"><option value="phone">Phone · 390</option><option value="small">Phone · 360</option><option value="tablet">Tablet · 768</option><option value="desktop">Desktop</option></select></label>
        <label class="flex flex-col gap-1 text-ink-muted">Language<select v-model="locale" class="rounded-md border border-border bg-surface px-3 py-2 text-ink"><option value="en">English</option><option value="pt-BR">Português</option></select></label>
        <label class="flex flex-col gap-1 text-ink-muted">Sequence<select v-model="sequence" data-test="sequence-preview" class="rounded-md border border-border bg-surface px-3 py-2 text-ink"><option value="scale">Low to high</option><option value="phrase">Notes, rest &amp; strum</option><option value="none">No sequence</option></select></label>
        <label class="flex gap-2 items-center py-2"><input v-model="loop" type="checkbox">Loop</label>
        <label class="flex gap-2 items-center py-2"><input v-model="reversed" type="checkbox">Reverse</label>
        <label class="flex gap-2 items-center py-2"><input v-model="unavailableVoice" type="checkbox">Unavailable voice</label>
        <label class="flex gap-2 items-center py-2"><input v-model="texture" type="checkbox">Wood grain</label>
        <label class="flex gap-2 items-center py-2"><input v-model="before" type="checkbox">Show original</label>
      </section>
      <div class="mb-3 flex items-center justify-between gap-3 text-sm"><span class="text-ink-muted">{{ before ? 'Original presentation' : 'Proposed presentation' }}</span><button class="flex items-center gap-2 text-accent-text" @click="expanded = !expanded"><Maximize2 :size="16"/>{{ expanded ? 'Restore width' : 'Expand board' }}</button></div>
      <section class="mx-auto overflow-hidden rounded-xl border border-border bg-surface-raised shadow-level2" :class="expanded || frame === 'desktop' ? 'w-full' : frame === 'tablet' ? 'max-w-3xl' : frame === 'small' ? 'study-small' : 'study-phone'" aria-label="Exercise preview">
        <div class="flex items-center gap-3 border-b border-border p-4 text-sm text-ink-muted"><ArrowLeft :size="16"/><span>{{ fixture === 'pentatonic' ? 'Minor pentatonic' : locale === 'en' ? 'Fretboard exploration' : 'Explore o braço' }}</span><span class="ml-auto">3 of 8</span></div>
        <div class="h-1 bg-surface-sunken"><div class="h-1 w-2/5 bg-accent"/></div>
        <div class="p-4">
          <p class="text-xs font-semibold uppercase tracking-widest text-accent-text">{{ locale === 'en' ? 'Listen & explore' : 'Ouça e explore' }}</p>
          <h2 class="mt-2 mb-5 text-lg font-semibold leading-snug">{{ exerciseType === 'choice' ? (locale === 'en' ? 'Compare and choose a diagram.' : 'Compare e escolha um diagrama.') : fixture === 'pentatonic' ? (locale === 'en' ? 'Tap every root of the A minor pentatonic.' : 'Toque em todas as tônicas da pentatônica menor de Lá.') : (locale === 'en' ? 'Explore the notes and highlighted regions.' : 'Explore as notas e as regiões destacadas.') }}</h2>
          <template v-if="exerciseType === 'recognition'">
            <StudyDiagram :diagram="diagram" :instrument="instrument" :diagram-ref="diagramRef" :playback="playback" :presentation="before ? 'classic' : 'study'" :texture="texture" :selectable-position-ids="diagram.positions.map(p => p.position_id!)" :selected-position-ids="selected" @select="select"/>
            <p class="mt-3 text-xs text-ink-muted">{{ fixture === 'wide' ? 'Scroll the board to explore all frets. ' : '' }}{{ selected.length }} selected · Tap again to undo</p>
          </template>
          <div v-else role="radiogroup" :aria-label="locale === 'en' ? 'Diagram choices' : 'Opções de diagrama'" class="study-choices">
            <article v-for="choice in choices" :key="choice.id" data-test="study-choice" class="relative min-w-0 cursor-pointer rounded-lg border p-3 transition-colors" :class="selectedChoice === choice.id ? 'border-accent bg-surface-sunken' : 'border-border'" @click="selectedChoice = choice.id">
              <button type="button" role="radio" data-test="choose-diagram" :aria-label="`${locale === 'en' ? 'Choose diagram' : 'Escolher diagrama'} ${choice.id}`" :aria-checked="selectedChoice === choice.id" class="mb-1 flex w-full items-center justify-between rounded-md text-sm font-semibold text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" @click.stop="selectedChoice = choice.id">
                <span>{{ choice.id }}</span><span class="choice-indicator" :class="selectedChoice === choice.id ? 'border-accent bg-accent text-accent-fg' : 'border-border'" aria-hidden="true">{{ selectedChoice === choice.id ? '✓' : '' }}</span>
              </button>
              <StudyDiagram :diagram="choice.diagram" :instrument="choice.instrument" :diagram-ref="choiceRef" :playback="playback" :presentation="before ? 'classic' : 'study'" :texture="texture" drawing-inert/>
            </article>
          </div>
          <p v-if="sequence === 'none'" class="mt-4 text-xs text-ink-muted">{{ locale === 'en' ? 'This diagram has no playback sequence.' : 'Este diagrama não tem sequência de reprodução.' }}</p>
        </div>
        <footer class="flex items-center justify-between border-t border-border p-4"><span class="text-sm text-ink-muted">{{ exerciseType === 'choice' ? (selectedChoice ? `Selected: ${selectedChoice}` : 'Choose one diagram') : 'Select all that apply' }}</span><PrimaryButton :disabled="selected.length === 0 && !selectedChoice" @click="selected = []; selectedChoice = null">Reset selection</PrimaryButton></footer>
      </section>
      <div class="mt-6 grid gap-4 sm:grid-cols-3 text-sm">
        <div class="border-t border-border pt-3"><strong>Readable at phone size</strong><p class="mt-1 text-ink-muted">14 px labels and 44 px string spacing. Tap a colored region to read its description.</p></div>
        <div class="border-t border-border pt-3"><strong>Physical landmarks</strong><p class="mt-1 text-ink-muted">Ivory inlays, graduated guitar strings, metal frets, and a nut only at fret zero.</p></div>
        <div class="border-t border-border pt-3"><strong>Hear what you see</strong><p class="mt-1 text-ink-muted">Play a sequence, adjust tempo, or compare a strum. Gold rings follow the audio; hidden notes stay hidden.</p></div>
      </div>
      <p class="mt-6 text-xs text-ink-subtle">Study uses the production playback engine with a local sample catalogue. Acoustic guitar recordings: tonejs-instruments, Nicholaus Brosowsky · CC BY 3.0. Four-string view uses this guitar voice for layout testing.</p>
    </div>
  </main>
</template>

<style scoped>
.study-phone { width: min(100%, 390px); }
.study-small { width: min(100%, 360px); }
.study-choices { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 16px; }
.choice-indicator { display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-width: 1px; border-radius: 50%; }
[data-test="choose-diagram"] { min-height: 44px; }
</style>
