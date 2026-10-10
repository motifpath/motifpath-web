<script setup lang="ts">
/**
 * The Practice Shell's bottom bar: the screen's action sits in the thumb zone, clear of a
 * phone's home indicator. Fixed, so whichever part of a run renders it, it lands in the same
 * place; the shell leaves room for it under its content. On a wide screen it stays at the bottom,
 * its content lined up with the shell's column, so the thumb and a pedal find it where they did.
 */
</script>

<template>
  <div data-test="action-bar" class="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface px-5 pt-3 pb-safe">
    <div data-test="action-bar-content" class="mx-auto flex w-full max-w-[35rem] flex-wrap items-center gap-3">
      <slot />
    </div>
  </div>
</template>
