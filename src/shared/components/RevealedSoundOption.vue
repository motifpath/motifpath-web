<script setup lang="ts">
/**
 * A sound played from a diagram, once the answer is in: the student's answer and the right one
 * show their diagram, named and drawn (and playable, to hear the difference); any other sound
 * folds to one line naming its diagram, which opens to the drawing, so the screen doesn't scroll.
 */
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import { computed, ref, useId } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { AnswerMarkKind } from '@/shared/components/diagram/AnswerMark.vue'
import EmbeddedDiagram from '@/shared/components/diagram/EmbeddedDiagram.vue'
import { useEmbeddedDiagram } from '@/shared/composables/useEmbeddedDiagram'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

type DiagramRef = components['schemas']['DiagramRef']

const props = withDefaults(
  defineProps<{
    label: string
    sound: DiagramRef
    /** Whose sound it is: the student's answer, the right one they missed, or neither. */
    role: 'yours' | 'right' | null
    mark?: AnswerMarkKind
  }>(),
  { mark: undefined },
)

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const { diagram } = useEmbeddedDiagram(() => ({ kind: 'single', ref: props.sound }))
const name = computed(() => (diagram.value ? localizedName(diagram.value.names) : ''))

const open = ref(false)
const boardId = `revealed-sound-${useId()}`

const head = computed(() => t(props.role === 'yours' ? 'revealedSound.yours' : 'revealedSound.right', { label: props.label }))
const markClasses = { right: 'border-success bg-success-muted', wrong: 'border-danger bg-danger-muted' } as const
</script>

<template>
  <div
    v-if="role"
    data-test="revealed-sound"
    :data-mark="mark"
    class="flex flex-col gap-2 rounded-xl border-2 p-3"
    :class="mark ? markClasses[mark] : 'border-border bg-surface'"
  >
    <div class="flex items-baseline justify-between gap-2">
      <p data-test="revealed-sound-head" class="text-sm font-semibold text-ink">{{ head }}</p>
      <p data-test="revealed-sound-name" class="text-xs font-semibold" :class="mark === 'wrong' ? 'text-danger' : 'text-success'">
        {{ name }}
      </p>
    </div>
    <div class="overflow-hidden rounded-[10px] bg-surface p-2">
      <EmbeddedDiagram :embed="{ kind: 'single', ref: sound }" />
    </div>
  </div>
  <div v-else data-test="revealed-sound" class="rounded-xl border border-border bg-surface">
    <button
      data-test="revealed-sound-toggle"
      type="button"
      class="flex min-h-12 w-full items-center gap-2 px-3 text-left text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      :aria-expanded="open"
      :aria-controls="boardId"
      @click="open = !open"
    >
      <span class="flex-1">{{ t('revealedSound.folded', { label, name }) }}</span>
      <ChevronDown v-if="open" :size="18" class="text-ink-muted" aria-hidden="true" />
      <ChevronRight v-else :size="18" class="text-ink-muted" aria-hidden="true" />
    </button>
    <div v-if="open" :id="boardId" class="overflow-hidden p-2 pt-0">
      <EmbeddedDiagram :embed="{ kind: 'single', ref: sound }" />
    </div>
  </div>
</template>
