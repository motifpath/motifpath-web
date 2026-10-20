<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    /** Renders a RouterLink to this location instead of a button, with the same look. */
    to?: RouteLocationRaw
    type?: 'button' | 'submit'
    disabled?: boolean
    /** The action is running: a spinner shows before the label and further taps are ignored. */
    busy?: boolean
    /** Spans its container's width, as a sheet's actions do. */
    block?: boolean
  }>(),
  { variant: 'primary', to: undefined, type: 'button', disabled: false, busy: false, block: false },
)
const emit = defineEmits<{ click: [event: MouseEvent] }>()

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent/90',
  secondary: 'border border-accent bg-transparent text-accent-text hover:bg-accent-muted',
  tertiary: 'bg-transparent text-accent-text hover:bg-accent-muted',
  destructive: 'bg-danger text-danger-fg hover:bg-danger/90',
}

const classes = computed(() => [
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  'disabled:cursor-not-allowed disabled:opacity-50',
  VARIANT_CLASSES[props.variant],
  { 'w-full': props.block, 'cursor-progress': props.busy },
])

function onClick(event: MouseEvent) {
  if (props.busy) {
    event.preventDefault()
    return
  }
  emit('click', event)
}
</script>

<template>
  <RouterLink v-if="to !== undefined" :to="to" :class="classes">
    <slot />
  </RouterLink>
  <button v-else :type="type" :disabled="disabled" :aria-busy="busy ? 'true' : undefined" :class="classes" @click="onClick">
    <LoaderCircle v-if="busy" data-test="button-spinner" :size="16" class="animate-spin" aria-hidden="true" />
    <slot />
  </button>
</template>
