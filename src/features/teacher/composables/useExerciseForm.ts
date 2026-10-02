import { computed, ref, type Ref } from 'vue'

import { isValidTempoBpm } from '@/shared/utils/sequence'
import type { components } from '@/api/generated/core-domain'

type CreateExerciseRequest = components['schemas']['CreateExerciseRequest']
type UpdateExerciseRequest = components['schemas']['UpdateExerciseRequest']
type Exercise = components['schemas']['Exercise']
type Option = components['schemas']['Option']
type RegionShape = components['schemas']['OptionRegion']['shape']
type PromptDocument = components['schemas']['PromptDocument']
type DiagramRef = components['schemas']['DiagramRef']
type DiagramStackRef = components['schemas']['DiagramStackRef']
export type ExerciseType = CreateExerciseRequest['exercise_type']

const EMPTY_PROMPT: PromptDocument = { type: 'doc', content: [] }

export interface TextOption {
  id: string
  label: string
  correct: boolean
}

export interface ImageOption {
  id: string
  imageUrl: string
  /** A prebuilt diagram shown instead of an image; one or the other. */
  diagramRef?: DiagramRef
  correct: boolean
}

export interface AudioOption {
  id: string
  audioUrl: string
  /** Shown as the student-facing button label — audio_selection has no visible player. */
  label: string
  correct: boolean
}

export interface Region {
  id: string
  /** Percent (0-100) of the stimulus image's width/height. */
  x: number
  y: number
  width: number
  height: number
  shape: RegionShape
  correct: boolean
}

const REGION_MIN_SIZE = { circle: 18, rectangle: { width: 18, height: 16 } }
const REGION_MAX_SIZE = { width: 160, height: 110 }

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// A real UUID, not a locally-scoped placeholder — the API requires option_id
// to be one (CreateExerciseRequest's Option schema is Format: uuid), so a
// client-generated id that ever reaches the wire has to already be valid.
function makeId(): string {
  return crypto.randomUUID()
}

// toggle/remove are identical find-and-mutate / filter-out logic across
// textOptions/imageOptions/audioOptions -- only add and the per-kind url/label
// setters differ enough to stay as their own functions below.
function makeOptionListHelpers<T extends { id: string; correct: boolean }>(list: Ref<T[]>) {
  function toggle(id: string) {
    const option = list.value.find((o) => o.id === id)
    if (option) option.correct = !option.correct
  }
  function remove(id: string) {
    list.value = list.value.filter((o) => o.id !== id)
  }
  return { toggle, remove }
}

/**
 * Holds all authoring state for one exercise (any of the 5 types) and maps
 * it to the CreateExerciseRequest shape the API expects. Only one of
 * textOptions/imageOptions/audioOptions/regions is meaningful at a time,
 * matching exerciseType — the others stay populated so a teacher can switch
 * types back and forth without losing what they've already entered.
 */
export function useExerciseForm() {
  const title = ref('')
  const prompt = ref<PromptDocument>(EMPTY_PROMPT)
  const exerciseType = ref<ExerciseType>('text_response')
  const skillIds = ref<string[]>([])
  const conceptIds = ref<string[]>([])
  const imageUrl = ref('')
  const audioUrl = ref('')

  const textOptions = ref<TextOption[]>([])
  const imageOptions = ref<ImageOption[]>([])
  const audioOptions = ref<AudioOption[]>([])
  const regions = ref<Region[]>([])
  const newRegionShape = ref<RegionShape>('circle')
  const stimulusImageSize = ref({ width: 0, height: 0 })
  // image_recognition regions are stored as fractions of the stimulus
  // image's rendered size, but that size is only known once the <img> has
  // actually loaded in the browser — so a loaded exercise's regions wait
  // here until setStimulusImageSize reports a real measurement.
  const pendingRegionOptions = ref<Option[] | null>(null)
  // An image_recognition stimulus can be a prebuilt diagram instead of an
  // image: its answers are its correct_position_ids, and the server derives the
  // options from its fretboard cells. A stack can't be authored here, so a loaded
  // one is kept as it is until a single diagram replaces it.
  // Which kind of stimulus the teacher is authoring; switching keeps the
  // other kind's work, so switching back finds it again.
  const stimulusSource = ref<'image' | 'diagram'>('image')
  const stimulusDiagram = ref<DiagramRef | null>(null)
  const stimulusStack = ref<DiagramStackRef | null>(null)
  const hasDiagramStimulus = computed(
    () => exerciseType.value === 'image_recognition' && stimulusSource.value === 'diagram',
  )

  /** The diagram stimulus as picked, then as edited in the form; it may have no correct position yet. */
  function setStimulusDiagram(diagramRef: DiagramRef | null) {
    stimulusDiagram.value = diagramRef
    if (diagramRef) {
      stimulusStack.value = null
      stimulusSource.value = 'diagram'
    }
  }

  const hasCorrectOption = computed(() => {
    switch (exerciseType.value) {
      case 'text_response':
      case 'audio_recognition':
        return textOptions.value.some((o) => o.correct)
      case 'image_choice':
        return imageOptions.value.some((o) => o.correct)
      case 'audio_selection':
        return audioOptions.value.some((o) => o.correct)
      case 'image_recognition':
        if (stimulusSource.value === 'image') return regions.value.some((r) => r.correct)
        if (stimulusDiagram.value) {
          // A stimulus saved before correct positions existed still names its answers by interval.
          const { correct_position_ids: positions, correct_intervals: intervals } = stimulusDiagram.value
          return (positions?.length ?? intervals?.length ?? 0) > 0
        }
        return stimulusStack.value !== null
      default:
        return false
    }
  })

  // The stimulus editor reports every edit, a tempo still being typed
  // included, so a tempo the server would reject has to stop the save here.
  const hasValidStimulusPlayback = computed(() => {
    const tempo = hasDiagramStimulus.value ? stimulusDiagram.value?.playback?.tempo_bpm : null
    return tempo == null || isValidTempoBpm(tempo)
  })

  const textOptionHelpers = makeOptionListHelpers(textOptions)
  function addTextOption() {
    textOptions.value.push({ id: makeId(), label: '', correct: false })
  }
  function editTextOption(id: string, label: string) {
    const option = textOptions.value.find((o) => o.id === id)
    if (option) option.label = label
  }
  const toggleTextOption = textOptionHelpers.toggle
  const removeTextOption = textOptionHelpers.remove

  const imageOptionHelpers = makeOptionListHelpers(imageOptions)
  function addImageOption() {
    imageOptions.value.push({ id: makeId(), imageUrl: '', correct: false })
  }
  function setImageOptionURL(id: string, url: string) {
    const option = imageOptions.value.find((o) => o.id === id)
    if (!option) return
    option.imageUrl = url
    option.diagramRef = undefined
  }
  function setImageOptionDiagram(id: string, diagramRef: DiagramRef) {
    const option = imageOptions.value.find((o) => o.id === id)
    if (!option) return
    option.diagramRef = diagramRef
    option.imageUrl = ''
  }
  const toggleImageOption = imageOptionHelpers.toggle
  const removeImageOption = imageOptionHelpers.remove

  const audioOptionHelpers = makeOptionListHelpers(audioOptions)
  function addAudioOption() {
    audioOptions.value.push({ id: makeId(), audioUrl: '', label: '', correct: false })
  }
  function setAudioOptionURL(id: string, url: string) {
    const option = audioOptions.value.find((o) => o.id === id)
    if (option) option.audioUrl = url
  }
  function editAudioOptionLabel(id: string, label: string) {
    const option = audioOptions.value.find((o) => o.id === id)
    if (option) option.label = label
  }
  const toggleAudioOption = audioOptionHelpers.toggle
  const removeAudioOption = audioOptionHelpers.remove

  function addRegion(x: number, y: number, shape: RegionShape) {
    const size = shape === 'circle' ? { width: 30, height: 30 } : { width: 70, height: 38 }
    regions.value.push({ id: makeId(), x, y, shape, correct: false, ...size })
  }
  function moveRegion(id: string, x: number, y: number) {
    const region = regions.value.find((r) => r.id === id)
    if (!region) return
    region.x = clamp(x, 0, 100)
    region.y = clamp(y, 0, 100)
  }
  function resizeRegion(id: string, deltaWidth: number, deltaHeight: number) {
    const region = regions.value.find((r) => r.id === id)
    if (!region) return
    if (region.shape === 'circle') {
      const size = clamp(region.width + deltaWidth, REGION_MIN_SIZE.circle, REGION_MAX_SIZE.width)
      region.width = size
      region.height = size
      return
    }
    region.width = clamp(region.width + deltaWidth, REGION_MIN_SIZE.rectangle.width, REGION_MAX_SIZE.width)
    region.height = clamp(region.height + deltaHeight, REGION_MIN_SIZE.rectangle.height, REGION_MAX_SIZE.height)
  }
  function toggleRegion(id: string) {
    const region = regions.value.find((r) => r.id === id)
    if (region) region.correct = !region.correct
  }
  function removeRegion(id: string) {
    regions.value = regions.value.filter((r) => r.id !== id)
  }
  function setStimulusImageSize(width: number, height: number) {
    stimulusImageSize.value = { width, height }
    if (pendingRegionOptions.value && width > 0 && height > 0) {
      regions.value = pendingRegionOptions.value.map((o) => ({
        id: o.option_id,
        x: (o.region?.x ?? 0) * 100,
        y: (o.region?.y ?? 0) * 100,
        width: (o.region?.width ?? 0) * width,
        height: (o.region?.height ?? 0) * height,
        shape: o.region?.shape ?? 'circle',
        correct: o.is_correct,
      }))
      pendingRegionOptions.value = null
    }
  }

  function optionsForRequest(): Option[] {
    switch (exerciseType.value) {
      case 'text_response':
      case 'audio_recognition':
        return textOptions.value.map((o) => ({ option_id: o.id, is_correct: o.correct, label: o.label }))
      case 'image_choice':
        return imageOptions.value.map((o) => ({
          option_id: o.id,
          is_correct: o.correct,
          ...(o.diagramRef ? { diagram_ref: o.diagramRef } : { image_url: o.imageUrl }),
        }))
      case 'audio_selection':
        return audioOptions.value.map((o) => ({
          option_id: o.id,
          is_correct: o.correct,
          audio_url: o.audioUrl,
          label: o.label,
        }))
      case 'image_recognition': {
        const { width: imageWidth, height: imageHeight } = stimulusImageSize.value
        return regions.value.map((r) => ({
          option_id: r.id,
          is_correct: r.correct,
          region: {
            x: r.x / 100,
            y: r.y / 100,
            width: imageWidth > 0 ? r.width / imageWidth : 0,
            height: imageHeight > 0 ? r.height / imageHeight : 0,
            shape: r.shape,
          },
        }))
      }
      default:
        // A stale generated client could see a type value this build
        // doesn't recognize yet — fail safe with no options (still rejected
        // by hasCorrectOption/the API) rather than returning undefined.
        return []
    }
  }

  function sharedRequestFields() {
    // No authoring UI exists yet for tagging an exercise's language(s) — default
    // to language-agnostic until that surface is built.
    const fields: Omit<UpdateExerciseRequest, 'title' | 'prompt' | 'options'> = {
      skill_ids: [...skillIds.value],
      concept_ids: [...conceptIds.value],
      language_codes: ['any'],
    }
    if (hasDiagramStimulus.value) {
      if (stimulusDiagram.value) fields.diagram_ref = stimulusDiagram.value
      else if (stimulusStack.value) fields.diagram_stack_ref = stimulusStack.value
    } else if (exerciseType.value === 'image_recognition' && imageUrl.value) {
      fields.image_url = imageUrl.value
    }
    if (exerciseType.value === 'audio_recognition' && audioUrl.value) fields.audio_url = audioUrl.value
    return fields
  }

  // A diagram stimulus's options are derived by the server from its
  // positions, so the request must not carry any.
  function optionsField(): { options?: Option[] } {
    return hasDiagramStimulus.value ? {} : { options: optionsForRequest() }
  }

  function toCreateExerciseRequest(): CreateExerciseRequest {
    return {
      title: title.value,
      prompt: prompt.value,
      exercise_type: exerciseType.value,
      ...optionsField(),
      ...sharedRequestFields(),
    }
  }

  function toUpdateExerciseRequest(): UpdateExerciseRequest {
    return {
      title: title.value,
      prompt: prompt.value,
      ...optionsField(),
      ...sharedRequestFields(),
    }
  }

  function loadFromExercise(exercise: Exercise) {
    title.value = exercise.title
    prompt.value = exercise.prompt
    exerciseType.value = exercise.exercise_type
    skillIds.value = exercise.skills.map((s) => s.node_id)
    conceptIds.value = exercise.concepts.map((c) => c.node_id)
    imageUrl.value = exercise.image_url ?? ''
    audioUrl.value = exercise.audio_url ?? ''
    stimulusDiagram.value = exercise.diagram_ref ?? null
    stimulusStack.value = exercise.diagram_stack_ref ?? null
    stimulusSource.value = stimulusDiagram.value || stimulusStack.value ? 'diagram' : 'image'
    textOptions.value = []
    imageOptions.value = []
    audioOptions.value = []
    regions.value = []
    pendingRegionOptions.value = null

    switch (exercise.exercise_type) {
      case 'text_response':
      case 'audio_recognition':
        textOptions.value = exercise.options.map((o) => ({ id: o.option_id, label: o.label ?? '', correct: o.is_correct }))
        break
      case 'image_choice':
        imageOptions.value = exercise.options.map((o) => ({
          id: o.option_id,
          imageUrl: o.image_url ?? '',
          ...(o.diagram_ref ? { diagramRef: o.diagram_ref } : {}),
          correct: o.is_correct,
        }))
        break
      case 'audio_selection':
        audioOptions.value = exercise.options.map((o) => ({
          id: o.option_id,
          audioUrl: o.audio_url ?? '',
          label: o.label ?? '',
          correct: o.is_correct,
        }))
        break
      case 'image_recognition':
        // A diagram stimulus's options are derived, not hand-drawn regions.
        if (!exercise.diagram_ref && !exercise.diagram_stack_ref) pendingRegionOptions.value = exercise.options
        break
    }
  }

  return {
    title,
    prompt,
    exerciseType,
    skillIds,
    conceptIds,
    imageUrl,
    stimulusSource,
    stimulusDiagram,
    stimulusStack,
    hasDiagramStimulus,
    setStimulusDiagram,
    audioUrl,
    textOptions,
    imageOptions,
    audioOptions,
    regions,
    newRegionShape,
    hasCorrectOption,
    hasValidStimulusPlayback,
    addTextOption,
    editTextOption,
    toggleTextOption,
    removeTextOption,
    addImageOption,
    setImageOptionURL,
    setImageOptionDiagram,
    toggleImageOption,
    removeImageOption,
    addAudioOption,
    setAudioOptionURL,
    editAudioOptionLabel,
    toggleAudioOption,
    removeAudioOption,
    addRegion,
    moveRegion,
    resizeRegion,
    toggleRegion,
    removeRegion,
    setStimulusImageSize,
    toCreateExerciseRequest,
    toUpdateExerciseRequest,
    loadFromExercise,
  }
}
