<script setup lang="ts">
import { Eye, TriangleAlert } from 'lucide-vue-next'
import { computed, reactive, ref } from 'vue'

import ExercisePreviewModal from '@/features/teacher/components/ExercisePreviewModal.vue'
import ImageChoiceOptionsEditor from '@/features/teacher/components/ImageChoiceOptionsEditor.vue'
import ImagePickerModal from '@/features/teacher/components/ImagePickerModal.vue'
import ImageRegionEditor from '@/features/teacher/components/ImageRegionEditor.vue'
import SkillTagsInput from '@/features/teacher/components/SkillTagsInput.vue'
import TextOptionsEditor from '@/features/teacher/components/TextOptionsEditor.vue'
import { useExerciseForm, type ExerciseType } from '@/features/teacher/composables/useExerciseForm'
import { useMediaUpload } from '@/features/teacher/composables/useMediaUpload'
import AppBar from '@/shared/components/AppBar.vue'
import { useApi } from '@/shared/composables/useApi'
import { useIsCompact } from '@/shared/composables/useIsCompact'
import { useCurrentUserStore } from '@/stores/currentUser'

const currentUser = useCurrentUserStore()
// Admins carry every permission a teacher has (canManageContent on the
// backend already treats them the same) — students never author content.
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)

const { isCompact } = useIsCompact()

const form = useExerciseForm()
const { coreApi } = useApi()
const { upload } = useMediaUpload()

const exerciseTypes: { value: ExerciseType; label: string }[] = [
  { value: 'image_recognition', label: 'Image recognition' },
  { value: 'text_response', label: 'Text response' },
  { value: 'audio_recognition', label: 'Audio recognition' },
  { value: 'image_choice', label: 'Image choice' },
]

// Nothing is uploaded until save — picking a file only sets a local blob:
// preview, so an abandoned edit never leaves an orphaned object in storage.
const stimulusPickerOpen = ref(false)
const stimulusFile = ref<File | null>(null)
const optionFiles = reactive<Record<string, File>>({})

const stimulusKind = computed(() => (form.exerciseType.value === 'audio_recognition' ? 'audio' : 'image'))
const hasStimulus = computed(() =>
  stimulusKind.value === 'audio' ? !!form.audioUrl.value : !!form.imageUrl.value,
)

function onStimulusPicked(file: File) {
  stimulusFile.value = file
  const previewUrl = URL.createObjectURL(file)
  if (form.exerciseType.value === 'audio_recognition') form.audioUrl.value = previewUrl
  else form.imageUrl.value = previewUrl
  stimulusPickerOpen.value = false
}

function onOptionFile(id: string, file: File) {
  optionFiles[id] = file
}

async function uploadPendingMedia() {
  if (stimulusFile.value) {
    const url = await upload(stimulusFile.value, stimulusKind.value)
    if (form.exerciseType.value === 'audio_recognition') form.audioUrl.value = url
    else form.imageUrl.value = url
    stimulusFile.value = null
  }
  for (const [id, file] of Object.entries(optionFiles)) {
    const url = await upload(file, 'image')
    form.setImageOptionURL(id, url)
    delete optionFiles[id]
  }
}

const previewOpen = ref(false)
const saving = ref(false)
const saveError = ref('')
const savedExerciseId = ref('')
const linkedChallengeIds = ref<string[]>([])
const justSaved = ref(false)
let justSavedTimeout: ReturnType<typeof setTimeout> | undefined

async function save() {
  saving.value = true
  saveError.value = ''
  savedExerciseId.value = ''

  try {
    await uploadPendingMedia()
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Failed to upload media'
    saving.value = false
    return
  }

  const { data, error } = await coreApi.POST('/exercises', { body: form.toCreateExerciseRequest() })
  saving.value = false
  if (!data) {
    saveError.value = error?.message ?? 'Failed to create the exercise'
    return
  }
  savedExerciseId.value = data.exercise_id
  linkedChallengeIds.value = data.challenge_ids

  justSaved.value = true
  clearTimeout(justSavedTimeout)
  justSavedTimeout = setTimeout(() => (justSaved.value = false), 2000)
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <AppBar
      context="teacher"
      :compact="isCompact"
      :primary-nav-to="{ name: 'teacher-exercise-new' }"
      breadcrumb-label="New exercise"
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

    <div v-else class="flex flex-1">
      <main class="flex min-w-0 flex-1 flex-col gap-6 px-[48px] pb-[80px] pt-10">
        <div class="flex flex-col gap-1.5">
          <input
            v-model="form.title.value"
            type="text"
            placeholder="Untitled exercise"
            class="border-none bg-transparent text-xl font-bold text-ink outline-none"
          />
          <span class="text-sm text-ink-subtle">Internal title — for the content library, not shown to students</span>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-semibold" for="exercise-prompt">Prompt shown to the student</label>
            <span class="text-xs italic text-ink-subtle">Rich text toolbar — coming soon</span>
          </div>
          <textarea
            id="exercise-prompt"
            v-model="form.prompt.value"
            rows="2"
            class="rounded-md border border-border bg-surface-raised p-3 text-base"
          ></textarea>
        </div>

        <div class="flex flex-col gap-2.5">
          <label class="text-sm font-semibold">Exercise type</label>
          <div class="flex w-fit gap-2 rounded-lg bg-surface-sunken p-1">
            <button
              v-for="type in exerciseTypes"
              :key="type.value"
              type="button"
              :data-test="`type-tab-${type.value}`"
              class="rounded-md px-4 py-2 text-sm font-semibold"
              :class="form.exerciseType.value === type.value ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
              @click="form.exerciseType.value = type.value"
            >
              {{ type.label }}
            </button>
          </div>
          <span class="text-sm text-ink-subtle">
            All types are checked the same way — mark one or more options correct below.
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

        <div
          v-if="form.exerciseType.value === 'image_recognition' || form.exerciseType.value === 'audio_recognition'"
          class="flex flex-col gap-2"
        >
          <label class="text-sm font-semibold">
            {{ stimulusKind === 'audio' ? 'Audio stimulus — what the student listens to' : 'Stimulus image' }}
          </label>
          <button
            type="button"
            data-test="choose-stimulus"
            class="w-fit rounded-md border border-border bg-surface-raised px-3 py-2 text-sm font-semibold"
            @click="stimulusPickerOpen = true"
          >
            {{ hasStimulus ? 'Change' : 'Choose' }} stimulus {{ stimulusKind }}
          </button>
          <audio v-if="stimulusKind === 'audio' && form.audioUrl.value" :src="form.audioUrl.value" controls class="w-full" />
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
          @set-preview="form.setImageOptionURL"
          @set-file="onOptionFile"
          @edit-caption="form.editImageOptionCaption"
          @toggle="form.toggleImageOption"
          @remove="form.removeImageOption"
          @add="form.addImageOption"
        />

        <div class="flex flex-col gap-2 border-t border-border pt-2">
          <label class="text-sm font-semibold">Skill tags</label>
          <span class="-mt-1 text-[0.8125rem] text-ink-subtle">
            Makes this exercise findable outside its original path — e.g. as a remediation suggestion.
          </span>
          <SkillTagsInput :tags="form.skillTags.value" @add="form.addTag" @remove="form.removeTag" />
        </div>

        <div class="flex items-center gap-3">
          <span v-if="savedExerciseId" data-test="save-success" class="text-sm font-semibold text-success">
            Exercise created.
          </span>
          <span v-if="saveError" data-test="save-error" class="text-sm font-semibold text-danger">{{ saveError }}</span>
        </div>
      </main>

      <aside class="flex w-[360px] flex-shrink-0 flex-col gap-5 border-l border-border bg-surface-raised px-[28px] py-[32px]">
        <div data-test="reuse-indicator" class="flex flex-col gap-3">
          <span class="text-[0.8125rem] font-bold uppercase tracking-wide text-ink-muted">Used in challenges</span>
          <p v-if="!savedExerciseId" class="text-sm text-ink-subtle">Not yet linked to any challenge — save the exercise first.</p>
          <p v-else-if="linkedChallengeIds.length === 0" class="text-sm text-ink-subtle">Not linked to any challenge yet.</p>
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
      :options="form.toCreateExerciseRequest().options"
      @close="previewOpen = false"
    />
  </div>
</template>
