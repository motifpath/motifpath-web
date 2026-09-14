<script setup lang="ts">
import { ref } from 'vue'

import ImageChoiceOptionsEditor from '@/features/teacher/components/ImageChoiceOptionsEditor.vue'
import ImagePickerModal from '@/features/teacher/components/ImagePickerModal.vue'
import ImageRegionEditor from '@/features/teacher/components/ImageRegionEditor.vue'
import SkillTagsInput from '@/features/teacher/components/SkillTagsInput.vue'
import StudentPreviewModal from '@/features/teacher/components/StudentPreviewModal.vue'
import TextOptionsEditor from '@/features/teacher/components/TextOptionsEditor.vue'
import { useExerciseForm, type ExerciseType } from '@/features/teacher/composables/useExerciseForm'
import { useApi } from '@/shared/composables/useApi'

const form = useExerciseForm()
const { coreApi } = useApi()

const exerciseTypes: { value: ExerciseType; label: string }[] = [
  { value: 'image_recognition', label: 'Image recognition' },
  { value: 'text_response', label: 'Text response' },
  { value: 'audio_recognition', label: 'Audio recognition' },
  { value: 'image_choice', label: 'Image choice' },
]

const stimulusPickerOpen = ref(false)
const previewOpen = ref(false)
const saving = ref(false)
const saveError = ref('')
const savedExerciseId = ref('')

function onStimulusPicked(url: string) {
  if (form.exerciseType.value === 'image_recognition') form.imageUrl.value = url
  stimulusPickerOpen.value = false
}

async function save() {
  saving.value = true
  saveError.value = ''
  savedExerciseId.value = ''
  const { data, error } = await coreApi.POST('/exercises', { body: form.toCreateExerciseRequest() })
  saving.value = false
  if (!data) {
    saveError.value = error?.message ?? 'Failed to create the exercise'
    return
  }
  savedExerciseId.value = data.exercise_id
}
</script>

<template>
  <section class="mx-auto flex max-w-3xl flex-col gap-8 p-6">
    <div class="flex flex-col gap-1.5">
      <input
        v-model="form.title.value"
        type="text"
        placeholder="Untitled exercise"
        class="border-none bg-transparent text-2xl font-bold text-ink outline-none"
      />
      <span class="text-sm text-ink-subtle">Internal title — for the content library, not shown to students</span>
    </div>

    <div class="flex flex-col gap-2">
      <label class="text-sm font-semibold" for="exercise-prompt">Prompt shown to the student</label>
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
    </div>

    <div
      v-if="!form.hasCorrectOption.value"
      data-test="no-correct-banner"
      class="flex items-center gap-2.5 rounded-md border border-danger bg-danger-muted px-4 py-3"
    >
      <span class="text-sm font-semibold text-danger">
        Mark at least one option correct — an exercise that can't be checked can't be practiced.
      </span>
    </div>

    <div v-if="form.exerciseType.value === 'image_recognition'" class="flex flex-col gap-3.5">
      <button
        type="button"
        class="w-fit rounded-md border border-border bg-surface-raised px-3 py-2 text-sm font-semibold"
        @click="stimulusPickerOpen = true"
      >
        {{ form.imageUrl.value ? 'Change stimulus image' : 'Choose stimulus image' }}
      </button>
      <ImageRegionEditor
        v-model:new-region-shape="form.newRegionShape.value"
        :image-url="form.imageUrl.value"
        :regions="form.regions.value"
        @add-region="(x, y) => form.addRegion(x, y, form.newRegionShape.value)"
        @move-region="form.moveRegion"
        @resize-region="form.resizeRegion"
        @toggle-region="form.toggleRegion"
        @remove-region="form.removeRegion"
      />
    </div>

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
      @set-image="form.setImageOptionURL"
      @edit-caption="form.editImageOptionCaption"
      @toggle="form.toggleImageOption"
      @remove="form.removeImageOption"
      @add="form.addImageOption"
    />

    <div class="flex flex-col gap-2 border-t border-border pt-4">
      <label class="text-sm font-semibold">Skill tags</label>
      <SkillTagsInput :tags="form.skillTags.value" @add="form.addTag" @remove="form.removeTag" />
    </div>

    <div class="flex items-center gap-3 border-t border-border pt-4">
      <button
        type="button"
        data-test="save-exercise"
        class="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-50"
        :disabled="!form.hasCorrectOption.value || saving"
        @click="save"
      >
        {{ saving ? 'Saving…' : 'Save exercise' }}
      </button>
      <button
        type="button"
        data-test="open-preview"
        class="rounded-md border border-border px-4 py-2 text-sm font-semibold"
        @click="previewOpen = true"
      >
        Preview as student
      </button>
      <span v-if="savedExerciseId" data-test="save-success" class="text-sm font-semibold text-success">
        Exercise created.
      </span>
      <span v-if="saveError" data-test="save-error" class="text-sm font-semibold text-danger">{{ saveError }}</span>
    </div>

    <ImagePickerModal :open="stimulusPickerOpen" @select="onStimulusPicked" @close="stimulusPickerOpen = false" />
    <StudentPreviewModal
      :open="previewOpen"
      :prompt="form.prompt.value"
      :exercise-type="form.exerciseType.value"
      :image-url="form.imageUrl.value"
      :text-options="form.textOptions.value"
      :image-options="form.imageOptions.value"
      :regions="form.regions.value"
      @close="previewOpen = false"
    />
  </section>
</template>
