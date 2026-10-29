<script setup lang="ts">
import { inject, ref, toRef } from 'vue'

import { overlayInPlaceKey } from '@/shared/composables/overlayInPlace'
import { useFocusTrap } from '@/shared/composables/useFocusTrap'
import { useOverlayHistory } from '@/shared/composables/useOverlayHistory'

const props = withDefaults(
  defineProps<{
    open: boolean
    /** False for a layer that asks for a decision: a tap beside it mustn't count as one. */
    closeOnScrim?: boolean
    /** Where the layer's content sits: centred, along the bottom edge, or wherever its content places itself. */
    placement?: 'center' | 'bottom' | 'none'
    /** `clear` for a menu, which sits beside its trigger without dimming the page. */
    scrim?: 'dim' | 'clear'
  }>(),
  { closeOnScrim: true, placement: 'center', scrim: 'dim' },
)
const emit = defineEmits<{ close: [] }>()
// A teleport root can't take the caller's attributes (a `data-test`, say) on its own: the layer does.
defineOptions({ inheritAttrs: false })

const inPlace = inject(overlayInPlaceKey, false)
const layer = ref<HTMLElement | null>(null)
const { onKeydown: trapTab } = useFocusTrap(layer, toRef(props, 'open'))
useOverlayHistory(toRef(props, 'open'), () => emit('close'))

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    emit('close')
    return
  }
  trapTab(event)
}

function onScrimClick() {
  if (props.closeOnScrim) emit('close')
}
</script>

<template>
  <!-- On <body>, not where it was opened: a sticky or z-indexed container (the top bar, the
       sidebar) makes its own stacking context, and a layer inside one paints under any later
       sibling at the same level — the bottom bar over the account sheet. -->
  <Teleport to="body" :disabled="inPlace">
    <div v-if="open" ref="layer" v-bind="$attrs" class="fixed inset-0 z-40" @keydown="onKeydown">
      <div
        data-test="overlay-scrim"
        class="absolute inset-0"
        :class="{ 'bg-scrim/40': scrim === 'dim' }"
        @click="onScrimClick"
      />
      <div
        data-test="overlay-area"
        class="pointer-events-none absolute flex"
        :class="{
          'bottom-inset-bottom left-inset-left right-inset-right top-inset-top items-center justify-center p-4': placement === 'center',
          'bottom-0 left-0 right-0 top-inset-top items-end justify-center': placement === 'bottom',
          'inset-0': placement === 'none',
        }"
      >
        <div class="pointer-events-auto contents">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
