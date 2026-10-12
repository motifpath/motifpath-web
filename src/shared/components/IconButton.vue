<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

/**
 * An action drawn as its icon alone. The label names it for assistive technology and on hover;
 * on touch, where there is no hover, a long press shows the name instead of acting.
 */
const props = withDefaults(
  defineProps<{
    label: string
    /** For a toggle: whether it is on. Leave unset for a plain action. */
    pressed?: boolean
    disabled?: boolean
    tone?: 'default' | 'danger'
    /** `quiet` drops the outline, for a dense bar of actions (a toolbar). */
    appearance?: 'outlined' | 'quiet'
  }>(),
  { pressed: undefined, disabled: false, tone: 'default', appearance: 'outlined' },
)
const emit = defineEmits<{ click: [] }>()
// The wrapper only anchors the name bubble: a caller's attributes (a `data-test`, say) belong on the button.
defineOptions({ inheritAttrs: false })

const LONG_PRESS_MS = 500
const showingName = ref(false)
let pressTimer: ReturnType<typeof setTimeout> | null = null
let pressShowedName = false

function clearPressTimer() {
  if (pressTimer) clearTimeout(pressTimer)
  pressTimer = null
}

function onPointerDown() {
  pressShowedName = false
  clearPressTimer()
  pressTimer = setTimeout(() => {
    showingName.value = true
    pressShowedName = true
  }, LONG_PRESS_MS)
}

function onPointerEnd() {
  clearPressTimer()
  showingName.value = false
}

function onClick() {
  // The click that ends a long press only revealed the name.
  if (pressShowedName) {
    pressShowedName = false
    return
  }
  if (!props.disabled) emit('click')
}

onBeforeUnmount(clearPressTimer)
</script>

<template>
  <span class="relative inline-flex">
    <!-- The button is the 48 px tall touch target (40 px wide when quiet, so eight fit a 360 px
         phone's bar); the face drawn inside it is 40 px. -->
    <button
      v-bind="$attrs"
      type="button"
      :aria-label="label"
      :title="label"
      :aria-pressed="pressed === undefined ? undefined : pressed ? 'true' : 'false'"
      :disabled="disabled"
      class="group inline-flex h-12 items-center justify-center focus-visible:outline-none disabled:opacity-40"
      :class="appearance === 'quiet' ? 'w-10' : 'w-12'"
      @pointerdown="onPointerDown"
      @pointerup="onPointerEnd"
      @pointerleave="onPointerEnd"
      @pointercancel="onPointerEnd"
      @contextmenu.prevent
      @click="onClick"
    >
      <span
        class="inline-flex h-10 w-10 items-center justify-center rounded-lg group-focus-visible:ring-2 group-focus-visible:ring-focus"
        :class="[
          appearance === 'outlined' ? 'border' : '',
          pressed
            ? 'border-accent bg-accent text-accent-fg'
            : tone === 'danger'
              ? 'border-danger/40 bg-surface-raised text-danger'
              : appearance === 'outlined'
                ? 'border-border bg-surface-raised text-ink'
                : 'text-ink',
        ]"
      >
        <slot />
      </span>
    </button>
    <span
      v-if="showingName"
      data-test="icon-button-name"
      role="tooltip"
      class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-surface shadow-level2"
    >
      {{ label }}
    </span>
  </span>
</template>
