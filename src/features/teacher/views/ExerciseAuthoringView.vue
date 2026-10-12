<script setup lang="ts">
import { AlignLeft, AudioLines, AudioWaveform, ChevronRight, Crosshair, Eye, Images, Lock, TriangleAlert } from 'lucide-vue-next'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useKnowledgeTrees } from '@/shared/composables/useKnowledgeTrees'
import { useTypedT } from '@/shared/composables/useTypedT'

import AudioSelectionOptionsEditor from '@/features/teacher/components/AudioSelectionOptionsEditor.vue'
import ExercisePreview from '@/features/teacher/components/ExercisePreview.vue'
import ImageChoiceOptionsEditor from '@/features/teacher/components/ImageChoiceOptionsEditor.vue'
import MediaPickerModal from '@/features/teacher/components/MediaPickerModal.vue'
import DiagramStimulusEditor from '@/features/teacher/components/DiagramStimulusEditor.vue'
import ImageRegionEditor from '@/features/teacher/components/ImageRegionEditor.vue'
import PromptEditor from '@/features/teacher/components/PromptEditor.vue'
import SoundPickerModal from '@/features/teacher/components/SoundPickerModal.vue'
import SoundSource from '@/features/teacher/components/SoundSource.vue'
import type { SoundValue } from '@/features/teacher/components/SoundSource.vue'
import SkillConceptTreePicker from '@/shared/components/SkillConceptTreePicker.vue'
import TextOptionsEditor from '@/features/teacher/components/TextOptionsEditor.vue'
import { useCreateExercise } from '@/features/teacher/composables/useCreateExercise'
import { useExercise } from '@/features/teacher/composables/useExercise'
import { useExerciseForm, type ExerciseType } from '@/features/teacher/composables/useExerciseForm'
import { useMediaUpload } from '@/features/teacher/composables/useMediaUpload'
import { useStimulusDiagram } from '@/features/teacher/composables/useStimulusDiagram'
import { useUpdateExercise } from '@/features/teacher/composables/useUpdateExercise'
import AppButton from '@/shared/components/AppButton.vue'
import EditorAppBar from '@/shared/components/EditorAppBar.vue'
import EditorBody from '@/shared/components/EditorBody.vue'
import InstrumentPicker from '@/shared/components/InstrumentPicker.vue'
import LanguageCodesPicker from '@/shared/components/LanguageCodesPicker.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import SaveBlockers from '@/shared/components/SaveBlockers.vue'
import TypeRow from '@/shared/components/TypeRow.vue'
import UnsavedChangesGuard from '@/shared/components/UnsavedChangesGuard.vue'
import { useSaveBlockers } from '@/shared/composables/useSaveBlockers'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useToast } from '@/shared/composables/useToast'
import { diagramStimulusOptions } from '@/shared/utils/diagramAnswerCells'
import { useCurrentUserStore } from '@/stores/currentUser'
import type { components } from '@/api/generated/core-domain'
import TeachShell from '@/shared/components/TeachShell.vue'

type DiagramRef = components['schemas']['DiagramRef']

const currentUser = useCurrentUserStore()
// Admins carry every permission a teacher has (canManageContent on the
// backend already treats them the same) — students never author content.
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)

const { sizeClass, isCompact } = useSizeClass()
const isExpanded = computed(() => sizeClass.value === 'expanded')
const { t } = useTypedT()

const route = useRoute()
const rawExerciseId = route.params.id
const exerciseId = Array.isArray(rawExerciseId) ? rawExerciseId[0] : rawExerciseId
const isEditMode = !!exerciseId

const {
  exercise: loadedExercise,
  isLoading: loadingExercise,
  error: loadError,
  retry: retryLoad,
} = exerciseId
  ? useExercise(exerciseId)
  : { exercise: ref(null), isLoading: ref(false), error: ref(false), retry: async () => {} }

const form = useExerciseForm()
const { createExercise } = useCreateExercise()
const { updateExercise } = useUpdateExercise()
const { upload } = useMediaUpload()
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
  useKnowledgeTrees({ skillIds: form.skillIds, conceptIds: form.conceptIds }, {}, { refreshOnReturn: true })

const savedExerciseId = ref('')
const linkedChallengeIds = ref<string[]>([])
const linkedContentNodeIds = ref<string[]>([])

watch(
  loadedExercise,
  (exercise) => {
    if (!exercise) return
    form.loadFromExercise(exercise)
    savedExerciseId.value = exercise.exercise_id
    linkedChallengeIds.value = exercise.challenge_ids
    linkedContentNodeIds.value = exercise.content_node_ids ?? []
  },
  { immediate: true },
)

function revokeIfBlob(url: string | undefined | null): void {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

const exerciseTypes = computed<{ value: ExerciseType; label: string; description: string; icon: typeof Images }[]>(() =>
  (
    [
      ['image_recognition', Crosshair],
      ['image_choice', Images],
      ['text_response', AlignLeft],
      ['audio_recognition', AudioLines],
      ['audio_selection', AudioWaveform],
    ] as const
  ).map(([value, icon]) => ({
    value,
    icon,
    label: t(`common.exerciseTypes.${value}`),
    description: t(`exerciseAuthoringView.typeDescriptions.${value}`),
  })),
)

// A new exercise starts by choosing its type; the type can change until the first save, and the
// API keeps it fixed after that.
const typeChosen = ref(isEditMode)
const typeLocked = computed(() => !!savedExerciseId.value)
const lockedType = computed(() => exerciseTypes.value.find((type) => type.value === form.exerciseType.value))

function chooseType(type: ExerciseType) {
  form.exerciseType.value = type
  typeChosen.value = true
}

// Nothing is uploaded until save — picking a file only sets a local blob:
// preview, so an abandoned edit never leaves an orphaned object in storage.
const stimulusPickerOpen = ref(false)
// Captures which kind the file was picked for at pick time, not whichever
// type happens to be selected later — exerciseType can change before save.
const stimulusFile = ref<{ file: File; kind: 'image' | 'audio' } | null>(null)
const optionFiles = reactive<Record<string, File>>({})

const stimulusKind = computed(() => (form.exerciseType.value === 'audio_recognition' ? 'audio' : 'image'))
const stimulusImageLabel = computed(() =>
  form.imageUrl.value
    ? (stimulusFile.value?.file.name ?? t('exerciseAuthoringView.imageSelected'))
    : t('exerciseAuthoringView.noImageSelected'),
)

function onStimulusPicked(file: File) {
  const kind = stimulusKind.value
  const target = kind === 'audio' ? form.audioUrl : form.imageUrl
  const other = kind === 'audio' ? form.imageUrl : form.audioUrl

  // A stimulus only ever makes sense for one kind at a time. Clearing the
  // other field here (not just when its own type is re-selected) stops a
  // stale, no-longer-referenced blob: URL from resurfacing if the teacher
  // switches exercise type back without re-picking.
  revokeIfBlob(target.value)
  revokeIfBlob(other.value)
  other.value = ''

  stimulusFile.value = { file, kind }
  if (kind === 'audio') form.setSoundDiagram(null)
  target.value = URL.createObjectURL(file)
  if (kind === 'image') form.stimulusSource.value = 'image'
  stimulusPickerOpen.value = false
}

// A listening exercise's sound: an uploaded file, or a diagram's playback chosen in its picker.
const stimulusSound = computed<SoundValue | null>(() => {
  if (form.soundDiagram.value) return { kind: 'diagram', ref: form.soundDiagram.value }
  return form.audioUrl.value ? { kind: 'file', url: form.audioUrl.value } : null
})
const soundPickerOpen = ref(false)
/** The diagram sound reopened by Edit settings; null to choose a new one. */
const soundPickerInitial = ref<DiagramRef | null>(null)

function openSoundPicker(initial: DiagramRef | null) {
  soundPickerInitial.value = initial
  soundPickerOpen.value = true
}

/** Drops the sound's file, never uploading a picked one. */
function dropSoundFile() {
  revokeIfBlob(form.audioUrl.value)
  form.audioUrl.value = ''
  if (stimulusFile.value?.kind === 'audio') stimulusFile.value = null
}

function onSoundDiagram(sound: DiagramRef) {
  dropSoundFile()
  form.setSoundDiagram(sound)
  soundPickerOpen.value = false
}

function removeSound() {
  dropSoundFile()
  form.setSoundDiagram(null)
}

// Bumped on every pick, so the stimulus editor starts afresh even when the same diagram is
// picked again — its own state would otherwise outlive the form's reset answers.
const stimulusPick = ref(0)

// A diagram is drawn for its instruments, so picking one as the stimulus of a
// new exercise fills them in while none are chosen. A saved exercise's empty
// list means "every instrument" on purpose, so it is never overridden.
const fillInstrumentsFromStimulus = ref(false)

function onStimulusDiagram(diagramRef: DiagramRef) {
  stimulusPick.value++
  form.setStimulusDiagram(diagramRef)
  stimulusPickerOpen.value = false
  fillInstrumentsFromStimulus.value = !isEditMode && form.instrumentIds.value.length === 0
}

const showsDiagramStimulus = computed(() => form.stimulusSource.value === 'diagram' && form.stimulusDiagram.value !== null)
// The stimulus's labels, hidden and correct positions are edited in the form, on the diagram itself.
const stimulus = useStimulusDiagram(() =>
  form.hasDiagramStimulus.value ? (form.stimulusDiagram.value?.diagram_id ?? null) : null,
)

watch(
  [() => stimulus.diagram.value, fillInstrumentsFromStimulus],
  ([diagram, fill]) => {
    if (!fill || !diagram || diagram.diagram_id !== form.stimulusDiagram.value?.diagram_id) return
    fillInstrumentsFromStimulus.value = false
    if (form.instrumentIds.value.length > 0) return
    form.instrumentIds.value = diagram.instrument_ids.length > 0 ? [...diagram.instrument_ids] : [diagram.instrument_id]
  },
  { immediate: true },
)

function onOptionFile(id: string, file: File) {
  optionFiles[id] = file
}

// A diagram replaces the option's image, so an image picked for it but not
// yet uploaded is dropped rather than uploaded for nothing.
function onOptionDiagram(id: string, diagramRef: DiagramRef) {
  delete optionFiles[id]
  revokeIfBlob(form.imageOptions.value.find((o) => o.id === id)?.imageUrl)
  form.setImageOptionDiagram(id, diagramRef)
}

function onRemoveImageOption(id: string) {
  delete optionFiles[id]
  revokeIfBlob(form.imageOptions.value.find((o) => o.id === id)?.imageUrl)
  form.removeImageOption(id)
}

function onRemoveAudioOption(id: string) {
  delete optionFiles[id]
  revokeIfBlob(form.audioOptions.value.find((o) => o.id === id)?.audioUrl)
  form.removeAudioOption(id)
}

/** A new sound option is labelled by its place, so the label never names the answer. */
function onAddAudioOption() {
  form.addAudioOption(t('exerciseView.soundNumber', { number: form.audioOptions.value.length + 1 }))
}

// A diagram replaces the option's file, so a file picked for it but not yet uploaded is dropped
// rather than uploaded for nothing; clearing the sound drops it too.
function dropAudioOptionFile(id: string) {
  delete optionFiles[id]
  revokeIfBlob(form.audioOptions.value.find((o) => o.id === id)?.audioUrl)
}

function onAudioOptionDiagram(id: string, sound: DiagramRef) {
  dropAudioOptionFile(id)
  form.setAudioOptionDiagram(id, sound)
}

function onClearAudioOptionSound(id: string) {
  dropAudioOptionFile(id)
  form.setAudioOptionURL(id, '')
}

// One entry per exercise type whose options carry their own media file,
// driving uploadPendingMedia below without a growing if/else — adding a new
// such type only means adding an entry here.
const optionMediaConfig: Partial<
  Record<ExerciseType, { kind: 'image' | 'audio'; getUrl: (id: string) => string | undefined; setUrl: (id: string, url: string) => void }>
> = {
  image_choice: {
    kind: 'image',
    getUrl: (id) => form.imageOptions.value.find((o) => o.id === id)?.imageUrl,
    setUrl: form.setImageOptionURL,
  },
  audio_selection: {
    kind: 'audio',
    getUrl: (id) => form.audioOptions.value.find((o) => o.id === id)?.audioUrl,
    setUrl: form.setAudioOptionURL,
  },
}

async function uploadPendingMedia() {
  // A diagram stimulus replaces the image, so a picked image isn't uploaded.
  const pendingStimulus = form.hasDiagramStimulus.value ? null : stimulusFile.value
  const stimulusUpload = pendingStimulus
    ? (async () => {
        const target = pendingStimulus.kind === 'audio' ? form.audioUrl : form.imageUrl
        const previousBlobUrl = target.value
        const url = await upload(pendingStimulus.file, pendingStimulus.kind)
        revokeIfBlob(previousBlobUrl)
        target.value = url
        stimulusFile.value = null
      })()
    : Promise.resolve()

  // Only the currently-selected type's options actually make it into the
  // saved request (optionsForRequest() only serializes one option list per
  // type) -- a pending file left over from a type the teacher has since
  // switched away from would otherwise still get uploaded for nothing it
  // ends up in.
  const config = optionMediaConfig[form.exerciseType.value]
  const optionUploads = config
    ? Object.entries(optionFiles).map(async ([id, file]) => {
        const previousBlobUrl = config.getUrl(id)
        const url = await upload(file, config.kind)
        revokeIfBlob(previousBlobUrl)
        config.setUrl(id, url)
        delete optionFiles[id]
      })
    : []

  await Promise.all([stimulusUpload, ...optionUploads])
}

const previewOpen = ref(false)
// Only computed while the preview is actually open, so editing the form
// doesn't re-run the options mapping on every keystroke for no observer.
// A diagram stimulus's options are only derived on save, so an unsaved one's are worked out here
// the same way, for the preview to be answerable.
const previewOptions = computed(() => {
  if (!previewOpen.value) return []
  const { diagram, instrument } = stimulus
  if (form.hasDiagramStimulus.value && form.stimulusDiagram.value && diagram.value && instrument.value) {
    return diagramStimulusOptions(diagram.value, instrument.value, form.stimulusDiagram.value)
  }
  return form.toCreateExerciseRequest().options ?? []
})
// A diagram stimulus is the board to answer on; an audio_recognition's diagram is its sound.
const previewDiagramRef = computed(() => {
  if (form.hasDiagramStimulus.value) return form.stimulusDiagram.value ?? undefined
  return form.exerciseType.value === 'audio_recognition' ? (form.soundDiagram.value ?? undefined) : undefined
})
const saving = ref(false)
const toast = useToast()

const missingToSave = computed(() =>
  form.missing.value.map((field) => ({ field, label: t(`exerciseAuthoringView.missing.${field}`) })),
)
const saveBlockers = useSaveBlockers(missingToSave)

// A file picked but not uploaded yet is unsaved too: it only goes up on Save.
const hasPendingFiles = computed(() => !!stimulusFile.value || Object.keys(optionFiles).length > 0)
const isDirty = computed(() => form.isDirty.value || hasPendingFiles.value)

const saveState = computed(() => {
  if (saving.value) return 'saving'
  return isDirty.value || !savedExerciseId.value ? 'unsaved' : 'saved'
})

async function save() {
  if (saving.value || !saveBlockers.readyToSave()) return

  saving.value = true
  // The exercise this form is currently backing, not the route it was
  // opened from — a save on the /new route sets this on success, and every
  // save after that (still on the same, un-navigated /new URL) must PUT
  // that same exercise instead of POSTing a duplicate.
  const isUpdate = !!savedExerciseId.value

  try {
    await uploadPendingMedia()
    const exercise = isUpdate
      ? await updateExercise(savedExerciseId.value, form.toUpdateExerciseRequest())
      : await createExercise(form.toCreateExerciseRequest())
    savedExerciseId.value = exercise.exercise_id
    linkedChallengeIds.value = exercise.challenge_ids
    linkedContentNodeIds.value = exercise.content_node_ids ?? []
    form.markSaved()
    toast.success(isUpdate ? t('exerciseAuthoringView.exerciseUpdated') : t('exerciseAuthoringView.exerciseCreated'))
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('exerciseAuthoringView.saveFailed'))
  } finally {
    saving.value = false
  }
}

const cardClass = 'flex flex-col gap-4 rounded-2xl border border-border bg-surface-raised p-4'
const eyebrowClass = 'text-xs font-semibold uppercase tracking-wider text-ink-muted'
const labelClass = 'text-sm font-semibold text-ink'
const hintClass = 'text-xs text-ink-muted'
const inputClass = 'h-12 rounded-xl border border-border bg-surface-sunken px-3 text-base text-ink'
</script>

<template>
  <TeachShell section="teacher-exercises" bar="none">
  <div class="flex flex-1 flex-col bg-surface">
    <EditorAppBar
      :compact="!isExpanded"
      :section-label="t('nav.exercises')"
      :section-to="{ name: 'teacher-exercises' }"
      :title="isEditMode ? form.title.value || t('exerciseAuthoringView.editExerciseBreadcrumb') : t('exerciseAuthoringView.newExerciseBreadcrumb')"
      :save-state="saveState"
      :can-save="canAuthor && typeChosen && !loadingExercise && !loadError"
      @save="save"
    />

    <div v-if="!canAuthor" data-test="permission-denied" class="flex flex-1 items-center justify-center p-10">
      <p class="max-w-md text-center text-ink-muted">
        {{ t('common.permissionDenied') }}
      </p>
    </div>

    <div v-else-if="loadingExercise" class="flex flex-1 items-center justify-center p-10">
      <LoadingSkeleton />
    </div>

    <div v-else-if="loadError" data-test="load-error" class="flex flex-1 items-center justify-center p-10">
      <LoadFailed :message="t('exerciseAuthoringView.loadErrorMessage')" @retry="retryLoad" />
    </div>

    <EditorBody v-else-if="!typeChosen" data-test="type-chooser" :two-columns="false">
      <h2 class="text-lg font-semibold text-ink">{{ t('exerciseAuthoringView.chooseTypeHeading') }}</h2>
      <TypeRow
        v-for="type in exerciseTypes"
        :key="type.value"
        :data-test="`type-choice-${type.value}`"
        :icon="type.icon"
        :label="type.label"
        :description="type.description"
        @click="chooseType(type.value)"
      />
      <p :class="hintClass">{{ t('exerciseAuthoringView.typeLockedAfterSave') }}</p>
    </EditorBody>

    <EditorBody v-else data-test="authoring-body" :two-columns="isExpanded">
      <template #side>
        <section :class="cardClass">
          <h2 :class="eyebrowClass">{{ t('common.studentPreview') }}</h2>
          <AppButton data-test="open-preview" variant="secondary" block @click="previewOpen = true">
            <Eye :size="18" aria-hidden="true" />
            {{ t('exerciseAuthoringView.previewAsStudent') }}
          </AppButton>
        </section>
        <section :class="cardClass">
          <div data-test="reuse-indicator" class="flex flex-col gap-4">
            <span class="text-[0.8125rem] font-bold uppercase tracking-wide text-ink-muted">{{ t('exerciseAuthoringView.usageHeading') }}</span>
            <p v-if="!savedExerciseId" class="text-sm text-ink-subtle">{{ t('exerciseAuthoringView.usageUnsaved') }}</p>
            <template v-else>
              <div data-test="usage-challenges" class="flex flex-col gap-2">
                <span class="text-xs font-semibold text-ink-muted">{{ t('exerciseAuthoringView.usageChallengesHeading') }}</span>
                <p v-if="linkedChallengeIds.length === 0" class="text-sm text-ink-subtle">{{ t('exerciseAuthoringView.usageNoChallenges') }}</p>
                <ul v-else class="flex flex-col gap-2">
                  <li
                    v-for="id in linkedChallengeIds"
                    :key="id"
                    class="flex items-center gap-2.5 rounded-md border border-border bg-surface-sunken px-3 py-2.5 text-[0.8125rem]"
                  >
                    <span class="h-2 w-2 flex-shrink-0 rounded-full bg-accent"></span>
                    {{ id }}
                  </li>
                </ul>
              </div>

              <div data-test="usage-path-exercises" class="flex flex-col gap-2">
                <span class="text-xs font-semibold text-ink-muted">{{ t('exerciseAuthoringView.usagePathExercisesHeading') }}</span>
                <p v-if="linkedContentNodeIds.length === 0" class="text-sm text-ink-subtle">{{ t('exerciseAuthoringView.usageNoPathExercises') }}</p>
                <ul v-else class="flex flex-col gap-2">
                  <li
                    v-for="id in linkedContentNodeIds"
                    :key="id"
                    class="flex items-center gap-2.5 rounded-md border border-border bg-surface-sunken px-3 py-2.5 text-[0.8125rem]"
                  >
                    <span class="h-2 w-2 flex-shrink-0 rounded-full bg-accent"></span>
                    {{ id }}
                  </li>
                </ul>
              </div>

              <div data-test="usage-practice-sessions" class="flex flex-col gap-2">
                <span class="text-xs font-semibold text-ink-muted">{{ t('exerciseAuthoringView.usagePracticeSessionsHeading') }}</span>
                <p v-if="form.skillIds.value.length === 0" class="text-sm text-ink-subtle">
                  {{ t('exerciseAuthoringView.usageNotEligible') }}
                </p>
                <p v-else class="text-sm text-ink-subtle">{{ t('exerciseAuthoringView.usageEligible') }}</p>
              </div>
            </template>
          </div>
        </section>
      </template>

      <SaveBlockers :items="saveBlockers.shown.value" :reveal="saveBlockers.reveal.value" />

      <section :class="cardClass">
        <h2 :class="eyebrowClass">{{ t('exerciseAuthoringView.details') }}</h2>
        <label class="flex flex-col gap-1.5">
          <span :class="labelClass">{{ t('exerciseAuthoringView.titleLabel') }}</span>
          <input v-model="form.title.value" type="text" :placeholder="t('exerciseAuthoringView.titlePlaceholder')" :class="inputClass" />
          <span :class="hintClass">{{ t('exerciseAuthoringView.titleHint') }}</span>
        </label>
        <div class="flex flex-col gap-1.5">
          <span :class="labelClass">{{ t('exerciseAuthoringView.promptLabel') }}</span>
          <PromptEditor v-model="form.prompt.value" />
        </div>
        <div class="flex flex-col gap-1.5">
          <span :class="labelClass">{{ t('exerciseAuthoringView.exerciseTypeLabel') }}</span>
          <p v-if="typeLocked" data-test="locked-type" class="flex items-center gap-2 text-sm font-semibold text-ink">
            <component :is="lockedType?.icon" :size="16" aria-hidden="true" />
            {{ lockedType?.label }}
            <Lock :size="14" class="text-ink-muted" aria-hidden="true" />
          </p>
          <div v-else class="flex w-fit gap-2 rounded-lg bg-surface-sunken p-1" :class="{ 'flex-wrap': isCompact }">
            <button
              v-for="type in exerciseTypes"
              :key="type.value"
              type="button"
              :data-test="`type-tab-${type.value}`"
              class="flex items-center gap-2 rounded-md px-4 py-[9px] text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              :class="form.exerciseType.value === type.value ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
              @click="form.exerciseType.value = type.value"
            >
              <component :is="type.icon" :size="16" aria-hidden="true" />
              {{ type.label }}
            </button>
          </div>
          <span :class="hintClass">
            {{ typeLocked ? t('exerciseAuthoringView.typeLockedHint') : t('exerciseAuthoringView.typeLockedAfterSave') }}
          </span>
        </div>
        <div class="flex flex-col gap-1.5">
          <span :class="labelClass">{{ t('exerciseAuthoringView.instrumentsLabel') }}</span>
          <InstrumentPicker v-model="form.instrumentIds.value" />
        </div>
        <div class="flex flex-col gap-1.5">
          <span :class="labelClass">{{ t('exerciseAuthoringView.languagesLabel') }}</span>
          <LanguageCodesPicker v-model="form.languageCodes.value" />
        </div>
      </section>

      <div
        v-if="!form.hasCorrectOption.value"
        data-test="no-correct-banner"
        class="flex items-center gap-2.5 rounded-md border border-danger bg-danger-muted px-4 py-3"
      >
        <TriangleAlert :size="18" class="flex-shrink-0 text-danger" aria-hidden="true" />
        <span class="text-sm font-semibold text-danger">
          {{ t('exerciseAuthoringView.noCorrectOptionWarning') }}
        </span>
      </div>

      <section :class="cardClass" data-field="options">
        <div data-field="stimulus" class="contents">
          <div v-if="form.exerciseType.value === 'image_recognition'" class="flex flex-col gap-3">
            <button
              type="button"
              data-test="choose-stimulus"
              class="flex w-fit items-center gap-2.5 rounded-md border border-border bg-surface-raised py-2 pl-2.5 pr-2"
              @click="stimulusPickerOpen = true"
            >
              <span class="text-left">
                <span class="block text-[0.8125rem] font-semibold text-ink">{{
                  showsDiagramStimulus ? t('exerciseAuthoringView.diagramSelected') : stimulusImageLabel
                }}</span>
                <span class="block text-xs text-ink-subtle">{{ t('exerciseAuthoringView.chooseImageOrDiagram') }}</span>
              </span>
              <ChevronRight :size="14" class="text-ink-subtle" aria-hidden="true" />
            </button>
            <template v-if="showsDiagramStimulus && form.stimulusDiagram.value">
              <LoadingSkeleton v-if="stimulus.status.value === 'loading'" />
              <DiagramStimulusEditor
                v-else-if="stimulus.diagram.value && stimulus.instrument.value"
                :key="`${stimulus.diagram.value.diagram_id}-${stimulusPick}`"
                :diagram="stimulus.diagram.value"
                :instrument="stimulus.instrument.value"
                :diagram-ref="form.stimulusDiagram.value"
                @update:diagram-ref="form.setStimulusDiagram"
              />
              <LoadFailed
                v-else-if="stimulus.status.value === 'error'"
                data-test="stimulus-diagram-error"
                :message="t('diagramEmbedPicker.loadErrorMessage')"
                @retry="stimulus.retry"
              />
              <p v-else data-test="stimulus-diagram-unavailable" class="text-sm text-ink-muted">
                {{ t('diagramEmbedPicker.unavailable') }}
              </p>
            </template>
          </div>
          <div v-else-if="form.exerciseType.value === 'audio_recognition'" class="flex flex-col gap-2">
            <span :class="eyebrowClass">{{ t('exerciseAuthoringView.audioStimulusLabel') }}</span>
            <SoundSource
              :sound="stimulusSound"
              :title="t('exerciseAuthoringView.audioStimulusLabel')"
              @file="onStimulusPicked"
              @diagram="openSoundPicker(null)"
              @edit="openSoundPicker(form.soundDiagram.value)"
              @remove="removeSound"
            />
          </div>
        </div>
        <ImageRegionEditor
          v-if="form.exerciseType.value === 'image_recognition' && form.stimulusSource.value === 'image'"
          v-model:new-region-shape="form.newRegionShape.value"
          :image-url="form.imageUrl.value"
          :regions="form.regions.value"
          @add-region="(x, y) => form.addRegion(x, y, form.newRegionShape.value)"
          @move-region="form.moveRegion"
          @resize-region="form.resizeRegion"
          @toggle-region="form.toggleRegion"
          @remove-region="form.removeRegion"
          @update:stimulus-size="form.setStimulusImageSize"
        />

        <TextOptionsEditor
          v-else-if="form.exerciseType.value === 'text_response' || form.exerciseType.value === 'audio_recognition'"
          :options="form.textOptions.value"
          @edit="form.editTextOption"
          @toggle="form.toggleTextOption"
          @remove="form.removeTextOption"
          @add="form.addTextOption"
        />

        <ImageChoiceOptionsEditor
          v-else-if="form.exerciseType.value === 'image_choice'"
          :options="form.imageOptions.value"
          :compact="isCompact"
          @set-preview="form.setImageOptionURL"
          @set-file="onOptionFile"
          @set-diagram="onOptionDiagram"
          @toggle="form.toggleImageOption"
          @remove="onRemoveImageOption"
          @add="form.addImageOption"
        />

        <AudioSelectionOptionsEditor
          v-else-if="form.exerciseType.value === 'audio_selection'"
          :options="form.audioOptions.value"
          :compact="isCompact"
          @set-preview="form.setAudioOptionURL"
          @set-file="onOptionFile"
          @set-diagram="onAudioOptionDiagram"
          @clear-sound="onClearAudioOptionSound"
          @edit-label="form.editAudioOptionLabel"
          @toggle="form.toggleAudioOption"
          @remove="onRemoveAudioOption"
          @add="onAddAudioOption"
        />

      </section>

      <section :class="cardClass">
        <div>
          <h2 :class="eyebrowClass">{{ t('exerciseAuthoringView.classificationLabel') }}</h2>
          <span :class="hintClass">{{ t('exerciseAuthoringView.classificationHint') }}</span>
        </div>
        <div data-field="concepts">
          <SkillConceptTreePicker
            :label="t('classificationFields.conceptLabel')"
            :nodes="conceptNodes"
            :selected-ids="form.conceptIds.value"
            :is-loading="conceptsLoading"
            :load-failed="conceptsError"
            :suggested-ids="suggestedConceptIds"
            :instrument-ids="form.instrumentIds.value"
            missing-hint
            :create-kind="currentUser.profile?.role === 'admin' ? 'concept' : null"
            @update:selected-ids="form.conceptIds.value = $event"
            @retry="retryConcepts"
          />
        </div>
        <div data-field="skills">
          <SkillConceptTreePicker
            :label="t('classificationFields.skillLabel')"
            :nodes="skillNodes"
            :selected-ids="form.skillIds.value"
            :is-loading="skillsLoading"
            :load-failed="skillsError"
            :suggested-ids="suggestedSkillIds"
            :instrument-ids="form.instrumentIds.value"
            missing-hint
            :create-kind="currentUser.profile?.role === 'admin' ? 'skill' : null"
            @update:selected-ids="form.skillIds.value = $event"
            @retry="retrySkills"
          />
        </div>
      </section>
    </EditorBody>

    <SoundPickerModal :open="soundPickerOpen" :initial="soundPickerInitial" @apply="onSoundDiagram" @close="soundPickerOpen = false" />
    <MediaPickerModal
      :open="stimulusPickerOpen && stimulusKind === 'image'"
      :initial-diagram="showsDiagramStimulus ? form.stimulusDiagram.value : null"
      choose-only
      @image="onStimulusPicked"
      @diagram="onStimulusDiagram"
      @close="stimulusPickerOpen = false"
    />
    <ExercisePreview
      :open="previewOpen"
      :prompt="form.prompt.value"
      :exercise-type="form.exerciseType.value"
      :options="previewOptions"
      :image-url="form.imageUrl.value"
      :diagram-ref="previewDiagramRef"
      :audio-url="form.audioUrl.value"
      @close="previewOpen = false"
    />
    <UnsavedChangesGuard :dirty="isDirty" :message="t('exerciseAuthoringView.leaveMessage')" />
  </div>
  </TeachShell>
</template>
