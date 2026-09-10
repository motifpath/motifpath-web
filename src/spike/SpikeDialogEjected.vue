<script setup lang="ts">
/**
 * PB-34 spike — the eject path. Same props and same `data-test` surface as
 * `SpikeDialog.vue`, so a caller swaps the import and nothing else. Hand-rolled
 * open state + Esc-to-close + focus restoration + a minimal focus trap. This is
 * what "Reka is ejectable, not lock-in" costs in practice: ~40 lines.
 */
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

defineProps<{ title: string; description: string }>()

const open = ref(false)
const triggerEl = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)

function show() {
  open.value = true
}
function hide() {
  open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') hide()
  if (event.key === 'Tab' && contentEl.value) {
    const focusable = contentEl.value.querySelectorAll<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])',
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
}

watch(open, async (isOpen) => {
  if (isOpen) {
    document.addEventListener('keydown', onKeydown)
    await nextTick()
    contentEl.value?.querySelector<HTMLElement>('button')?.focus()
  } else {
    document.removeEventListener('keydown', onKeydown)
    triggerEl.value?.focus()
  }
})

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <button
    ref="triggerEl"
    data-test="dialog-trigger"
    class="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
    @click="show"
  >
    <slot name="trigger">Open</slot>
  </button>
  <Teleport to="body">
    <template v-if="open">
      <div class="fixed inset-0 bg-ink/40" @click="hide" />
      <div
        ref="contentEl"
        data-test="dialog-content"
        role="dialog"
        aria-modal="true"
        class="fixed left-1/2 top-1/2 w-[20rem] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface-raised p-6 text-ink"
      >
        <h2 class="text-lg font-medium">{{ title }}</h2>
        <p class="mt-2 text-sm text-muted">{{ description }}</p>
        <div class="mt-6 flex justify-end gap-2">
          <button data-test="dialog-close" class="rounded-md px-3 py-1.5 text-sm text-muted" @click="hide">
            Close
          </button>
        </div>
      </div>
    </template>
  </Teleport>
</template>
