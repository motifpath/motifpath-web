<script setup lang="ts">
import { ArrowLeft, ChevronRight } from 'lucide-vue-next'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

import { useTypedT } from '@/shared/composables/useTypedT'

/**
 * The top of every authoring editor: the way back to its section, what is being edited, and Save.
 * Saving is always explicit, so Save stays in view; when nothing is pending it reads "Saved ✓".
 * On a phone it is an app bar with a back arrow; on a wide screen, a page header.
 */
withDefaults(
  defineProps<{
    sectionLabel: string
    sectionTo: RouteLocationRaw
    title: string
    /** `saved` when nothing is pending, `unsaved` when there is something to save, `saving` while it saves. */
    saveState: 'saved' | 'unsaved' | 'saving'
    /** False when this person can't save here (no permission, a retired item). */
    canSave?: boolean
    compact?: boolean
  }>(),
  { canSave: true, compact: false },
)
const emit = defineEmits<{ save: [] }>()

const { t } = useTypedT()
</script>

<template>
  <component
    :is="compact ? 'div' : 'header'"
    data-test="editor-app-bar"
    class="sticky top-0 z-20 flex gap-3"
    :class="compact ? 'box-content h-16 items-center border-b border-border bg-surface-raised px-2 pt-inset-top' : 'items-end bg-surface px-[48px] pb-4 pt-8'"
  >
    <template v-if="compact">
      <RouterLink
        :to="sectionTo"
        data-test="editor-app-bar-back"
        :aria-label="t('editorAppBar.back', { section: sectionLabel })"
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface-sunken"
      >
        <ArrowLeft :size="20" aria-hidden="true" />
      </RouterLink>
      <div class="flex min-w-0 flex-1 flex-col">
        <span data-test="editor-app-bar-section" class="truncate text-xs text-ink-muted">{{ sectionLabel }}</span>
        <h1 data-test="editor-app-bar-title" class="truncate text-sm font-semibold text-ink">{{ title }}</h1>
      </div>
    </template>
    <div v-else class="flex min-w-0 flex-1 flex-col gap-1">
      <RouterLink
        :to="sectionTo"
        class="flex items-center gap-1 self-start text-sm font-medium text-accent-text hover:underline"
      >
        <span data-test="editor-app-bar-section">{{ sectionLabel }}</span>
        <ChevronRight :size="14" aria-hidden="true" />
      </RouterLink>
      <h1 data-test="editor-app-bar-title" class="truncate text-[28px] font-bold leading-[34px] text-ink">{{ title }}</h1>
    </div>

    <!-- Other ways of saving (Save as…) sit next to Save, so every way of saving is in one place. -->
    <slot name="actions" />
    <template v-if="canSave">
      <span v-if="saveState === 'saved'" data-test="editor-app-bar-saved" class="flex h-10 shrink-0 items-center px-3 text-sm text-ink-muted">
        {{ t('editorAppBar.saved') }}
      </span>
      <button
        v-else
        type="button"
        data-test="editor-app-bar-save"
        :aria-busy="saveState === 'saving'"
        class="h-10 shrink-0 rounded-full px-4 text-sm font-semibold"
        :class="saveState === 'saving' ? 'bg-accent-muted text-accent-text' : 'bg-accent text-accent-fg'"
        @click="saveState === 'unsaved' && emit('save')"
      >
        {{ saveState === 'saving' ? t('editorAppBar.saving') : t('editorAppBar.save') }}
      </button>
    </template>
  </component>
</template>
