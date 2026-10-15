<script setup lang="ts">
/**
 * The note value the music plays at, as its icon beside the tempo, with its choices on demand: a
 * tap opens a popover of the values offered as icons, the chosen one ringed and named in words. A
 * choice applies at once and closes it; a tap outside it or Escape closes it unchanged. The popover
 * is drawn over the page next to the button, never over it, the same at every size.
 */
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'

import TempoNoteValueIcon from '@/shared/components/TempoNoteValueIcon.vue'
import { useAnchoredPopover } from '@/shared/composables/useAnchoredPopover'
import { useTypedT } from '@/shared/composables/useTypedT'
import { ALL_NOTE_VALUES } from '@/shared/utils/tempoNoteValue'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'

const props = withDefaults(
  defineProps<{
    /** The values offered, slowest first. */
    values: readonly TempoNoteValue[]
    disabled?: boolean
    /**
     * Where the popover is drawn: over the page by default, or inside a panel that closes when
     * pressed or focused outside, so choosing a note value doesn't close that panel.
     */
    container?: HTMLElement | null
  }>(),
  { disabled: false, container: null },
)

const value = defineModel<TempoNoteValue>({ required: true })

const { t } = useTypedT()

const open = ref(false)
const button = ref<HTMLButtonElement | null>(null)
const popover = ref<HTMLElement | null>(null)
const headingId = `note-value-heading-${useId()}`

const { style } = useAnchoredPopover(button, popover, open)

/** Every value is offered only in the Metronome tool, whose popover names the setting itself. */
const heading = () => (props.values.length === ALL_NOTE_VALUES.length ? t('noteValuePicker.all') : t('noteValuePicker.suggested'))

async function show() {
  if (props.disabled) return
  open.value = true
  await nextTick()
  popover.value?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
}

function close(returnFocus: boolean) {
  open.value = false
  if (returnFocus) button.value?.focus()
}

function choose(next: TempoNoteValue) {
  value.value = next
  close(true)
}

/** A press anywhere but the button and the popover closes it, without taking focus. */
function onDocumentPointerDown(event: Event) {
  if (!open.value || !(event.target instanceof Node)) return
  if (button.value?.contains(event.target) || popover.value?.contains(event.target)) return
  close(false)
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown))
</script>

<template>
  <button
    ref="button"
    type="button"
    data-test="note-value"
    class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-muted text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60"
    :aria-label="t('noteValuePicker.button', { value: t(`noteValue.${value}`) })"
    :title="t('noteValuePicker.button', { value: t(`noteValue.${value}`) })"
    aria-haspopup="dialog"
    :aria-expanded="open ? 'true' : 'false'"
    :disabled="disabled"
    @click="open ? close(false) : show()"
  >
    <TempoNoteValueIcon :value="value" />
  </button>

  <Teleport :to="container ?? 'body'" defer>
    <div
      v-if="open"
      ref="popover"
      data-test="note-value-popover"
      role="dialog"
      :aria-labelledby="headingId"
      class="fixed z-50 flex w-[15.5rem] flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4 shadow-level2"
      :style="style"
      @keydown.escape.stop="close(true)"
    >
      <p :id="headingId" class="text-xs font-semibold uppercase tracking-wide text-ink-muted">{{ heading() }}</p>
      <div role="radiogroup" :aria-labelledby="headingId" class="grid grid-cols-4 gap-2">
        <button
          v-for="choice in values"
          :key="choice"
          type="button"
          role="radio"
          data-test="note-value-choice"
          :aria-checked="choice === value ? 'true' : 'false'"
          :aria-label="t(`noteValue.${choice}`)"
          :title="t(`noteValue.${choice}`)"
          class="flex h-12 w-12 items-center justify-center rounded-md text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          :class="choice === value ? 'border-2 border-accent bg-accent-muted' : 'hover:bg-surface-sunken'"
          @click="choose(choice)"
        >
          <TempoNoteValueIcon :value="choice" />
        </button>
      </div>
      <p data-test="note-value-hint" class="text-sm font-semibold text-ink">{{ t(`noteValueHint.${value}`) }}</p>
    </div>
  </Teleport>
</template>
