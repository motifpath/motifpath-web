<script setup lang="ts">
/**
 * An authoring editor's body. On a phone the side column (the status, then what to do) comes
 * first, above the form; on a wide screen it sits beside the form, 320 px wide, and stays in view.
 */
defineProps<{ twoColumns: boolean }>()
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-[1200px] flex-1 gap-6"
    :class="twoColumns ? 'flex-row items-start px-[48px] pb-[80px]' : 'flex-col px-4 pb-8 pt-4'"
  >
    <aside
      v-if="$slots.side"
      data-test="editor-side"
      class="flex flex-col gap-3"
      :class="twoColumns ? 'sticky top-28 order-2 w-[320px] shrink-0' : ''"
    >
      <slot name="side" />
    </aside>
    <div data-test="editor-main" class="flex min-w-0 flex-1 flex-col gap-4" :class="twoColumns ? 'order-1' : ''">
      <slot />
    </div>
  </div>
</template>
