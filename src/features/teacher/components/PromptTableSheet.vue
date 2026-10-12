<script setup lang="ts">
import { Columns3, Frame, Merge, Minus, PanelLeft, PanelTop, Plus, Rows3, Split, SquareDashed, Trash2 } from 'lucide-vue-next'

import type { PromptCommands } from '@/features/teacher/composables/usePromptCommands'
import ColorPalette from '@/shared/components/ColorPalette.vue'
import IconButton from '@/shared/components/IconButton.vue'
import OverlayPanel from '@/shared/components/OverlayPanel.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

/**
 * Every table command of today's toolbar, on a phone, as icon buttons a long press names. Cells are
 * merged the way they are on a computer: drag across them to select several, then Merge.
 */
defineProps<{ open: boolean; commands: PromptCommands }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useTypedT()

const SECTION = 'text-xs font-semibold uppercase tracking-wide text-ink-muted'
</script>

<template>
  <OverlayPanel :open="open" :title="t('promptEditor.table')" @close="emit('close')">
    <div data-test="prompt-table-sheet" class="flex flex-col gap-3">
      <section class="flex flex-col gap-1">
        <h3 :class="SECTION">{{ t('promptEditor.columnsAndRows') }}</h3>
        <div class="flex flex-wrap gap-x-2">
          <IconButton data-test="prompt-table-add-column" :label="t('promptEditor.addColumn')" @click="commands.addColumn()">
            <Columns3 :size="20" aria-hidden="true" />
            <Plus :size="12" class="-ml-1 self-end" aria-hidden="true" />
          </IconButton>
          <IconButton data-test="prompt-table-delete-column" :label="t('promptEditor.deleteColumn')" @click="commands.deleteColumn()">
            <Columns3 :size="20" aria-hidden="true" />
            <Minus :size="12" class="-ml-1 self-end" aria-hidden="true" />
          </IconButton>
          <IconButton data-test="prompt-table-add-row" :label="t('promptEditor.addRow')" @click="commands.addRow()">
            <Rows3 :size="20" aria-hidden="true" />
            <Plus :size="12" class="-ml-1 self-end" aria-hidden="true" />
          </IconButton>
          <IconButton data-test="prompt-table-delete-row" :label="t('promptEditor.deleteRow')" @click="commands.deleteRow()">
            <Rows3 :size="20" aria-hidden="true" />
            <Minus :size="12" class="-ml-1 self-end" aria-hidden="true" />
          </IconButton>
        </div>
      </section>

      <section class="flex flex-col gap-1">
        <h3 :class="SECTION">{{ t('promptEditor.headers') }}</h3>
        <div class="flex flex-wrap gap-x-2">
          <IconButton data-test="prompt-table-toggle-header-row" :label="t('promptEditor.toggleHeaderRow')" @click="commands.toggleHeaderRow()">
            <PanelTop :size="20" aria-hidden="true" />
          </IconButton>
          <IconButton
            data-test="prompt-table-toggle-header-column"
            :label="t('promptEditor.toggleHeaderColumn')"
            @click="commands.toggleHeaderColumn()"
          >
            <PanelLeft :size="20" aria-hidden="true" />
          </IconButton>
          <IconButton data-test="prompt-table-toggle-header-cell" :label="t('promptEditor.toggleHeaderCell')" @click="commands.toggleHeaderCell()">
            <Frame :size="20" aria-hidden="true" />
          </IconButton>
        </div>
      </section>

      <section class="flex flex-col gap-1">
        <h3 :class="SECTION">{{ t('promptEditor.cells') }}</h3>
        <div class="flex flex-wrap gap-x-2">
          <IconButton
            data-test="prompt-table-merge-cells"
            :label="t('promptEditor.mergeCells')"
            :disabled="!commands.canMergeCells()"
            @click="commands.mergeCells()"
          >
            <Merge :size="20" aria-hidden="true" />
          </IconButton>
          <IconButton
            data-test="prompt-table-split-cell"
            :label="t('promptEditor.splitCell')"
            :disabled="!commands.canSplitCell()"
            @click="commands.splitCell()"
          >
            <Split :size="20" aria-hidden="true" />
          </IconButton>
          <IconButton data-test="prompt-table-toggle-border" :label="t('promptEditor.toggleCellBorder')" @click="commands.toggleCellBorder()">
            <SquareDashed :size="20" aria-hidden="true" />
          </IconButton>
        </div>
        <div data-test="prompt-table-cell-background" class="flex flex-col gap-2 pt-1">
          <span class="text-sm text-ink">{{ t('promptEditor.cellBackgroundColor') }}</span>
          <ColorPalette :model-value="commands.currentCellBackground()" @select="commands.setCellBackground" />
        </div>
      </section>

      <section class="flex flex-col gap-1">
        <h3 :class="SECTION">{{ t('promptEditor.table') }}</h3>
        <div>
          <IconButton data-test="prompt-table-delete" tone="danger" :label="t('promptEditor.deleteTable')" @click="commands.deleteTable()">
            <Trash2 :size="20" aria-hidden="true" />
          </IconButton>
        </div>
      </section>

      <p class="text-xs text-ink-muted">{{ t('promptEditor.tableHint') }}</p>
    </div>
  </OverlayPanel>
</template>
