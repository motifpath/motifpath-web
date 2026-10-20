<script setup lang="ts">
import { computed, ref, shallowRef, watch, watchEffect } from 'vue'
import { Monitor } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import { useKnowledgeTrees } from '@/shared/composables/useKnowledgeTrees'
import { useTypedT } from '@/shared/composables/useTypedT'

import DiagramBoardToolbar from '@/features/teacher/components/DiagramBoardToolbar.vue'
import DiagramPreviewModal from '@/features/teacher/components/DiagramPreviewModal.vue'
import DiagramLanguageTabs from '@/features/teacher/components/DiagramLanguageTabs.vue'
import DiagramRegionsEditor from '@/features/teacher/components/DiagramRegionsEditor.vue'
import DiagramSequenceEditor from '@/features/teacher/components/DiagramSequenceEditor.vue'
import DiagramPlayer from '@/shared/components/diagram/DiagramPlayer.vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import FrettedDiagramEditor from '@/features/teacher/components/FrettedDiagramEditor.vue'
import OverlayDiagramsModal from '@/features/teacher/components/OverlayDiagramsModal.vue'
import SaveDiagramAsModal from '@/features/teacher/components/SaveDiagramAsModal.vue'
import SkillConceptTreePicker from '@/shared/components/SkillConceptTreePicker.vue'
import { useCreateDiagram } from '@/features/teacher/composables/useCreateDiagram'
import { useDiagram } from '@/features/teacher/composables/useDiagram'
import { useDiagramForm } from '@/features/teacher/composables/useDiagramForm'
import { useDiagramOverlays } from '@/features/teacher/composables/useDiagramOverlays'
import { useDiagramSequence } from '@/features/teacher/composables/useDiagramSequence'
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useUpdateDiagram } from '@/features/teacher/composables/useUpdateDiagram'
import EditorAppBar from '@/shared/components/EditorAppBar.vue'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import LocaleScope from '@/shared/components/LocaleScope.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import SaveBlockers from '@/shared/components/SaveBlockers.vue'
import UnsavedChangesGuard from '@/shared/components/UnsavedChangesGuard.vue'
import { useSaveBlockers } from '@/shared/composables/useSaveBlockers'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useToast } from '@/shared/composables/useToast'
import { canEditDiagram } from '@/shared/utils/diagramOwnership'
import { CHROMATIC_SCALE } from '@/shared/utils/musicTheory'
import { i18n, OFFERED_LANGUAGE_CODES, fromApiLanguageCode, toApiLanguageCode } from '@/i18n'
import type { components } from '@/api/generated/core-domain'
import { useCurrentUserStore } from '@/stores/currentUser'
import TeachShell from '@/shared/components/TeachShell.vue'

type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']
type DiagramKind = Diagram['kind']

const currentUser = useCurrentUserStore()
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)

const { sizeClass, isCompact } = useSizeClass()
const isExpanded = computed(() => sizeClass.value === 'expanded')
const { localizedName } = useLocalizedName()
const { t } = useTypedT()

const route = useRoute()
const router = useRouter()
const rawDiagramId = route.params.id
const diagramId = Array.isArray(rawDiagramId) ? rawDiagramId[0] : rawDiagramId
const isEditMode = !!diagramId

const {
  diagram: loadedDiagram,
  isLoading: loadingDiagram,
  error: loadError,
  retry: retryLoad,
} = diagramId
  ? useDiagram(diagramId)
  : { diagram: ref(null), isLoading: ref(false), error: ref(false), retry: async () => {} }

const { instruments } = useListInstruments()
const frettedInstruments = computed(() => instruments.value.filter((i) => i.family === 'fretted'))

const form = useDiagramForm()
const sequenceEditor = useDiagramSequence(form)
const {
  overlays,
  overlayIds,
  regionPerLayer,
  add: addOverlay,
  remove: removeOverlay,
  preview: stackPreview,
  canMerge,
  merge,
  discard: discardOverlays,
} = useDiagramOverlays(form)

// The editor below the language tabs is shown in the active tab's language, as a reader of
// that language will see the diagram; the top bar stays in the
// author's UI language. The tab stays on the UI language, or the first one, until one is picked.
const selectedLanguage = ref<string | null>(null)
const activeLanguage = computed(() => {
  const languages = form.languages.value
  if (selectedLanguage.value && languages.includes(selectedLanguage.value)) return selectedLanguage.value
  const uiLanguage = toApiLanguageCode(i18n.global.locale.value)
  return languages.includes(uiLanguage) ? uiLanguage : (languages[0] ?? uiLanguage)
})
const editingLocale = computed(() => fromApiLanguageCode(activeLanguage.value))
const { t: te } = useTypedT({ locale: editingLocale })
const { localizedName: localizedNameInEditor } = useLocalizedName({ locale: editingLocale })
const { createDiagram } = useCreateDiagram()
const { updateDiagram } = useUpdateDiagram()
const {
  skillNodes,
  conceptNodes,
  skillsLoading,
  conceptsLoading,
  skillsError,
  conceptsError,
  retrySkills,
  retryConcepts,
  suggestedSkillIds,
  suggestedConceptIds,
} =
  useKnowledgeTrees(
    { skillIds: form.skillIds, conceptIds: form.conceptIds },
    { locale: editingLocale },
    { refreshOnReturn: true },
  )
// Classification must suit every instrument the diagram is for; before any are
// toggled, that is the layout instrument alone.
const classificationInstrumentIds = computed(() =>
  form.instrumentIds.value.length > 0 ? form.instrumentIds.value : [form.instrumentId.value].filter(Boolean),
)

const savedDiagramId = ref('')
// Who may save over the diagram being edited follows from the server's copy of it; null
// until it has been saved once, since a brand new diagram is always the caller's own.
const savedOwnership = ref<Pick<Diagram, 'kind' | 'purpose' | 'created_by'> | null>(null)

function adoptSaved(diagram: Diagram) {
  savedDiagramId.value = diagram.diagram_id
  savedOwnership.value = { kind: diagram.kind, purpose: diagram.purpose, created_by: diagram.created_by }
}

watch(
  loadedDiagram,
  (diagram) => {
    if (!diagram) return
    form.loadFromDiagram(diagram)
    adoptSaved(diagram)
  },
  { immediate: true },
)

const isAdmin = computed(() => currentUser.profile?.role === 'admin')
// Layers merged into a diagram loaded from the server are saved as a new diagram, never over it,
// so no diagram that was overlaid or merged into changes. Cleared once that new diagram is saved.
const mergedIntoSaved = ref(false)
const canSaveInPlace = computed(
  () =>
    canAuthor.value &&
    !mergedIntoSaved.value &&
    (savedOwnership.value === null || canEditDiagram(savedOwnership.value, currentUser.profile)),
)
// Only a saved diagram has something to copy; a new one is saved with the plain Save.
const canSaveAs = computed(() => canAuthor.value && savedDiagramId.value !== '')
// An admin may save as a template at any point, including a brand new diagram.
const canSaveAsTemplate = computed(() => isAdmin.value)
// A template is named in every offered language, so its labels, notes and captions must be too.
const templateTextComplete = computed(() => form.hasTextIn(OFFERED_LANGUAGE_CODES))
// Outlined counterpart of the bar's filled Save pill: clearly a live button, but secondary.
const secondarySaveClass =
  'rounded-full border border-accent px-[14px] py-[7px] text-[13px] font-bold text-accent-text disabled:cursor-not-allowed disabled:opacity-50'
// A basic diagram is shared with every teacher, so it can only be saved named in every
// language. Whoever may save over one (an admin) edits it in every language, with none
// removable; anyone else only copies it, and a custom copy may drop languages.
const isBasic = computed(() => savedOwnership.value?.kind === 'basic')
const editsTemplate = computed(() => isBasic.value && canSaveInPlace.value)
const namesMissing = computed(() => editsTemplate.value && !form.hasEveryName.value)
watchEffect(() => {
  if (!editsTemplate.value) return
  OFFERED_LANGUAGE_CODES.filter((code) => !form.languages.value.includes(code)).forEach(form.addLanguage)
})

/** Adds a language and opens its tab, so its text can be filled in straight away. */
function addLanguage(code: string) {
  form.addLanguage(code)
  selectedLanguage.value = code
}

// Save as keeps the diagram's own languages; Save as template needs every language.
const saveAsLanguages = computed(() =>
  saveAsKind.value === 'basic' ? OFFERED_LANGUAGE_CODES : form.languages.value,
)
// A copy of a saved diagram is suggested as "<name> (copy)" in each language's own words; a
// new diagram, or merged layers (a new diagram in their own right), keep their own names.
const saveAsInitialNames = computed(() =>
  Object.fromEntries(
    saveAsLanguages.value.map((code) => {
      const name = (form.names.value[code] ?? '').trim()
      if (!savedDiagramId.value || mergedIntoSaved.value || name === '') return [code, name]
      return [code, i18n.global.t('diagramAuthoringView.copyName', { name }, { locale: fromApiLanguageCode(code) })]
    }),
  ),
)
const readOnlyReason = computed(() => {
  if (canSaveInPlace.value || mergedIntoSaved.value || !savedOwnership.value) return ''
  if (savedOwnership.value.purpose === 'chord_voicing') return te('diagramAuthoringView.readOnlyChordVoicing')
  return savedOwnership.value.kind === 'basic'
    ? te('diagramAuthoringView.readOnlyTemplate')
    : te('diagramAuthoringView.readOnlyOtherTeacher')
})

const selectedInstrument = computed(() =>
  instruments.value.find((i) => i.instrument_id === form.instrumentId.value),
)
const compatibleInstruments = computed(() => {
  const layout = selectedInstrument.value
  if (!layout || layout.family !== 'fretted') return []
  return frettedInstruments.value.filter(
    (instrument) =>
      instrument.string_count === layout.string_count &&
      JSON.stringify(instrument.tuning) === JSON.stringify(layout.tuning),
  )
})

function chooseLayout(instrumentId: string) {
  form.instrumentId.value = instrumentId
  form.instrumentIds.value = [instrumentId]
}

function toggleCompatibleInstrument(instrumentId: string) {
  if (instrumentId === form.instrumentId.value) return
  form.instrumentIds.value = form.instrumentIds.value.includes(instrumentId)
    ? form.instrumentIds.value.filter((id) => id !== instrumentId)
    : [...form.instrumentIds.value, instrumentId]
}

// Only tracks tuning here — never auto-recomputes on instrument change, since that would
// blindly overwrite interval/note_name an edit-mode load just populated from the server (no
// root note is persisted to derive them back from). Recompute only happens from an explicit
// root-note pick (onRootNoteChange) or when a brand new position is placed.
watch(
  selectedInstrument,
  (instrument) => {
    form.tuning.value = instrument?.tuning ?? []
  },
  { immediate: true },
)

function onRootNoteChange(rootNote: string) {
  form.rootNote.value = rootNote
  form.recomputeFromRoot()
}

const showPreviewModal = ref(false)

const colorHint = computed(() =>
  form.canClearColor.value
    ? te('diagramAuthoringView.colorHint')
    : `${te('diagramAuthoringView.colorHint')} ${te('diagramAuthoringView.colorCannotClearHint')}`,
)

/** The diagram as the form holds it, with the given positions and regions, for a viewer to draw. */
function diagramForPreview(positions: Diagram['positions'], regions: Diagram['regions']): Diagram {
  const request = form.toCreateDiagramRequest()
  return {
    diagram_id: savedDiagramId.value,
    instrument_id: form.instrumentId.value,
    instrument_ids: [...form.instrumentIds.value],
    names: request.names,
    languages: Object.keys(request.names).sort(),
    kind: savedOwnership.value?.kind ?? 'custom',
    purpose: savedOwnership.value?.purpose ?? 'general',
    created_by: savedOwnership.value?.created_by ?? {
      user_id: currentUser.profile?.user_id ?? '',
      display_name: currentUser.profile?.display_name ?? '',
    },
    root_note: request.root_note ?? null,
    label_display: form.labelDisplay.value,
    color: form.color.value,
    mode: request.mode ?? null,
    playbacks: form.toDiagramPlaybacks(),
    default_playback_id: request.default_playback_id ?? null,
    positions,
    regions,
    classification: { skills: [], concepts: [] },
    created_at: '',
    updated_at: '',
  }
}

// The board as students see it. On a phone it is only shown, so it is drawn even before a position
// is placed; the full preview waits for one.
const boardPreview = computed<Diagram | null>(() => {
  if (!selectedInstrument.value) return null
  const request = form.toCreateDiagramRequest()
  return diagramForPreview(request.positions, request.regions ?? [])
})
const previewDiagram = computed<Diagram | null>(() => (form.positions.value.length === 0 ? null : boardPreview.value))

// What merging the overlays would produce, for the overlay modal's preview.
const overlayPreviewDiagram = computed<Diagram | null>(() => {
  const stack = stackPreview.value
  return stack ? diagramForPreview(stack.positions, stack.regions) : null
})

const previewDiagramRef: DiagramRef = { diagram_id: '', layers: { intervals: true } }

// The author hears the playback being edited as it stands, once through in order; the editor rings
// what sounds.
const editorPlayback = computed<NonNullable<DiagramRef['playback']>>(() => ({
  playback_id: form.selectedPlaybackId.value,
  direction: 'as_authored',
  loop: false,
}))
const playingPositionIds = shallowRef<string[]>([])

const overlaying = ref(false)
// Neither the diagram being edited nor one already overlaid is offered again.
const overlayExcludeIds = computed(() => [savedDiagramId.value, ...overlayIds.value].filter((id) => id !== ''))

function onMergeOverlays() {
  if (!merge()) return
  overlaying.value = false
  if (savedDiagramId.value !== '') mergedIntoSaved.value = true
}

function onDiscardOverlays() {
  discardOverlays()
  overlaying.value = false
}

const saving = ref(false)
const toast = useToast()

// A template an admin saves over must be named in every language, on top of what any diagram needs.
const missingToSave = computed(() => {
  const fields = namesMissing.value && !form.missing.value.includes('names') ? ['names' as const, ...form.missing.value] : form.missing.value
  return fields.map((field) => ({ field, label: t(`diagramAuthoringView.missing.${field}`) }))
})
const saveBlockers = useSaveBlockers(missingToSave)

const saveState = computed(() => {
  if (saving.value) return 'saving'
  return form.isDirty.value || !savedDiagramId.value ? 'unsaved' : 'saved'
})

async function save() {
  if (saving.value || !saveBlockers.readyToSave()) return

  saving.value = true
  const isUpdate = !!savedDiagramId.value

  try {
    const diagram = isUpdate
      ? await updateDiagram(savedDiagramId.value, form.toUpdateDiagramRequest())
      : await createDiagram(form.toCreateDiagramRequest())
    adoptSaved(diagram)
    form.markSaved(diagram)
    toast.success(
      isUpdate
        ? t('diagramAuthoringView.diagramUpdated')
        : t('diagramAuthoringView.diagramCreated'),
    )
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('diagramAuthoringView.saveFailed'))
  } finally {
    saving.value = false
  }
}

const saveAsKind = ref<DiagramKind | null>(null)
const savingAs = ref(false)

function openSaveAs(kind: DiagramKind) {
  if (form.canSave.value) saveAsKind.value = kind
}

/**
 * Saves what the editor shows as a new diagram, leaving the one it was opened from
 * untouched, then carries on editing the new one. The form is reloaded from the
 * server's copy so the positions carry the ids the server assigned to it.
 */
async function saveAs(names: Record<string, string>) {
  if (!saveAsKind.value) return
  savingAs.value = true
  const isTemplate = saveAsKind.value === 'basic'
  try {
    const created = await createDiagram(form.toCopyRequest(names, saveAsKind.value))
    form.loadFromDiagram(created)
    form.markSaved(created)
    adoptSaved(created)
    mergedIntoSaved.value = false
    saveAsKind.value = null
    await router.replace({ name: 'teacher-diagram-edit', params: { id: created.diagram_id } })
    toast.success(
      isTemplate ? t('diagramAuthoringView.templateSaved') : t('diagramAuthoringView.copySaved'),
    )
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('diagramAuthoringView.saveFailed'))
  } finally {
    savingAs.value = false
  }
}
</script>

<template>
  <TeachShell section="teacher-diagrams" bar="none">
  <div class="flex flex-1 flex-col bg-surface">
    <EditorAppBar
      :compact="!isExpanded"
      :section-label="t('nav.diagrams')"
      :section-to="{ name: 'teacher-diagrams' }"
      :title="
        isEditMode
          ? localizedName(form.names.value) || t('diagramAuthoringView.editDiagramBreadcrumb')
          : t('diagramAuthoringView.newDiagramBreadcrumb')
      "
      :save-state="saveState"
      :can-save="canSaveInPlace && !loadingDiagram && !loadError"
      @save="save"
    >
      <template #actions>
        <button
          v-if="canSaveAs"
          type="button"
          data-test="save-as"
          :disabled="!form.canSave.value || savingAs"
          :class="secondarySaveClass"
          @click="openSaveAs('custom')"
        >
          {{ t('diagramAuthoringView.saveAsButton') }}
        </button>
        <button
          v-if="canSaveAsTemplate"
          type="button"
          data-test="save-as-template"
          :disabled="!form.canSave.value || savingAs || !templateTextComplete"
          :title="templateTextComplete ? undefined : t('diagramAuthoringView.templateNeedsEveryText')"
          :class="secondarySaveClass"
          @click="openSaveAs('basic')"
        >
          {{ t('diagramAuthoringView.saveAsTemplateButton') }}
        </button>
      </template>
    </EditorAppBar>

    <div
      v-if="!canAuthor"
      data-test="permission-denied"
      class="flex flex-1 items-center justify-center p-10"
    >
      <p class="max-w-md text-center text-ink-muted">
        {{ t('common.permissionDenied') }}
      </p>
    </div>

    <div v-else-if="loadingDiagram" class="flex flex-1 items-center justify-center p-10">
      <LoadingSkeleton />
    </div>

    <div
      v-else-if="loadError"
      data-test="load-error"
      class="flex flex-1 items-center justify-center p-10"
    >
      <LoadFailed :message="t('diagramAuthoringView.loadErrorMessage')" @retry="retryLoad" />
    </div>

    <div
      v-else
      data-test="authoring-body"
      class="flex flex-1"
      :class="isCompact ? 'flex-col' : 'flex-row'"
    >
      <main
        class="flex min-w-0 flex-1 flex-col gap-6"
        :class="isCompact ? 'px-4 pb-6 pt-[20px]' : 'px-[48px] pb-[80px] pt-10'"
      >
        <SaveBlockers :items="saveBlockers.shown.value" :reveal="saveBlockers.reveal.value" />

        <DiagramLanguageTabs
          data-field="text"
          :languages="form.languages.value"
          :active="activeLanguage"
          :missing="form.missingText.value"
          :locked="editsTemplate"
          @select="selectedLanguage = $event"
          @add="addLanguage"
          @remove="form.removeLanguage"
        />

        <LocaleScope :locale="editingLocale">
        <div class="flex flex-col gap-1.5" data-field="names">
          <input
            :value="form.names.value[activeLanguage] ?? ''"
            type="text"
            data-test="diagram-name"
            :lang="editingLocale"
            :placeholder="te('diagramAuthoringView.namePlaceholder')"
            class="border-none bg-transparent font-bold text-ink outline-none"
            :class="isCompact ? 'text-[1.375rem] leading-[1.75rem]' : 'text-xl'"
            @input="form.setName(activeLanguage, ($event.target as HTMLInputElement).value)"
          />
          <p v-if="namesMissing" data-test="names-missing-hint" class="text-sm text-ink-subtle">
            {{ te('diagramAuthoringView.templateNeedsEveryName') }}
          </p>
        </div>

        <p
          v-if="mergedIntoSaved"
          data-test="merged-notice"
          class="rounded-md border border-border bg-surface-sunken px-4 py-3 text-sm text-ink-muted"
        >
          {{ te('diagramAuthoringView.mergedNotice') }}
        </p>

        <p
          v-if="readOnlyReason"
          data-test="read-only-notice"
          class="rounded-md border border-border bg-surface-sunken px-4 py-3 text-sm text-ink-muted"
        >
          {{ readOnlyReason }}
        </p>


        <div class="flex flex-col gap-2.5">
          <label class="text-sm font-semibold">{{
            te('diagramAuthoringView.instrumentLabel')
          }}</label>
          <div class="flex w-fit flex-wrap gap-2 rounded-lg bg-surface-sunken p-1">
            <button
              v-for="instrument in frettedInstruments"
              :key="instrument.instrument_id"
              type="button"
              data-test="instrument-option"
              :disabled="isEditMode || form.hasPositions.value"
              class="flex items-center gap-2 rounded-md px-4 py-[9px] text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              :class="
                form.instrumentId.value === instrument.instrument_id
                  ? 'bg-accent text-accent-fg'
                  : 'text-ink-muted'
              "
              @click="chooseLayout(instrument.instrument_id)"
            >
              {{ localizedNameInEditor(instrument.names) }}
            </button>
          </div>
          <span v-if="isEditMode || form.hasPositions.value" class="text-sm text-ink-subtle">
            {{ te('diagramAuthoringView.instrumentLockedHint') }}
          </span>
          <div v-if="selectedInstrument" class="flex flex-col gap-2">
            <span data-test="compatible-instruments-label" class="text-sm text-ink-subtle">{{
              te('diagramAuthoringView.compatibleInstrumentsLabel')
            }}</span>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="instrument in compatibleInstruments"
                :key="instrument.instrument_id"
                type="button"
                :data-test="`compatible-instrument-${instrument.instrument_id}`"
                :aria-pressed="form.instrumentIds.value.includes(instrument.instrument_id)"
                class="rounded-full border px-3 py-1 text-sm"
                :class="form.instrumentIds.value.includes(instrument.instrument_id) ? 'border-accent bg-accent text-accent-fg' : 'border-border text-ink-muted'"
                @click="toggleCompatibleInstrument(instrument.instrument_id)"
              >
                {{ localizedNameInEditor(instrument.names) }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="selectedInstrument" class="flex flex-col gap-2.5">
          <label class="text-sm font-semibold" for="diagram-root-note">{{
            te('diagramAuthoringView.rootNoteLabel')
          }}</label>
          <select
            id="diagram-root-note"
            data-test="root-note-select"
            :value="form.rootNote.value"
            class="w-fit rounded-md border border-border bg-surface px-3 py-2 text-sm"
            @change="onRootNoteChange(($event.target as HTMLSelectElement).value)"
          >
            <option value="">{{ te('diagramAuthoringView.rootNotePlaceholder') }}</option>
            <option v-for="note in CHROMATIC_SCALE" :key="note" :value="note">{{ note }}</option>
          </select>
          <span class="text-sm text-ink-subtle">{{ te('diagramAuthoringView.rootNoteHint') }}</span>
        </div>

        <div v-if="selectedInstrument && boardPreview && isCompact" class="flex flex-col gap-3" data-field="positions">
          <DiagramBoardToolbar
            v-model:label-display="form.labelDisplay.value"
            v-model:color="form.color.value"
            :can-clear-color="form.canClearColor.value"
            :color-hint="colorHint"
            :can-preview="!!previewDiagram"
            :can-overlay="false"
            @preview="showPreviewModal = true"
          />
          <div class="rounded-lg border border-border bg-surface-raised p-3">
            <FrettedDiagramView
              :diagram="boardPreview"
              :instrument="selectedInstrument"
              :diagram-ref="previewDiagramRef"
              :label-mode="form.labelDisplay.value"
            />
          </div>
          <InlineNotice data-test="larger-screen-notice" tone="unavailable" :icon="Monitor" :message="te('diagramAuthoringView.largerScreen')" />
          <DiagramRegionsEditor
            data-field="regions"
            :regions="form.regions.value"
            :string-count="selectedInstrument.string_count ?? 0"
            :language="activeLanguage"
            :invalid-ids="form.invalidRegionIds.value"
            @add="form.addRegion"
            @set-frets="form.setRegionFrets"
            @set-strings="form.setRegionStrings"
            @set-description="(id, value) => form.setRegionDescription(id, activeLanguage, value)"
            @set-color="form.setRegionColor"
            @remove="form.removeRegion"
          />
        </div>

        <div v-else-if="selectedInstrument" class="flex flex-col gap-2" data-field="positions">
          <FrettedDiagramEditor
            data-field="notes"
            :instrument="selectedInstrument"
            :positions="form.positions.value"
            :regions="form.regions.value"
            :label-mode="form.labelDisplay.value"
            :color="form.color.value"
            :language="activeLanguage"
            :recording="sequenceEditor.recording.value"
            :sequence-highlight-ids="playingPositionIds.length > 0 ? playingPositionIds : sequenceEditor.selectedPositionIds.value"
            @toggle-cell="form.toggleCell"
            @pick-position="sequenceEditor.pickPosition"
            @reorder="form.reorderPositions"
            @set-shape="form.setPositionShape"
            @set-color="form.setPositionColor"
            @set-custom-label="(id, value) => form.setPositionCustomLabel(id, activeLanguage, value)"
            @set-note="(id, value) => form.setPositionNote(id, activeLanguage, value)"
            @remove="form.removePosition"
          >
            <template #toolbar>
              <DiagramBoardToolbar
                v-model:label-display="form.labelDisplay.value"
                v-model:color="form.color.value"
                :can-clear-color="form.canClearColor.value"
                :color-hint="colorHint"
                :can-preview="!!previewDiagram"
                can-overlay
                @overlay="overlaying = true"
                @preview="showPreviewModal = true"
              />
            </template>
            <DiagramSequenceEditor data-field="playbacks" :form="form" :editor="sequenceEditor" :label-mode="form.labelDisplay.value">
              <template #player>
                <DiagramPlayer
                  v-if="previewDiagram"
                  :diagram="previewDiagram"
                  :instrument="selectedInstrument"
                  :playback="editorPlayback"
                  @active="playingPositionIds = $event"
                />
              </template>
            </DiagramSequenceEditor>
            <DiagramRegionsEditor
              data-field="regions"
              :regions="form.regions.value"
              :string-count="selectedInstrument.string_count ?? 0"
              :language="activeLanguage"
              :invalid-ids="form.invalidRegionIds.value"
              @add="form.addRegion"
              @set-frets="form.setRegionFrets"
              @set-strings="form.setRegionStrings"
              @set-description="(id, value) => form.setRegionDescription(id, activeLanguage, value)"
              @set-color="form.setRegionColor"
              @remove="form.removeRegion"
            />
          </FrettedDiagramEditor>
        </div>

        <div class="flex flex-col gap-4 border-t border-border pt-2">
          <div>
            <label class="text-sm font-semibold">{{
              te('diagramAuthoringView.classificationLabel')
            }}</label>
            <span class="-mt-1 block text-[0.8125rem] text-ink-subtle">
              {{ te('diagramAuthoringView.classificationHint') }}
            </span>
          </div>
          <SkillConceptTreePicker
            data-field="concepts"
            :label="te('classificationFields.conceptLabel')"
            :nodes="conceptNodes"
            :selected-ids="form.conceptIds.value"
            :is-loading="conceptsLoading"
            :load-failed="conceptsError"
            :instrument-ids="classificationInstrumentIds"
            :suggested-ids="suggestedConceptIds"
            missing-hint
            :create-kind="isAdmin ? 'concept' : null"
            @update:selected-ids="form.conceptIds.value = $event"
            @retry="retryConcepts"
          />
          <SkillConceptTreePicker
            data-field="skills"
            :label="te('classificationFields.skillLabel')"
            :nodes="skillNodes"
            :selected-ids="form.skillIds.value"
            :is-loading="skillsLoading"
            :load-failed="skillsError"
            :instrument-ids="classificationInstrumentIds"
            :suggested-ids="suggestedSkillIds"
            missing-hint
            :create-kind="isAdmin ? 'skill' : null"
            @update:selected-ids="form.skillIds.value = $event"
            @retry="retrySkills"
          />
        </div>
        </LocaleScope>
      </main>

      <LocaleScope :locale="editingLocale">
      <DiagramPreviewModal
        v-if="previewDiagram && selectedInstrument"
        :open="showPreviewModal"
        :diagram="previewDiagram"
        :instrument="selectedInstrument"
        :diagram-ref="previewDiagramRef"
        :label-mode="form.labelDisplay.value"
        @close="showPreviewModal = false"
      />
      </LocaleScope>

      <OverlayDiagramsModal
        v-if="overlaying && selectedInstrument"
        v-model:region-per-layer="regionPerLayer"
        :instrument="selectedInstrument"
        :exclude-ids="overlayExcludeIds"
        :overlays="overlays"
        :preview="overlayPreviewDiagram"
        :can-merge="canMerge"
        :label-mode="form.labelDisplay.value"
        @add="addOverlay"
        @remove="removeOverlay"
        @merge="onMergeOverlays"
        @discard="onDiscardOverlays"
      />

      <SaveDiagramAsModal
        :open="saveAsKind !== null"
        :languages="saveAsLanguages"
        :initial-names="saveAsInitialNames"
        :as-template="saveAsKind === 'basic'"
        :saving="savingAs"
        @confirm="saveAs"
        @close="saveAsKind = null"
      />
    </div>
    <UnsavedChangesGuard :dirty="form.isDirty.value && canSaveInPlace" :message="t('diagramAuthoringView.leaveMessage')" />
  </div>
  </TeachShell>
</template>
