<script setup lang="ts">
import { AlignLeft, AudioLines, ChevronRight, Eye, Image, Images, TriangleAlert } from 'lucide-vue-next'
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import AudioSelectionOptionsEditor from '@/features/teacher/components/AudioSelectionOptionsEditor.vue'
import ExercisePreviewModal from '@/features/teacher/components/ExercisePreviewModal.vue'
import ImageChoiceOptionsEditor from '@/features/teacher/components/ImageChoiceOptionsEditor.vue'
import ImagePickerModal from '@/features/teacher/components/ImagePickerModal.vue'
import ImageRegionEditor from '@/features/teacher/components/ImageRegionEditor.vue'
import PromptEditor from '@/features/teacher/components/PromptEditor.vue'
import SkillTagsInput from '@/features/teacher/components/SkillTagsInput.vue'
import TextOptionsEditor from '@/features/teacher/components/TextOptionsEditor.vue'
import { useCreateExercise } from '@/features/teacher/composables/useCreateExercise'
import { useExercise } from '@/features/teacher/composables/useExercise'
import { useExerciseForm, type ExerciseType } from '@/features/teacher/composables/useExerciseForm'
import { useMediaUpload } from '@/features/teacher/composables/useMediaUpload'
import { useSkillTagSuggestions } from '@/features/teacher/composables/useSkillTagSuggestions'
import { useUpdateExercise } from '@/features/teacher/composables/useUpdateExercise'
import AppBar from '@/shared/components/AppBar.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useIsCompact } from '@/shared/composables/useIsCompact'
import { useToast } from '@/shared/composables/useToast'
import { useCurrentUserStore } from '@/stores/currentUser'

const currentUser = useCurrentUserStore()
// Admins carry every permission a teacher has (canManageContent on the
// backend already treats them the same) — students never author content.
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)

const { isCompact } = useIsCompact()

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
const { availableTags: skillTagSuggestions, ensureLoaded: loadSkillTagSuggestions } = useSkillTagSuggestions()

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

const exerciseTypes: { value: ExerciseType; label: string; icon: typeof Image }[] = [
  { value: 'image_recognition', label: 'Image recognition', icon: Image },
  { value: 'text_response', label: 'Text response', icon: AlignLeft },
  { value: 'audio_recognition', label: 'Audio recognition', icon: AudioLines },
  { value: 'image_choice', label: 'Image choice', icon: Images },
  { value: 'audio_selection', label: 'Audio selection', icon: AudioLines },
]

// Nothing is uploaded until save — picking a file only sets a local blob:
// preview, so an abandoned edit never leaves an orphaned object in storage.
const stimulusPickerOpen = ref(false)
// Captures which kind the file was picked for at pick time, not whichever
// type happens to be selected later — exerciseType can change before save.
const stimulusFile = ref<{ file: File; kind: 'image' | 'audio' } | null>(null)
const optionFiles = reactive<Record<string, File>>({})

const stimulusKind = computed(() => (form.exerciseType.value === 'audio_recognition' ? 'audio' : 'image'))
const hasStimulus = computed(() =>
  stimulusKind.value === 'audio' ? !!form.audioUrl.value : !!form.imageUrl.value,
)
const stimulusImageLabel = computed(() =>
  form.imageUrl.value ? (stimulusFile.value?.file.name ?? 'Image selected') : 'No image selected',
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
  target.value = URL.createObjectURL(file)
  stimulusPickerOpen.value = false
}

function onOptionFile(id: string, file: File) {
  optionFiles[id] = file
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
  const pendingStimulus = stimulusFile.value
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
const previewOptions = computed(() => (previewOpen.value ? form.toCreateExerciseRequest().options : []))
const saving = ref(false)
const justSaved = ref(false)
let justSavedTimeout: ReturnType<typeof setTimeout> | undefined
onUnmounted(() => clearTimeout(justSavedTimeout))

const toast = useToast()

async function save() {
  // Re-checked here, not just via the AppBar button's disabled state — the
  // button is the only other line of defense, and this one doesn't depend
  // on a click ever happening through it.
  if (!form.hasCorrectOption.value) return

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

    justSaved.value = true
    clearTimeout(justSavedTimeout)
    justSavedTimeout = setTimeout(() => (justSaved.value = false), 2000)
    toast.success(isUpdate ? 'Exercise updated.' : 'Exercise created.')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to save the exercise')
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
      :primary-nav-to="{ name: 'teacher-exercises' }"
      :breadcrumb-label="isEditMode ? form.title.value || 'Edit exercise' : 'New exercise'"
      :show-save="canAuthor"
      :save-disabled="!form.hasCorrectOption.value || saving"
      :just-saved="justSaved"
      :on-save="save"
    />

    <div v-if="!canAuthor" data-test="permission-denied" class="flex flex-1 items-center justify-center p-10">
      <p class="max-w-md text-center text-ink-muted">
        This page is for teachers and admins only — your account doesn't have permission to author exercises.
      </p>
    </div>

    <div v-else-if="loadingExercise" class="flex flex-1 items-center justify-center p-10">
      <StateLoading noun="exercise" />
    </div>

    <div v-else-if="loadError" data-test="load-error" class="flex flex-1 items-center justify-center p-10">
      <StateError message="Failed to load the exercise" @retry="retryLoad" />
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
            v-model="form.title.value"
            type="text"
            placeholder="Untitled exercise"
            class="border-none bg-transparent font-bold text-ink outline-none"
            :class="isCompact ? 'text-[1.375rem] leading-[1.75rem]' : 'text-xl'"
          />
          <span class="text-sm text-ink-subtle">Internal title — for the content library, not shown to students</span>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-semibold">Prompt shown to the student</label>
          <PromptEditor v-model="form.prompt.value" />
        </div>

        <div class="flex flex-col gap-2.5">
          <label class="text-sm font-semibold">Exercise type</label>
          <div class="flex w-fit gap-2 rounded-lg bg-surface-sunken p-1" :class="{ 'flex-wrap': isCompact }">
            <button
              v-for="type in exerciseTypes"
              :key="type.value"
              type="button"
              :data-test="`type-tab-${type.value}`"
              :disabled="isEditMode"
              class="flex items-center gap-2 rounded-md px-4 py-[9px] text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              :class="form.exerciseType.value === type.value ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
              @click="form.exerciseType.value = type.value"
            >
              <component :is="type.icon" :size="16" aria-hidden="true" />
              {{ type.label }}
            </button>
          </div>
          <span class="text-sm text-ink-subtle">
            {{
              isEditMode
                ? "Type can't be changed after creation."
                : 'All types are checked the same way — mark one or more options correct below.'
            }}
          </span>
        </div>

        <div
          v-if="!form.hasCorrectOption.value"
          data-test="no-correct-banner"
          class="flex items-center gap-2.5 rounded-md border border-danger bg-danger-muted px-4 py-3"
        >
          <TriangleAlert :size="18" class="flex-shrink-0 text-danger" aria-hidden="true" />
          <span class="text-sm font-semibold text-danger">
            Mark at least one option correct — an exercise that can't be checked can't be practiced.
          </span>
        </div>

        <div v-if="form.exerciseType.value === 'image_recognition'" class="flex flex-col gap-2">
          <button
            type="button"
            data-test="choose-stimulus"
            class="flex w-fit items-center gap-2.5 rounded-md border border-border bg-surface-raised py-2 pl-2.5 pr-2"
            @click="stimulusPickerOpen = true"
          >
            <span class="text-left">
              <span class="block text-[0.8125rem] font-semibold text-ink">{{ stimulusImageLabel }}</span>
              <span class="block text-xs text-ink-subtle">Choose image</span>
            </span>
            <ChevronRight :size="14" class="text-ink-subtle" aria-hidden="true" />
          </button>
        </div>

        <div v-else-if="form.exerciseType.value === 'audio_recognition'" class="flex flex-col gap-2">
          <label class="text-sm font-semibold">Audio stimulus — what the student listens to</label>
          <button
            type="button"
            data-test="choose-stimulus"
            class="w-fit rounded-md border border-border bg-surface-raised px-3 py-2 text-sm font-semibold"
            @click="stimulusPickerOpen = true"
          >
            {{ hasStimulus ? 'Change' : 'Choose' }} stimulus {{ stimulusKind }}
          </button>
          <audio v-if="form.audioUrl.value" :src="form.audioUrl.value" controls class="w-full" />
        </div>

        <ImageRegionEditor
          v-if="form.exerciseType.value === 'image_recognition'"
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
          @edit-label="form.editAudioOptionLabel"
          @toggle="form.toggleAudioOption"
          @remove="onRemoveAudioOption"
          @add="form.addAudioOption"
        />

        <div class="flex flex-col gap-2 border-t border-border pt-2">
          <label class="text-sm font-semibold">Skill tags</label>
          <span class="-mt-1 text-[0.8125rem] text-ink-subtle">
            Makes this exercise findable outside its original path — e.g. as a remediation suggestion.
          </span>
          <SkillTagsInput
            :tags="form.skillTags.value"
            :suggestions="skillTagSuggestions"
            @add="form.addTag"
            @remove="form.removeTag"
            @focus="loadSkillTagSuggestions"
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
        <div data-test="reuse-indicator" class="flex flex-col gap-4">
          <span class="text-[0.8125rem] font-bold uppercase tracking-wide text-ink-muted">Where this exercise is used</span>
          <p v-if="!savedExerciseId" class="text-sm text-ink-subtle">Save the exercise to see where it's used.</p>
          <template v-else>
            <div data-test="usage-challenges" class="flex flex-col gap-2">
              <span class="text-xs font-semibold text-ink-muted">Challenges</span>
              <p v-if="linkedChallengeIds.length === 0" class="text-sm text-ink-subtle">Not linked to any challenge yet.</p>
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
              <span class="text-xs font-semibold text-ink-muted">Path exercises</span>
              <p v-if="linkedContentNodeIds.length === 0" class="text-sm text-ink-subtle">Not linked to any path node yet.</p>
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
              <span class="text-xs font-semibold text-ink-muted">Practice sessions</span>
              <p v-if="form.skillTags.value.length === 0" class="text-sm text-ink-subtle">
                Not eligible — add a skill tag to make this exercise selectable for a skill-targeted practice session.
              </p>
              <p v-else class="text-sm text-ink-subtle">Eligible for practice sessions matching: {{ form.skillTags.value.join(', ') }}</p>
            </div>
          </template>
        </div>

        <div class="h-px bg-border"></div>

        <div class="flex flex-col gap-2.5">
          <span class="text-[0.8125rem] font-bold uppercase tracking-wide text-ink-muted">Student preview</span>
          <button
            type="button"
            data-test="open-preview"
            class="flex items-center justify-center gap-2 rounded-md border border-border bg-surface-raised p-[11px] text-[0.8125rem] font-semibold"
            @click="previewOpen = true"
          >
            <Eye :size="15" aria-hidden="true" />
            Preview as student
          </button>
        </div>
      </aside>
    </div>

    <ImagePickerModal :open="stimulusPickerOpen" :kind="stimulusKind" @select="onStimulusPicked" @close="stimulusPickerOpen = false" />
    <ExercisePreviewModal
      :open="previewOpen"
      :prompt="form.prompt.value"
      :exercise-type="form.exerciseType.value"
      :options="previewOptions"
      :image-url="form.imageUrl.value"
      :audio-url="form.audioUrl.value"
      @close="previewOpen = false"
    />
  </div>
</template>
