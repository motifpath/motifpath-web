<script setup lang="ts">
/**
 * The tempo a diagram plays at, for the student to slow it down or speed it up: a control named
 * with the tempo that opens a panel on demand with a slider and a numeric input. The tempo is never
 * saved. Where its holder plays the diagram at a note value, the panel offers the suggested ones
 * beside the tempo. In the `rail` look the control is a metronome sized for a diagram's control rail; in the
 * `chip` look it is a small pill showing the metronome and the tempo. The panel is drawn over the
 * page, anchored to the control, so a card that clips its content never cuts it off. It closes on
 * Escape, from its close control, on a press outside it and its control, and when focus leaves both.
 */
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { Metronome, X } from 'lucide-vue-next'

import NoteValuePicker from '@/shared/components/NoteValuePicker.vue'
import { useAnchoredPopover } from '@/shared/composables/useAnchoredPopover'
import { useTypedT } from '@/shared/composables/useTypedT'
import { RAIL_CONTROL_CLASS, RAIL_ICON_SIZE } from '@/shared/utils/regionInfoLayout'
import { MAX_TEMPO_BPM, MIN_TEMPO_BPM } from '@/shared/utils/sequence'
import { SUGGESTED_NOTE_VALUES } from '@/shared/utils/tempoNoteValue'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'

withDefaults(defineProps<{ look?: 'rail' | 'chip' }>(), { look: 'rail' })

const tempo = defineModel<number>({ required: true })
/** Whether the panel is open, for a holder to keep its own popovers out of its way. */
const open = defineModel<boolean>('open', { default: false })
/** The note value it plays at; none offers no note values. */
const noteValue = defineModel<TempoNoteValue>('noteValue')

const { t } = useTypedT()

const inputId = `diagram-tempo-${useId()}`
const root = ref<HTMLElement | null>(null)
const control = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const slider = ref<HTMLInputElement | null>(null)

const { style: panelStyle } = useAnchoredPopover(control, panel, open)

/** Takes a whole number of BPM within the allowed range; anything else leaves the tempo as it is. */
function onTempo(event: Event) {
  if (!(event.target instanceof HTMLInputElement) || event.target.value.trim() === '') return
  const bpm = Number(event.target.value)
  if (Number.isInteger(bpm) && bpm >= MIN_TEMPO_BPM && bpm <= MAX_TEMPO_BPM) tempo.value = bpm
}

/** Leaving the numeric input shows the tempo in effect, whatever was typed. */
function onTempoBlur(event: Event) {
  if (event.target instanceof HTMLInputElement) event.target.value = String(tempo.value)
}

// Opening the panel moves focus onto its slider, so the next keys adjust the tempo; the slider, not
// the numeric input, so a phone doesn't raise its keyboard every time the panel opens.
watch(open, async (isOpen) => {
  if (!isOpen) return
  await nextTick()
  slider.value?.focus()
})

/** Closes the panel; from the keyboard or its close control, focus goes back to the tempo control. */
function close(returnFocus: boolean) {
  open.value = false
  if (returnFocus) control.value?.focus()
}

/** Focus leaving the control and its panel for elsewhere on the page closes the panel. */
function onPanelFocusOut(event: FocusEvent) {
  const next = event.relatedTarget
  if (!(next instanceof Node) || panel.value?.contains(next) || root.value?.contains(next)) return
  close(false)
}

/** A press anywhere but the control and its panel closes the panel, without taking focus. */
function onDocumentPointerDown(event: Event) {
  if (!open.value || !(event.target instanceof Node)) return
  if (root.value?.contains(event.target) || panel.value?.contains(event.target)) return
  close(false)
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown))
</script>

<template>
  <span ref="root" class="flex">
    <button
      ref="control"
      data-test="diagram-tempo-toggle"
      type="button"
      :class="
        look === 'rail'
          ? [RAIL_CONTROL_CLASS, 'text-accent']
          : 'flex h-11 items-center gap-1 rounded-full border border-border bg-surface px-3 text-sm font-semibold tabular-nums text-ink hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus'
      "
      :aria-label="t('diagramPlayer.tempoControl', { bpm: tempo })"
      :title="t('diagramPlayer.tempoControl', { bpm: tempo })"
      :aria-expanded="open"
      @click="open = !open"
      @keydown.escape="close(true)"
    >
      <Metronome :size="look === 'rail' ? RAIL_ICON_SIZE : 16" aria-hidden="true" />
      <span v-if="look === 'chip'" aria-hidden="true">{{ tempo }}</span>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="panel"
        data-test="diagram-tempo-panel"
        class="fixed z-50 w-72 max-w-[calc(100vw-1rem)] rounded-md border border-border bg-surface-raised p-3 shadow-level2"
        :style="panelStyle"
        @keydown.escape="close(true)"
        @focusout="onPanelFocusOut"
      >
        <div class="flex items-center justify-between gap-2">
          <label :for="inputId" class="text-sm text-ink-muted">{{ t('diagramPlayer.tempo') }}</label>
          <button
            type="button"
            data-test="diagram-tempo-close"
            class="flex h-11 w-11 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            :aria-label="t('diagramPlayer.closeTempo')"
            @click="close(true)"
          >
            <X :size="16" aria-hidden="true" />
          </button>
        </div>
        <div class="flex items-center gap-3">
          <input
            ref="slider"
            data-test="diagram-tempo"
            type="range"
            :min="MIN_TEMPO_BPM"
            :max="MAX_TEMPO_BPM"
            step="1"
            :value="tempo"
            :aria-label="t('diagramPlayer.tempo')"
            class="h-11 min-w-0 flex-1 rounded-md accent-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            @input="onTempo"
          />
          <input
            :id="inputId"
            data-test="diagram-tempo-number"
            type="number"
            inputmode="numeric"
            :min="MIN_TEMPO_BPM"
            :max="MAX_TEMPO_BPM"
            step="1"
            :value="tempo"
            class="h-11 w-20 rounded-md border border-border bg-surface px-2 text-sm tabular-nums text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            @input="onTempo"
            @blur="onTempoBlur"
          />
          <NoteValuePicker
            v-if="noteValue !== undefined"
            :model-value="noteValue"
            :values="SUGGESTED_NOTE_VALUES"
            :container="panel"
            @update:model-value="noteValue = $event"
          />
        </div>
        <p class="mt-1 text-xs text-ink-subtle">{{ t('diagramPlayer.tempoHint') }}</p>
      </div>
    </Teleport>
  </span>
</template>
