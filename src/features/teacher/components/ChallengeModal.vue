<script setup lang="ts">
import { Plus, X } from 'lucide-vue-next'
import { computed, reactive, ref, watch } from 'vue'

import ChallengeConfigPanel from '@/features/teacher/components/ChallengeConfigPanel.vue'
import ExercisePickerModal from '@/features/teacher/components/ExercisePickerModal.vue'
import type { TreeNode } from '@/shared/components/SkillConceptTreePicker.vue'
import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { components } from '@/api/generated/core-domain'

type Exercise = components['schemas']['Exercise']
type CreateChallengeRequest = components['schemas']['CreateChallengeRequest']

export interface ChallengeModalInitial {
  subjectSkillId: string | undefined
  subjectConceptId: string | undefined
  passThreshold: number
  shuffleExercises: boolean
  shuffleOptions: boolean
  exercises: Exercise[]
}

const props = defineProps<{
  open: boolean
  skillNodes: TreeNode[]
  conceptNodes: TreeNode[]
  allowedSkillIds: string[]
  allowedConceptIds: string[]
  exercisePool: Exercise[]
  /** The challenge being edited, or null when building a new one. */
  initial: ChallengeModalInitial | null
  saving: boolean
}>()
const emit = defineEmits<{
  save: [{ fields: CreateChallengeRequest; exerciseIds: string[] }]
  close: []
}>()

const { t } = useTypedT()

const draft = reactive<Omit<ChallengeModalInitial, 'exercises'>>({
  subjectSkillId: undefined,
  subjectConceptId: undefined,
  passThreshold: 70,
  shuffleExercises: false,
  shuffleOptions: false,
})
const draftExercises = ref<Exercise[]>([])
const pickerOpen = ref(false)

// Every open starts from the saved challenge (or a blank one), so edits that
// were closed without saving never leak into the next open.
watch(
  () => props.open,
  (open) => {
    if (!open) return
    draft.subjectSkillId = props.initial?.subjectSkillId
    draft.subjectConceptId = props.initial?.subjectConceptId
    draft.passThreshold = props.initial?.passThreshold ?? 70
    draft.shuffleExercises = props.initial?.shuffleExercises ?? false
    draft.shuffleOptions = props.initial?.shuffleOptions ?? false
    draftExercises.value = [...(props.initial?.exercises ?? [])]
    pickerOpen.value = false
  },
  { immediate: true },
)

const draftExerciseIds = computed(() => draftExercises.value.map((e) => e.exercise_id))

// The panel emits Number(input), so an emptied field arrives as 0.
const thresholdValid = computed(
  () => Number.isInteger(draft.passThreshold) && draft.passThreshold >= 1 && draft.passThreshold <= 100,
)

const canSave = computed(
  () =>
    !props.saving &&
    thresholdValid.value &&
    (!!draft.subjectSkillId || !!draft.subjectConceptId) &&
    draftExercises.value.length > 0,
)

function onExercisePicked(exerciseId: string) {
  const exercise = props.exercisePool.find((e) => e.exercise_id === exerciseId)
  if (exercise) draftExercises.value = [...draftExercises.value, exercise]
}

function removeExercise(exerciseId: string) {
  draftExercises.value = draftExercises.value.filter((e) => e.exercise_id !== exerciseId)
}

function save() {
  if (!canSave.value) return
  emit('save', {
    fields: {
      subject_skill_id: draft.subjectSkillId,
      subject_concept_id: draft.subjectConceptId,
      pass_threshold: draft.passThreshold,
      shuffle_exercises: draft.shuffleExercises,
      shuffle_options: draft.shuffleOptions,
    },
    exerciseIds: draftExerciseIds.value,
  })
}
</script>

<template>
  <ModalOverlay
    :open="open"
    panel-class="flex max-h-[90vh] w-[560px] max-w-[92vw] flex-col gap-4 overflow-y-auto rounded-xl bg-surface-raised p-5 shadow-level2"
    @close="emit('close')"
  >
    <div data-test="challenge-modal" class="contents">
      <div class="flex items-center justify-between">
        <span class="text-base font-bold">
          {{ initial ? t('challengeModal.editTitle') : t('challengeModal.buildTitle') }}
        </span>
        <ModalCloseButton @close="emit('close')" />
      </div>

      <ChallengeConfigPanel
        v-model:subject-skill-id="draft.subjectSkillId"
        v-model:subject-concept-id="draft.subjectConceptId"
        v-model:pass-threshold="draft.passThreshold"
        v-model:shuffle-exercises="draft.shuffleExercises"
        v-model:shuffle-options="draft.shuffleOptions"
        :skill-nodes="skillNodes"
        :concept-nodes="conceptNodes"
        :allowed-skill-ids="allowedSkillIds"
        :allowed-concept-ids="allowedConceptIds"
      />
      <p v-if="!thresholdValid" data-test="challenge-threshold-error" class="-mt-2 text-sm text-danger">
        {{ t('challengeModal.thresholdInvalid') }}
      </p>

      <div class="flex flex-col gap-2 border-t border-border pt-4">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold">{{ t('challengeModal.exercisesLabel') }}</span>
          <button
            type="button"
            data-test="attach-exercise"
            class="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[0.8125rem] font-semibold text-accent-fg"
            @click="pickerOpen = true"
          >
            <Plus :size="14" aria-hidden="true" />
            {{ t('challengeModal.attachExercise') }}
          </button>
        </div>

        <p v-if="draftExercises.length === 0" data-test="challenge-needs-exercises" class="text-sm text-ink-subtle">
          {{ t('challengeModal.needsExercises') }}
        </p>
        <ul v-else class="flex flex-col gap-2">
          <li
            v-for="exercise in draftExercises"
            :key="exercise.exercise_id"
            data-test="challenge-exercise"
            class="flex items-center justify-between rounded-md border border-border bg-surface-sunken px-3 py-2"
          >
            <span class="text-sm font-semibold text-ink">{{ exercise.title }}</span>
            <button
              type="button"
              data-test="unlink-exercise"
              :aria-label="t('challengeModal.removeExerciseAriaLabel')"
              class="text-ink-subtle"
              @click="removeExercise(exercise.exercise_id)"
            >
              <X :size="14" aria-hidden="true" />
            </button>
          </li>
        </ul>
      </div>

      <div class="flex justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          data-test="cancel-challenge"
          class="rounded-md border border-border bg-surface-raised px-3.5 py-2 text-[0.8125rem] font-semibold"
          @click="emit('close')"
        >
          {{ t('challengeModal.cancel') }}
        </button>
        <button
          type="button"
          data-test="save-challenge"
          :disabled="!canSave"
          class="rounded-md bg-accent px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-fg disabled:cursor-not-allowed disabled:opacity-60"
          @click="save"
        >
          {{ t('challengeModal.save') }}
        </button>
      </div>
    </div>

    <ExercisePickerModal
      :open="pickerOpen"
      :exercises="exercisePool"
      :linked-exercise-ids="draftExerciseIds"
      @select="onExercisePicked"
      @close="pickerOpen = false"
    />
  </ModalOverlay>
</template>
