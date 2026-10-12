<script setup lang="ts">
import {
  Baseline,
  Bold as BoldIcon,
  Columns3,
  Redo2,
  Undo2,
  Frame,
  Guitar,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic as ItalicIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  Merge,
  Minus,
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  PaintBucket,
  PanelLeft,
  PanelTop,
  Pilcrow,
  Plus,
  Rows3,
  Split,
  SquareDashed,
  Strikethrough,
  Table2,
  Trash2,
  Music,
} from 'lucide-vue-next'

import type { PromptCommands } from '@/features/teacher/composables/usePromptCommands'
import ColorPaletteMenu from '@/shared/components/ColorPaletteMenu.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

/** Today's one-row toolbar, with the table row while the cursor is in a table: Medium and Expanded. */
defineProps<{
  commands: PromptCommands
  /** Whether Insert offers a song chart: only lesson content does, never an exercise. */
  songCharts: boolean
}>()
const emit = defineEmits<{ link: []; image: []; diagram: []; songChart: [] }>()

const { t } = useTypedT()
</script>

<template>
  <div class="sticky top-16 z-10 flex flex-col gap-1.5 bg-surface pb-1.5">
    <div
      class="flex flex-wrap items-center gap-1 rounded-md border border-border bg-surface-sunken p-1.5"
    >
      <button
        type="button"
        data-test="prompt-toolbar-undo"
        class="rounded p-1.5 text-ink-muted disabled:opacity-40"
        :title="t('promptEditor.undo')"
        :disabled="!commands.canUndo()"
        @click="commands.undo()"
      >
        <Undo2 :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-redo"
        class="rounded p-1.5 text-ink-muted disabled:opacity-40"
        :title="t('promptEditor.redo')"
        :disabled="!commands.canRedo()"
        @click="commands.redo()"
      >
        <Redo2 :size="16" aria-hidden="true" />
      </button>

      <div class="mx-1 h-4 w-px bg-border" />

      <button
        type="button"
        data-test="prompt-toolbar-h1"
        class="rounded p-1.5"
        :class="commands.isActive('heading', { level: 1 }) ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="commands.toggleHeading(1)"
      >
        <Heading1 :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-h2"
        class="rounded p-1.5"
        :class="commands.isActive('heading', { level: 2 }) ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="commands.toggleHeading(2)"
      >
        <Heading2 :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-h3"
        class="rounded p-1.5"
        :class="commands.isActive('heading', { level: 3 }) ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="commands.toggleHeading(3)"
      >
        <Heading3 :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-paragraph"
        class="rounded p-1.5"
        :class="commands.isActive('paragraph') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="commands.setParagraph()"
      >
        <Pilcrow :size="16" aria-hidden="true" />
      </button>

      <div class="mx-1 h-4 w-px bg-border" />

      <button
        type="button"
        data-test="prompt-toolbar-bold"
        class="rounded p-1.5"
        :class="commands.isActive('bold') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="commands.toggleBold()"
      >
        <BoldIcon :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-italic"
        class="rounded p-1.5"
        :class="commands.isActive('italic') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="commands.toggleItalic()"
      >
        <ItalicIcon :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-strike"
        class="rounded p-1.5"
        :class="commands.isActive('strike') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="commands.toggleStrike()"
      >
        <Strikethrough :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-highlight"
        class="rounded p-1.5"
        :class="commands.isActive('highlight') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="commands.toggleHighlight()"
      >
        <Highlighter :size="16" aria-hidden="true" />
      </button>
      <ColorPaletteMenu
        test-id="prompt-toolbar-font-color"
        :title="t('promptEditor.fontColor')"
        :model-value="commands.currentTextStyle('color')"
        @select="commands.setFontColor"
      >
        <Baseline :size="16" aria-hidden="true" />
      </ColorPaletteMenu>
      <ColorPaletteMenu
        test-id="prompt-toolbar-background-color"
        :title="t('promptEditor.backgroundColor')"
        :model-value="commands.currentTextStyle('backgroundColor')"
        @select="commands.setBackgroundColor"
      >
        <PaintBucket :size="16" aria-hidden="true" />
      </ColorPaletteMenu>

      <div class="mx-1 h-4 w-px bg-border" />

      <button
        type="button"
        data-test="prompt-toolbar-align-left"
        class="rounded p-1.5"
        :class="commands.isActive({ textAlign: 'left' }) ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="commands.setAlign('left')"
      >
        <AlignLeft :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-align-center"
        class="rounded p-1.5"
        :class="commands.isActive({ textAlign: 'center' }) ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="commands.setAlign('center')"
      >
        <AlignCenter :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-align-right"
        class="rounded p-1.5"
        :class="commands.isActive({ textAlign: 'right' }) ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="commands.setAlign('right')"
      >
        <AlignRight :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-align-justify"
        class="rounded p-1.5"
        :class="
          commands.isActive({ textAlign: 'justify' }) ? 'bg-accent text-accent-fg' : 'text-ink-muted'
        "
        @click="commands.setAlign('justify')"
      >
        <AlignJustify :size="16" aria-hidden="true" />
      </button>

      <div class="mx-1 h-4 w-px bg-border" />

      <button
        type="button"
        data-test="prompt-toolbar-bullet-list"
        class="rounded p-1.5"
        :class="commands.isActive('bulletList') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="commands.toggleBulletList()"
      >
        <List :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-ordered-list"
        class="rounded p-1.5"
        :class="commands.isActive('orderedList') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="commands.toggleOrderedList()"
      >
        <ListOrdered :size="16" aria-hidden="true" />
      </button>

      <div class="mx-1 h-4 w-px bg-border" />

      <button
        type="button"
        data-test="prompt-toolbar-link"
        class="rounded p-1.5"
        :class="commands.isActive('link') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="emit('link')"
      >
        <LinkIcon :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-table"
        class="rounded p-1.5 text-ink-muted"
        @click="commands.insertTable()"
      >
        <Table2 :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-image"
        class="rounded p-1.5 text-ink-muted"
        @click="emit('image')"
      >
        <ImageIcon :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-diagram"
        class="rounded p-1.5 text-ink-muted"
        :title="t('promptEditor.insertDiagram')"
        :aria-label="t('promptEditor.insertDiagram')"
        @click="emit('diagram')"
      >
        <Guitar :size="16" aria-hidden="true" />
      </button>
      <button
        v-if="songCharts"
        type="button"
        data-test="prompt-toolbar-song-chart"
        class="rounded p-1.5 text-ink-muted"
        :title="t('promptEditor.insertSongChart')"
        :aria-label="t('promptEditor.insertSongChart')"
        @click="emit('songChart')"
      >
        <Music :size="16" aria-hidden="true" />
      </button>
    </div>

    <div
      v-if="commands.isActive('table')"
      data-test="prompt-table-toolbar"
      class="flex flex-wrap items-center gap-1 rounded-md border border-border bg-surface-sunken p-1.5 text-ink-muted"
    >
      <button
        type="button"
        data-test="prompt-table-add-column"
        class="relative rounded p-1.5"
        :title="t('promptEditor.addColumn')"
        @click="commands.addColumn()"
      >
        <Columns3 :size="16" aria-hidden="true" />
        <Plus :size="10" class="absolute bottom-0.5 right-0.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-table-delete-column"
        class="relative rounded p-1.5"
        :title="t('promptEditor.deleteColumn')"
        @click="commands.deleteColumn()"
      >
        <Columns3 :size="16" aria-hidden="true" />
        <Minus :size="10" class="absolute bottom-0.5 right-0.5" aria-hidden="true" />
      </button>
      <div class="mx-1 h-4 w-px bg-border" />
      <button
        type="button"
        data-test="prompt-table-add-row"
        class="relative rounded p-1.5"
        :title="t('promptEditor.addRow')"
        @click="commands.addRow()"
      >
        <Rows3 :size="16" aria-hidden="true" />
        <Plus :size="10" class="absolute bottom-0.5 right-0.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-table-delete-row"
        class="relative rounded p-1.5"
        :title="t('promptEditor.deleteRow')"
        @click="commands.deleteRow()"
      >
        <Rows3 :size="16" aria-hidden="true" />
        <Minus :size="10" class="absolute bottom-0.5 right-0.5" aria-hidden="true" />
      </button>
      <div class="mx-1 h-4 w-px bg-border" />
      <button
        type="button"
        data-test="prompt-table-toggle-header-row"
        class="rounded p-1.5"
        :title="t('promptEditor.toggleHeaderRow')"
        @click="commands.toggleHeaderRow()"
      >
        <PanelTop :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-table-toggle-header-column"
        class="rounded p-1.5"
        :title="t('promptEditor.toggleHeaderColumn')"
        @click="commands.toggleHeaderColumn()"
      >
        <PanelLeft :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-table-toggle-header-cell"
        class="rounded p-1.5"
        :title="t('promptEditor.toggleHeaderCell')"
        @click="commands.toggleHeaderCell()"
      >
        <Frame :size="16" aria-hidden="true" />
      </button>
      <div class="mx-1 h-4 w-px bg-border" />
      <button type="button" data-test="prompt-table-merge-cells" class="rounded p-1.5" :title="t('promptEditor.mergeCells')" @click="commands.mergeCells()">
        <Merge :size="16" aria-hidden="true" />
      </button>
      <button type="button" data-test="prompt-table-split-cell" class="rounded p-1.5" :title="t('promptEditor.splitCell')" @click="commands.splitCell()">
        <Split :size="16" aria-hidden="true" />
      </button>
      <div class="mx-1 h-4 w-px bg-border" />
      <button
        type="button"
        data-test="prompt-table-toggle-border"
        class="rounded p-1.5"
        :title="t('promptEditor.toggleCellBorder')"
        @click="commands.toggleCellBorder()"
      >
        <SquareDashed :size="16" aria-hidden="true" />
      </button>
      <ColorPaletteMenu
        test-id="prompt-table-cell-background"
        :title="t('promptEditor.cellBackgroundColor')"
        :model-value="commands.currentCellBackground()"
        @select="commands.setCellBackground"
      >
        <PaintBucket :size="16" aria-hidden="true" />
      </ColorPaletteMenu>
      <div class="mx-1 h-4 w-px bg-border" />
      <button
        type="button"
        data-test="prompt-table-delete"
        class="rounded p-1.5 text-danger"
        :title="t('promptEditor.deleteTable')"
        @click="commands.deleteTable()"
      >
        <Trash2 :size="16" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
