<script setup lang="ts">
import { ref, watch } from 'vue'

import KnowledgeTreeBrowser from '@/features/admin/components/KnowledgeTreeBrowser.vue'
import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { TreeNode } from '@/shared/utils/skillConceptTree'
import type { components } from '@/api/generated/core-domain'

type KnowledgeNodeKind = components['schemas']['KnowledgeNodeKind']

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    /** The trees to pick from, one tab each, in the order given. */
    trees: { kind: KnowledgeNodeKind; nodes: TreeNode[] }[]
    disabledReason?: (id: string) => string | null
    /** Offers choosing no node at all (e.g. "No parent — a root"), with this label. */
    rootLabel?: string
  }>(),
  { disabledReason: () => null, rootLabel: '' },
)
const emit = defineEmits<{ pick: [id: string]; pickRoot: []; close: [] }>()

const { t } = useTypedT()

const activeKind = ref<KnowledgeNodeKind | undefined>(props.trees[0]?.kind)
watch(
  () => props.open,
  (open) => {
    if (open) activeKind.value = props.trees[0]?.kind
  },
)
</script>

<template>
  <ModalOverlay
    :open="open"
    panel-class="flex h-[85vh] w-[min(720px,calc(100vw-32px))] flex-col gap-3 rounded-xl bg-surface-raised p-4 shadow-level2 sm:p-5"
    @close="emit('close')"
  >
    <div data-test="kmap-node-picker" role="dialog" aria-modal="true" :aria-label="title" class="flex min-h-0 flex-1 flex-col gap-3">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-base font-bold text-ink">{{ title }}</h2>
        <ModalCloseButton @close="emit('close')" />
      </div>
      <div v-if="trees.length > 1" class="flex w-fit gap-1 rounded-lg bg-surface-sunken p-1" role="tablist">
        <button
          v-for="tree in trees"
          :key="tree.kind"
          type="button"
          role="tab"
          :data-test="`kmap-picker-tab-${tree.kind}`"
          :aria-selected="activeKind === tree.kind"
          class="rounded-md px-3 py-1 text-xs font-semibold"
          :class="activeKind === tree.kind ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="activeKind = tree.kind"
        >
          {{ t(tree.kind === 'skill' ? 'knowledgeMap.tabs.skill' : 'knowledgeMap.tabs.concept') }}
        </button>
      </div>
      <button
        v-if="rootLabel"
        type="button"
        data-test="kmap-picker-root"
        class="w-fit rounded-md border border-border bg-surface-raised px-3 py-1.5 text-[0.8125rem] font-semibold text-ink"
        @click="emit('pickRoot')"
      >
        {{ rootLabel }}
      </button>
      <template v-for="tree in trees" :key="tree.kind">
        <KnowledgeTreeBrowser
          v-if="activeKind === tree.kind"
          :label="title"
          :nodes="tree.nodes"
          :selected-id="null"
          :disabled-reason="disabledReason"
          @select="emit('pick', $event)"
        />
      </template>
    </div>
  </ModalOverlay>
</template>
