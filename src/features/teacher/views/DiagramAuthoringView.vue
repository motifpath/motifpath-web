<script setup lang="ts">
import { computed, onUnmounted, ref, watch, watchEffect } from 'vue'
import { Palette } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import { useTypedT } from '@/shared/composables/useTypedT'

import DiagramPreviewModal from '@/features/teacher/components/DiagramPreviewModal.vue'
import DiagramLanguageTabs from '@/features/teacher/components/DiagramLanguageTabs.vue'
import DiagramRegionsEditor from '@/features/teacher/components/DiagramRegionsEditor.vue'
import FrettedDiagramEditor from '@/features/teacher/components/FrettedDiagramEditor.vue'
import SaveDiagramAsModal from '@/features/teacher/components/SaveDiagramAsModal.vue'
import ColorPaletteMenu from '@/shared/components/ColorPaletteMenu.vue'
import SkillConceptTreePicker from '@/shared/components/SkillConceptTreePicker.vue'
import { useCreateDiagram } from '@/features/teacher/composables/useCreateDiagram'
import { useDiagram } from '@/features/teacher/composables/useDiagram'
import { useDiagramForm } from '@/features/teacher/composables/useDiagramForm'
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useSkillConceptCreation } from '@/features/teacher/composables/useSkillConceptCreation'
import { useUpdateDiagram } from '@/features/teacher/composables/useUpdateDiagram'
import AppBar from '@/shared/components/AppBar.vue'
import LocaleScope from '@/shared/components/LocaleScope.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import { useIsCompact } from '@/shared/composables/useIsCompact'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useToast } from '@/shared/composables/useToast'
import { canEditDiagram } from '@/shared/utils/diagramOwnership'
import { CHROMATIC_SCALE } from '@/shared/utils/musicTheory'
import { i18n, OFFERED_LANGUAGE_CODES, fromApiLanguageCode, toApiLanguageCode } from '@/i18n'
import type { components } from '@/api/generated/core-domain'
import { useCurrentUserStore } from '@/stores/currentUser'

type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']
type DiagramKind = Diagram['kind']

const currentUser = useCurrentUserStore()
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)

const { isCompact } = useIsCompact()
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
const { skills, concepts, skillsLoading, conceptsLoading, onCreateSkill, onCreateConcept } =
  useSkillConceptCreation(form.skillIds, form.conceptIds, {
    createSkillFailed: t('diagramAuthoringView.createSkillFailed'),
    createConceptFailed: t('diagramAuthoringView.createConceptFailed'),
  })

const savedDiagramId = ref('')
// Who may save over the diagram being edited follows from the server's copy of it; null
// until it has been saved once, since a brand new diagram is always the caller's own.
const savedOwnership = ref<Pick<Diagram, 'kind' | 'created_by'> | null>(null)

function adoptSaved(diagram: Diagram) {
  savedDiagramId.value = diagram.diagram_id
  savedOwnership.value = { kind: diagram.kind, created_by: diagram.created_by }
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
const canSaveInPlace = computed(
  () =>
    canAuthor.value &&
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
// new diagram keeps its own names.
const saveAsInitialNames = computed(() =>
  Object.fromEntries(
    saveAsLanguages.value.map((code) => {
      const name = (form.names.value[code] ?? '').trim()
      if (!savedDiagramId.value || name === '') return [code, name]
      return [code, i18n.global.t('diagramAuthoringView.copyName', { name }, { locale: fromApiLanguageCode(code) })]
    }),
  ),
)
const readOnlyReason = computed(() => {
  if (canSaveInPlace.value || !savedOwnership.value) return ''
  return savedOwnership.value.kind === 'basic'
    ? te('diagramAuthoringView.readOnlyTemplate')
    : te('diagramAuthoringView.readOnlyOtherTeacher')
})

const selectedInstrument = computed(() =>
  instruments.value.find((i) => i.instrument_id === form.instrumentId.value),
)

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

const previewDiagram = computed<Diagram | null>(() => {
  if (!selectedInstrument.value || form.positions.value.length === 0) return null
  const request = form.toCreateDiagramRequest()
  return {
    diagram_id: savedDiagramId.value,
    instrument_id: form.instrumentId.value,
    names: request.names,
    languages: Object.keys(request.names).sort(),
    kind: savedOwnership.value?.kind ?? 'custom',
    created_by: savedOwnership.value?.created_by ?? {
      user_id: currentUser.profile?.user_id ?? '',
      display_name: currentUser.profile?.display_name ?? '',
    },
    root_note: request.root_note ?? null,
    label_display: form.labelDisplay.value,
    color: form.color.value,
    positions: request.positions,
    regions: request.regions ?? [],
    classification: { skills: [], concepts: [] },
    created_at: '',
  }
})

const previewDiagramRef: DiagramRef = { diagram_id: '', layers: { intervals: true } }

const saving = ref(false)
const justSaved = ref(false)
let justSavedTimeout: ReturnType<typeof setTimeout> | undefined
onUnmounted(() => clearTimeout(justSavedTimeout))

const toast = useToast()

async function save() {
  if (!form.canSave.value) return

  saving.value = true
  const isUpdate = !!savedDiagramId.value

  try {
    const diagram = isUpdate
      ? await updateDiagram(savedDiagramId.value, form.toUpdateDiagramRequest())
      : await createDiagram(form.toCreateDiagramRequest())
    adoptSaved(diagram)
    form.markSaved(diagram)

    justSaved.value = true
    clearTimeout(justSavedTimeout)
    justSavedTimeout = setTimeout(() => (justSaved.value = false), 2000)
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
  <div class="flex min-h-screen flex-col bg-surface">
    <AppBar
      context="teacher"
      :compact="isCompact"
      :primary-nav-to="{ name: 'teacher-diagrams' }"
      :breadcrumb-label="
        isEditMode
          ? localizedName(form.names.value) || t('diagramAuthoringView.editDiagramBreadcrumb')
          : t('diagramAuthoringView.newDiagramBreadcrumb')
      "
      :show-save="canSaveInPlace"
      :save-disabled="!form.canSave.value || namesMissing || saving"
      :just-saved="justSaved"
      :on-save="save"
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
    </AppBar>

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
      <StateLoading :noun="t('diagramAuthoringView.loadingNoun')" />
    </div>

    <div
      v-else-if="loadError"
      data-test="load-error"
      class="flex flex-1 items-center justify-center p-10"
    >
      <StateError :message="t('diagramAuthoringView.loadErrorMessage')" @retry="retryLoad" />
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
        <DiagramLanguageTabs
          :languages="form.languages.value"
          :active="activeLanguage"
          :incomplete="form.missingTextLanguages.value"
          :locked="editsTemplate"
          @select="selectedLanguage = $event"
          @add="addLanguage"
          @remove="form.removeLanguage"
        />

        <LocaleScope :locale="editingLocale">
        <div class="flex flex-col gap-1.5">
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
              @click="form.instrumentId.value = instrument.instrument_id"
            >
              {{ localizedNameInEditor(instrument.names) }}
            </button>
          </div>
          <span v-if="isEditMode || form.hasPositions.value" class="text-sm text-ink-subtle">
            {{ te('diagramAuthoringView.instrumentLockedHint') }}
          </span>
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

        <div v-if="selectedInstrument" class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-semibold">{{
              te('diagramAuthoringView.positionsLabel')
            }}</label>
            <div class="flex items-center gap-2">
              <ColorPaletteMenu
                test-id="diagram-color"
                :title="te('diagramAuthoringView.colorLabel')"
                :model-value="form.color.value"
                :allow-clear="form.canClearColor.value"
                :hint="colorHint"
                @select="(color) => (form.color.value = color)"
              >
                <Palette :size="16" aria-hidden="true" />
              </ColorPaletteMenu>
              <div class="flex w-fit gap-1 rounded-lg bg-surface-sunken p-1">
                <button
                  type="button"
                  data-test="label-mode-interval"
                  class="rounded-md px-3 py-1 text-xs font-semibold"
                  :class="
                    form.labelDisplay.value === 'interval'
                      ? 'bg-accent text-accent-fg'
                      : 'text-ink-muted'
                  "
                  @click="form.labelDisplay.value = 'interval'"
                >
                  {{ te('diagramAuthoringView.labelModeInterval') }}
                </button>
                <button
                  type="button"
                  data-test="label-mode-note"
                  class="rounded-md px-3 py-1 text-xs font-semibold"
                  :class="
                    form.labelDisplay.value === 'note'
                      ? 'bg-accent text-accent-fg'
                      : 'text-ink-muted'
                  "
                  @click="form.labelDisplay.value = 'note'"
                >
                  {{ te('diagramAuthoringView.labelModeNote') }}
                </button>
                <button
                  type="button"
                  data-test="label-mode-hidden"
                  class="rounded-md px-3 py-1 text-xs font-semibold"
                  :class="
                    form.labelDisplay.value === 'hidden'
                      ? 'bg-accent text-accent-fg'
                      : 'text-ink-muted'
                  "
                  @click="form.labelDisplay.value = 'hidden'"
                >
                  {{ te('diagramAuthoringView.labelModeHidden') }}
                </button>
              </div>
            </div>
          </div>
          <FrettedDiagramEditor
            :instrument="selectedInstrument"
            :positions="form.positions.value"
            :regions="form.regions.value"
            :label-mode="form.labelDisplay.value"
            :color="form.color.value"
            :language="activeLanguage"
            @toggle-cell="form.toggleCell"
            @reorder="form.reorderPositions"
            @set-shape="form.setPositionShape"
            @set-color="form.setPositionColor"
            @set-custom-label="(id, value) => form.setPositionCustomLabel(id, activeLanguage, value)"
            @set-note="(id, value) => form.setPositionNote(id, activeLanguage, value)"
            @remove="form.removePosition"
          />
        </div>

        <DiagramRegionsEditor
          v-if="selectedInstrument"
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
            :label="te('classificationFields.skillLabel')"
            :nodes="skills.map((s) => ({ id: s.skill_id, name: s.name, parent_id: s.parent_id }))"
            :selected-ids="form.skillIds.value"
            :is-loading="skillsLoading"
            @update:selected-ids="form.skillIds.value = $event"
            @create="onCreateSkill"
          />
          <SkillConceptTreePicker
            :label="te('classificationFields.conceptLabel')"
            :nodes="
              concepts.map((c) => ({ id: c.concept_id, name: c.name, parent_id: c.parent_id }))
            "
            :selected-ids="form.conceptIds.value"
            :is-loading="conceptsLoading"
            @update:selected-ids="form.conceptIds.value = $event"
            @create="onCreateConcept"
          />
        </div>
        </LocaleScope>
      </main>

      <LocaleScope :locale="editingLocale">
      <aside
        class="flex flex-col gap-5 bg-surface-raised"
        :class="
          isCompact
            ? 'w-full border-t border-border px-4 py-5'
            : 'w-[360px] flex-shrink-0 border-l border-border px-[28px] py-[32px]'
        "
      >
        <div class="flex flex-col gap-2.5">
          <span class="text-[0.8125rem] font-bold uppercase tracking-wide text-ink-muted">
            {{ te('diagramAuthoringView.previewLabel') }}
          </span>
          <template v-if="previewDiagram && selectedInstrument">
            <FrettedDiagramView
              :diagram="previewDiagram"
              :instrument="selectedInstrument"
              :diagram-ref="previewDiagramRef"
              :label-mode="form.labelDisplay.value"
            />
            <button
              type="button"
              data-test="open-preview-modal"
              class="w-fit rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-ink-muted"
              @click="showPreviewModal = true"
            >
              {{ te('diagramAuthoringView.viewPreviewButton') }}
            </button>
          </template>
          <p v-else class="text-sm text-ink-subtle">{{ te('diagramAuthoringView.previewEmpty') }}</p>
        </div>
      </aside>

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
  </div>
</template>
