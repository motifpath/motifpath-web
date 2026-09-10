<script setup lang="ts">
/**
 * PB-34 spike — one real Reka UI primitive, wired end to end and styled ONLY
 * through design tokens (no raw hex/px). Proves: focus trap, Esc-to-close,
 * focus restoration, ARIA wiring — all supplied by Reka, zero hand-rolled a11y.
 */
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'reka-ui'

defineProps<{ title: string; description: string }>()
</script>

<template>
  <DialogRoot>
    <DialogTrigger
      data-test="dialog-trigger"
      class="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
    >
      <slot name="trigger">Open</slot>
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 bg-ink/40" />
      <DialogContent
        data-test="dialog-content"
        class="fixed left-1/2 top-1/2 w-[20rem] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface-raised p-6 text-ink"
      >
        <DialogTitle class="text-lg font-medium">{{ title }}</DialogTitle>
        <DialogDescription class="mt-2 text-sm text-muted">{{ description }}</DialogDescription>
        <div class="mt-6 flex justify-end gap-2">
          <DialogClose
            data-test="dialog-close"
            class="rounded-md px-3 py-1.5 text-sm text-muted"
          >
            Close
          </DialogClose>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
