<script setup lang="ts">
/**
 * The diagram editor's language bar: one flag
 * tab per language the diagram supports, the active one setting the language
 * the editor below is shown in. Custom diagrams can add languages, or remove
 * the active one; removing asks first, since it deletes that language's text.
 */
import { computed, ref } from 'vue'
import { AlertCircle, Plus, X } from 'lucide-vue-next'

import { REGION_CAPTION_MAX_LENGTH, type MissingText } from '@/features/teacher/composables/useDiagramForm'
import { OFFERED_LANGUAGE_CODES } from '@/i18n'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { languageBadge, languageLabelKey } from '@/shared/utils/languageLabels'

const props = defineProps<{
  /** The diagram's Language.codes, in display order. */
  languages: string[]
  active: string
  /** What each language still lacks; a language with anything missing is flagged on its tab. */
  missing: Record<string, MissingText[]>
  /** No adding or removing languages, e.g. for a basic template, which needs them all. */
  locked: boolean
}>()
const emit = defineEmits<{ select: [code: string]; add: [code: string]; remove: [code: string] }>()

const { t } = useTypedT()

function languageLabel(code: string): string {
  const key = languageLabelKey(code)
  return key === null ? code : t(key)
}

function isIncomplete(code: string): boolean {
  return (props.missing[code] ?? []).length > 0
}

function describeMissing(item: MissingText): string {
  switch (item.kind) {
    case 'name':
      return t('diagramLanguageTabs.missingName')
    case 'regionCaption':
      return t('diagramLanguageTabs.missingRegionCaption', { n: item.region })
    case 'regionCaptionTooLong':
      return t('diagramLanguageTabs.regionCaptionTooLong', { n: item.region, max: REGION_CAPTION_MAX_LENGTH })
    case 'markerLabel':
      return t('diagramLanguageTabs.missingMarkerLabel', { n: item.position })
    case 'markerNote':
      return t('diagramLanguageTabs.missingMarkerNote', { n: item.position })
  }
}

/** Names what a language still lacks, shown on hover; undefined when it lacks nothing. */
function missingSummary(code: string): string | undefined {
  if (!isIncomplete(code)) return undefined
  return t('diagramLanguageTabs.missingText', {
    language: languageLabel(code),
    items: (props.missing[code] ?? []).map(describeMissing).join(', '),
  })
}

// The tab's accessible name replaces its content, so a missing-text warning has to be part of it.
function tabLabel(code: string): string {
  return missingSummary(code) ?? languageLabel(code)
}

const addable = computed(() =>
  props.locked ? [] : OFFERED_LANGUAGE_CODES.filter((code) => !props.languages.includes(code)),
)
const canRemove = computed(() => !props.locked && props.languages.length > 1)

const addMenuOpen = ref(false)
function add(code: string) {
  addMenuOpen.value = false
  emit('add', code)
}

// Closes the menu once focus leaves the picker (its button and options), not when it moves within.
function onPickerFocusOut(event: FocusEvent) {
  const picker = event.currentTarget
  const next = event.relatedTarget
  if (picker instanceof HTMLElement && next instanceof Node && picker.contains(next)) return
  addMenuOpen.value = false
}

const pendingRemoval = ref<string | null>(null)
function confirmRemoval() {
  if (pendingRemoval.value) emit('remove', pendingRemoval.value)
  pendingRemoval.value = null
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <div role="tablist" :aria-label="t('diagramLanguageTabs.label')" class="flex flex-wrap gap-1 rounded-lg bg-surface-sunken p-1">
      <button
        v-for="code in languages"
        :key="code"
        type="button"
        role="tab"
        :data-test="`language-tab-${code}`"
        :aria-selected="code === active"
        :aria-label="tabLabel(code)"
        :title="missingSummary(code)"
        class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold"
        :class="code === active ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="emit('select', code)"
      >
        <span aria-hidden="true" class="text-base leading-none">{{ languageBadge(code).flag }}</span>
        <span aria-hidden="true">{{ languageBadge(code).shortCode }}</span>
        <AlertCircle
          v-if="isIncomplete(code)"
          :data-test="`language-tab-missing-${code}`"
          :size="14"
          class="text-warning"
          aria-hidden="true"
        />
      </button>
    </div>

    <button
      v-if="canRemove"
      type="button"
      :data-test="`remove-language-${active}`"
      :aria-label="t('diagramLanguageTabs.removeLanguage', { language: languageLabel(active) })"
      :title="t('diagramLanguageTabs.removeLanguage', { language: languageLabel(active) })"
      class="flex items-center rounded-md p-2 text-ink-muted hover:text-ink"
      @click="pendingRemoval = active"
    >
      <X :size="14" aria-hidden="true" />
    </button>

    <div
      v-if="addable.length > 0"
      data-test="add-language-picker"
      class="relative"
      @focusout="onPickerFocusOut"
      @keydown.escape="addMenuOpen = false"
    >
      <button
        type="button"
        data-test="add-language"
        :aria-label="t('diagramLanguageTabs.addLanguage')"
        :title="t('diagramLanguageTabs.addLanguage')"
        :aria-expanded="addMenuOpen"
        class="flex items-center rounded-md border border-dashed border-border p-2 text-ink-muted hover:text-ink"
        @click="addMenuOpen = !addMenuOpen"
      >
        <Plus :size="14" aria-hidden="true" />
      </button>
      <div
        v-if="addMenuOpen"
        data-test="add-language-menu"
        class="absolute left-0 top-full z-10 mt-1 flex min-w-40 flex-col rounded-md border border-border bg-surface-raised p-1 shadow-level2"
      >
        <button
          v-for="code in addable"
          :key="code"
          type="button"
          :data-test="`add-language-option-${code}`"
          class="flex items-center gap-2 rounded px-2.5 py-1.5 text-left text-sm hover:bg-surface-sunken"
          @click="add(code)"
        >
          <span aria-hidden="true">{{ languageBadge(code).flag }}</span>
          {{ languageLabel(code) }}
        </button>
      </div>
    </div>

    <ModalOverlay
      :open="pendingRemoval !== null"
      panel-class="flex w-[400px] max-w-[95vw] flex-col gap-4 rounded-xl bg-surface-raised p-5 shadow-level2"
      @close="pendingRemoval = null"
    >
      <div v-if="pendingRemoval" data-test="remove-language-dialog" role="alertdialog" class="flex flex-col gap-4">
        <span class="text-base font-bold text-ink">{{
          t('diagramLanguageTabs.removeTitle', { language: languageLabel(pendingRemoval) })
        }}</span>
        <p class="text-sm text-ink-muted">
          {{ t('diagramLanguageTabs.removeBody', { language: languageLabel(pendingRemoval) }) }}
        </p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            data-test="remove-language-cancel"
            class="rounded-md border border-border px-3.5 py-2 text-sm font-semibold text-ink-muted"
            @click="pendingRemoval = null"
          >
            {{ t('diagramLanguageTabs.cancel') }}
          </button>
          <button
            type="button"
            data-test="remove-language-confirm"
            class="rounded-md bg-danger px-3.5 py-2 text-sm font-semibold text-danger-fg"
            @click="confirmRemoval"
          >
            {{ t('diagramLanguageTabs.confirmRemove') }}
          </button>
        </div>
      </div>
    </ModalOverlay>
  </div>
</template>
