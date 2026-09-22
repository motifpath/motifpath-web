<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useTypedT } from '@/shared/composables/useTypedT'

import FrettedDiagramEditor from '@/features/teacher/components/FrettedDiagramEditor.vue'
import SkillConceptTreePicker from '@/features/teacher/components/SkillConceptTreePicker.vue'
import { useCreateDiagram } from '@/features/teacher/composables/useCreateDiagram'
import { useDiagram } from '@/features/teacher/composables/useDiagram'
import { useDiagramForm } from '@/features/teacher/composables/useDiagramForm'
import { useListInstruments } from '@/features/teacher/composables/useListInstruments'
import { useSkillConceptCreation } from '@/features/teacher/composables/useSkillConceptCreation'
import { useUpdateDiagram } from '@/features/teacher/composables/useUpdateDiagram'
import AppBar from '@/shared/components/AppBar.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import { useIsCompact } from '@/shared/composables/useIsCompact'
import { useToast } from '@/shared/composables/useToast'
import type { components } from '@/api/generated/core-domain'
import { useCurrentUserStore } from '@/stores/currentUser'

type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']

const currentUser = useCurrentUserStore()
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)

const { isCompact } = useIsCompact()
const { t } = useTypedT()

const route = useRoute()
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
const { createDiagram } = useCreateDiagram()
const { updateDiagram } = useUpdateDiagram()
const { skills, concepts, skillsLoading, conceptsLoading, onCreateSkill, onCreateConcept } =
  useSkillConceptCreation(form.skillIds, form.conceptIds, {
    createSkillFailed: t('diagramAuthoringView.createSkillFailed'),
    createConceptFailed: t('diagramAuthoringView.createConceptFailed'),
  })

const savedDiagramId = ref('')

watch(
  loadedDiagram,
  (diagram) => {
    if (!diagram) return
    form.loadFromDiagram(diagram)
    savedDiagramId.value = diagram.diagram_id
  },
  { immediate: true },
)

const selectedInstrument = computed(() =>
  instruments.value.find((i) => i.instrument_id === form.instrumentId.value),
)

const previewDiagram = computed<Diagram | null>(() => {
  if (!selectedInstrument.value || form.positions.value.length === 0) return null
  return {
    diagram_id: savedDiagramId.value,
    instrument_id: form.instrumentId.value,
    name: form.name.value,
    positions: form.toCreateDiagramRequest().positions,
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
    savedDiagramId.value = diagram.diagram_id

    justSaved.value = true
    clearTimeout(justSavedTimeout)
    justSavedTimeout = setTimeout(() => (justSaved.value = false), 2000)
    toast.success(isUpdate ? t('diagramAuthoringView.diagramUpdated') : t('diagramAuthoringView.diagramCreated'))
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('diagramAuthoringView.saveFailed'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <AppBar
      context="teacher"
      :compact="isCompact"
      :primary-nav-to="{ name: 'teacher-diagrams' }"
      :breadcrumb-label="isEditMode ? form.name.value || t('diagramAuthoringView.editDiagramBreadcrumb') : t('diagramAuthoringView.newDiagramBreadcrumb')"
      :show-save="canAuthor"
      :save-disabled="!form.canSave.value || saving"
      :just-saved="justSaved"
      :on-save="save"
    />

    <div v-if="!canAuthor" data-test="permission-denied" class="flex flex-1 items-center justify-center p-10">
      <p class="max-w-md text-center text-ink-muted">
        {{ t('common.permissionDenied') }}
      </p>
    </div>

    <div v-else-if="loadingDiagram" class="flex flex-1 items-center justify-center p-10">
      <StateLoading :noun="t('diagramAuthoringView.loadingNoun')" />
    </div>

    <div v-else-if="loadError" data-test="load-error" class="flex flex-1 items-center justify-center p-10">
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
        <div class="flex flex-col gap-1.5">
          <input
            v-model="form.name.value"
            type="text"
            data-test="diagram-name"
            :placeholder="t('diagramAuthoringView.namePlaceholder')"
            class="border-none bg-transparent font-bold text-ink outline-none"
            :class="isCompact ? 'text-[1.375rem] leading-[1.75rem]' : 'text-xl'"
          />
        </div>

        <div class="flex flex-col gap-2.5">
          <label class="text-sm font-semibold">{{ t('diagramAuthoringView.instrumentLabel') }}</label>
          <div class="flex w-fit flex-wrap gap-2 rounded-lg bg-surface-sunken p-1">
            <button
              v-for="instrument in frettedInstruments"
              :key="instrument.instrument_id"
              type="button"
              data-test="instrument-option"
              :disabled="isEditMode"
              class="flex items-center gap-2 rounded-md px-4 py-[9px] text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              :class="form.instrumentId.value === instrument.instrument_id ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
              @click="form.instrumentId.value = instrument.instrument_id"
            >
              {{ instrument.name }}
            </button>
          </div>
          <span v-if="isEditMode" class="text-sm text-ink-subtle">
            {{ t('diagramAuthoringView.instrumentLockedHint') }}
          </span>
        </div>

        <div v-if="selectedInstrument" class="flex flex-col gap-2">
          <label class="text-sm font-semibold">{{ t('diagramAuthoringView.positionsLabel') }}</label>
          <FrettedDiagramEditor
            :instrument="selectedInstrument"
            :positions="form.positions.value"
            @toggle-cell="form.toggleCell"
            @edit-interval="form.editPositionInterval"
            @edit-note-name="form.editPositionNoteName"
            @set-sequence-index="form.setSequenceIndex"
            @remove="form.removePosition"
          />
        </div>

        <div class="flex flex-col gap-4 border-t border-border pt-2">
          <div>
            <label class="text-sm font-semibold">{{ t('diagramAuthoringView.classificationLabel') }}</label>
            <span class="-mt-1 block text-[0.8125rem] text-ink-subtle">
              {{ t('diagramAuthoringView.classificationHint') }}
            </span>
          </div>
          <SkillConceptTreePicker
            :label="t('classificationFields.skillLabel')"
            :nodes="skills.map((s) => ({ id: s.skill_id, name: s.name, parent_id: s.parent_id }))"
            :selected-ids="form.skillIds.value"
            :is-loading="skillsLoading"
            @update:selected-ids="form.skillIds.value = $event"
            @create="onCreateSkill"
          />
          <SkillConceptTreePicker
            :label="t('classificationFields.conceptLabel')"
            :nodes="concepts.map((c) => ({ id: c.concept_id, name: c.name, parent_id: c.parent_id }))"
            :selected-ids="form.conceptIds.value"
            :is-loading="conceptsLoading"
            @update:selected-ids="form.conceptIds.value = $event"
            @create="onCreateConcept"
          />
        </div>
      </main>

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
            {{ t('diagramAuthoringView.previewLabel') }}
          </span>
          <FrettedDiagramView
            v-if="previewDiagram && selectedInstrument"
            :diagram="previewDiagram"
            :instrument="selectedInstrument"
            :diagram-ref="previewDiagramRef"
          />
          <p v-else class="text-sm text-ink-subtle">{{ t('diagramAuthoringView.previewEmpty') }}</p>
        </div>
      </aside>
    </div>
  </div>
</template>
