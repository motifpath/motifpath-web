import { computed, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { i18n, toApiLanguageCode } from '@/i18n'
import type { DifficultyLevel } from '@/shared/utils/levels'

type Course = components['schemas']['Course']
type CourseRequest = components['schemas']['CreateCourseRequest']
type LearningPathRef = Pick<components['schemas']['LearningPath'], 'learning_path_id' | 'title'>

export interface CheckpointDraft {
  /** Tells rows apart, since the same path may be a checkpoint more than once. */
  key: string
  learningPathId: string
  /** The path's own title, or null until it is known. */
  pathTitle: string | null
  /** The title override as typed; blank means the path's own title is used. */
  override: string
}

let nextKey = 0

function newKey(): string {
  return `checkpoint-${++nextKey}`
}

/**
 * Holds the course builder's form: its fields, its checkpoints in order,
 * whether it can be saved, and whether it differs from what was last loaded
 * or saved. A course's text is written in its one language, so none of it
 * is localized.
 */
export function useCourseForm() {
  const title = ref('')
  const summary = ref('')
  const level = ref<DifficultyLevel | null>(null)
  const language = ref(toApiLanguageCode(i18n.global.locale.value))
  // Empty means the course suits every instrument.
  const instrumentIds = ref<string[]>([])
  const thumbnailUrl = ref<string | undefined>(undefined)
  const checkpoints = ref<CheckpointDraft[]>([])

  const isValid = computed(
    () =>
      title.value.trim() !== '' &&
      summary.value.trim() !== '' &&
      level.value !== null &&
      language.value !== '' &&
      checkpoints.value.length > 0,
  )

  function checkpointInputs(): CourseRequest['checkpoints'] {
    return checkpoints.value.map((checkpoint) => {
      const override = checkpoint.override.trim()
      return override
        ? { learning_path_id: checkpoint.learningPathId, title: override }
        : { learning_path_id: checkpoint.learningPathId }
    })
  }

  /** The create or replace request for the form; call it only once isValid holds. */
  function toRequest(): CourseRequest {
    if (level.value === null) throw new Error('A course needs a level before it can be saved')
    return {
      title: title.value.trim(),
      summary: summary.value.trim(),
      level: level.value,
      language: language.value,
      instrument_ids: [...instrumentIds.value],
      ...(thumbnailUrl.value ? { thumbnail_url: thumbnailUrl.value } : {}),
      checkpoints: checkpointInputs(),
    }
  }

  // The form as it would be sent, compared against what was last loaded or
  // saved to tell whether anything changed.
  function snapshot(): string {
    return JSON.stringify([
      title.value.trim(),
      summary.value.trim(),
      level.value,
      language.value,
      instrumentIds.value,
      thumbnailUrl.value ?? null,
      checkpointInputs(),
    ])
  }
  const baseline = ref(snapshot())
  const isDirty = computed(() => snapshot() !== baseline.value)

  function markSaved() {
    baseline.value = snapshot()
  }

  function addCheckpoint(path: LearningPathRef) {
    checkpoints.value = [
      ...checkpoints.value,
      { key: newKey(), learningPathId: path.learning_path_id, pathTitle: path.title, override: '' },
    ]
  }

  function moveCheckpoint(fromIndex: number, toIndex: number) {
    const count = checkpoints.value.length
    if (fromIndex < 0 || fromIndex >= count || toIndex < 0 || toIndex >= count) return
    const reordered = [...checkpoints.value]
    const [moved] = reordered.splice(fromIndex, 1)
    if (!moved) return
    reordered.splice(toIndex, 0, moved)
    checkpoints.value = reordered
  }

  function removeCheckpoint(index: number) {
    checkpoints.value = checkpoints.value.filter((_, i) => i !== index)
  }

  /** The distinct paths whose own title isn't known yet. */
  const checkpointsMissingPathTitle = computed(() => [
    ...new Set(checkpoints.value.filter((c) => c.pathTitle === null).map((c) => c.learningPathId)),
  ])

  function setPathTitle(learningPathId: string, pathTitle: string) {
    checkpoints.value = checkpoints.value.map((checkpoint) =>
      checkpoint.learningPathId === learningPathId ? { ...checkpoint, pathTitle } : checkpoint,
    )
  }

  function loadFromCourse(course: Course) {
    title.value = course.title
    summary.value = course.summary
    level.value = course.level
    language.value = course.language
    instrumentIds.value = [...course.instrument_ids]
    thumbnailUrl.value = course.thumbnail_url
    // Without an override, the effective title is the path's own; with one,
    // the path's title has to be looked up.
    checkpoints.value = [...course.checkpoints]
      .sort((a, b) => a.position - b.position)
      .map((checkpoint) => ({
        key: newKey(),
        learningPathId: checkpoint.learning_path_id,
        pathTitle: checkpoint.title ? null : checkpoint.effective_title,
        override: checkpoint.title ?? '',
      }))
    markSaved()
  }

  return {
    title,
    summary,
    level,
    language,
    instrumentIds,
    thumbnailUrl,
    checkpoints,
    isValid,
    isDirty,
    toRequest,
    markSaved,
    addCheckpoint,
    moveCheckpoint,
    removeCheckpoint,
    checkpointsMissingPathTitle,
    setPathTitle,
    loadFromCourse,
  }
}
