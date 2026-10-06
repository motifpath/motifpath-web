<script setup lang="ts">
/**
 * The Practice Shell's bottom bar: the screen's action sits in the thumb zone, clear of a
 * phone's home indicator. Fixed, so whichever part of a run renders it, it lands in the same
 * place; the shell leaves room for it under its content.
 */
</script>

<template>
  <div data-test="action-bar" class="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface px-4 pt-3 pb-safe">
    <div class="mx-auto flex w-full max-w-2xl flex-wrap items-center gap-3">
      <slot />
    </div>
  </div>
</template>
