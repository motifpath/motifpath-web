<script setup lang="ts">
import { Bold, Italic, Keyboard, List, Pencil, Plus, Redo2, Table2, Type, Undo2 } from 'lucide-vue-next'
import { computed } from 'vue'

import type { PromptCommands } from '@/features/teacher/composables/usePromptCommands'
import IconButton from '@/shared/components/IconButton.vue'
import { useKeyboardInset } from '@/shared/composables/useKeyboardInset'
import { useTypedT } from '@/shared/composables/useTypedT'

/**
 * The rich-text bar on a phone, docked just above the on-screen keyboard. Bold, Italic and List act
 * at once; Format, Insert and the context chip (Table inside a table, Edit on an embedded block)
 * open what the bar has no room for.
 */
const props = defineProps<{ commands: PromptCommands }>()
const emit = defineEmits<{ format: []; insert: []; table: []; edit: []; hideKeyboard: [] }>()

const { t } = useTypedT()
const keyboardInset = useKeyboardInset()

const context = computed<'table' | 'edit' | null>(() => {
  if (props.commands.selectedBlock()) return 'edit'
  if (props.commands.isActive('table')) return 'table'
  return null
})

function openContext() {
  if (context.value === 'table') emit('table')
  else emit('edit')
}
</script>

<template>
  <Teleport to="body">
    <!-- Its offset follows the keyboard's height as the browser reports it: a runtime value no
         utility class can hold. -->
    <div
      data-test="prompt-docked-bar"
      role="toolbar"
      :aria-label="t('promptEditor.format')"
      class="fixed inset-x-0 z-30 flex items-center border-t border-border bg-surface-raised px-1 shadow-level2"
      :style="{ bottom: `${keyboardInset}px` }"
      @mousedown.prevent
    >
      <IconButton
        data-test="prompt-bar-undo"
        appearance="quiet"
        :label="t('promptEditor.undo')"
        :disabled="!commands.canUndo()"
        @click="commands.undo()"
      >
        <Undo2 :size="20" aria-hidden="true" />
      </IconButton>
      <IconButton
        data-test="prompt-bar-redo"
        appearance="quiet"
        :label="t('promptEditor.redo')"
        :disabled="!commands.canRedo()"
        @click="commands.redo()"
      >
        <Redo2 :size="20" aria-hidden="true" />
      </IconButton>

      <div class="mx-1 h-5 w-px bg-border" aria-hidden="true" />

      <IconButton data-test="prompt-bar-format" appearance="quiet" :label="t('promptEditor.format')" @click="emit('format')">
        <Type :size="20" aria-hidden="true" />
      </IconButton>
      <IconButton
        data-test="prompt-bar-bold"
        appearance="quiet"
        :label="t('promptEditor.bold')"
        :pressed="commands.isActive('bold')"
        @click="commands.toggleBold()"
      >
        <Bold :size="20" aria-hidden="true" />
      </IconButton>
      <template v-if="context === null">
        <IconButton
          data-test="prompt-bar-italic"
          appearance="quiet"
          :label="t('promptEditor.italic')"
          :pressed="commands.isActive('italic')"
          @click="commands.toggleItalic()"
        >
          <Italic :size="20" aria-hidden="true" />
        </IconButton>
        <IconButton
          data-test="prompt-bar-list"
          appearance="quiet"
          :label="t('promptEditor.bulletList')"
          :pressed="commands.isActive('bulletList')"
          @click="commands.toggleBulletList()"
        >
          <List :size="20" aria-hidden="true" />
        </IconButton>
      </template>
      <button
        v-else
        type="button"
        :data-test="context === 'table' ? 'prompt-bar-table' : 'prompt-bar-edit'"
        class="ml-1 inline-flex h-12 items-center"
        @click="openContext"
      >
        <span class="inline-flex h-6 items-center gap-1.5 rounded-full bg-accent-muted px-3 text-sm font-semibold text-accent-text">
          <Table2 v-if="context === 'table'" :size="16" aria-hidden="true" />
          <Pencil v-else :size="16" aria-hidden="true" />
          {{ context === 'table' ? t('promptEditor.table') : t('promptEditor.edit') }}
        </span>
      </button>

      <div class="flex-1" />

      <IconButton data-test="prompt-bar-insert" appearance="quiet" :label="t('promptEditor.insert')" @click="emit('insert')">
        <Plus :size="20" aria-hidden="true" />
      </IconButton>
      <IconButton
        data-test="prompt-bar-hide-keyboard"
        appearance="quiet"
        :label="t('promptEditor.hideKeyboard')"
        @click="emit('hideKeyboard')"
      >
        <Keyboard :size="20" aria-hidden="true" />
      </IconButton>
    </div>
  </Teleport>
</template>
