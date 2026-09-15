import { computed, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'

type CreateExerciseRequest = components['schemas']['CreateExerciseRequest']
type Option = components['schemas']['Option']
type RegionShape = components['schemas']['OptionRegion']['shape']
export type ExerciseType = CreateExerciseRequest['exercise_type']

export interface TextOption {
  id: string
  label: string
  correct: boolean
}

export interface ImageOption {
  id: string
  imageUrl: string
  caption: string
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

/**
 * Holds all authoring state for one exercise (any of the 4 types) and maps
 * it to the CreateExerciseRequest shape the API expects. Only one of
 * textOptions/imageOptions/regions is meaningful at a time, matching
 * exerciseType — the others stay populated so a teacher can switch types
 * back and forth without losing what they've already entered.
 */
export function useExerciseForm() {
  const title = ref('')
  const prompt = ref('')
  const exerciseType = ref<ExerciseType>('text_response')
  const skillTags = ref<string[]>([])
  const imageUrl = ref('')
  const audioUrl = ref('')

  const textOptions = ref<TextOption[]>([])
  const imageOptions = ref<ImageOption[]>([])
  const regions = ref<Region[]>([])
  const newRegionShape = ref<RegionShape>('circle')
  const stimulusImageSize = ref({ width: 0, height: 0 })

  const hasCorrectOption = computed(() => {
    switch (exerciseType.value) {
      case 'text_response':
      case 'audio_recognition':
        return textOptions.value.some((o) => o.correct)
      case 'image_choice':
        return imageOptions.value.some((o) => o.correct)
      case 'image_recognition':
        return regions.value.some((r) => r.correct)
      default:
        return false
    }
  })

  function addTextOption() {
    textOptions.value.push({ id: makeId(), label: '', correct: false })
  }
  function editTextOption(id: string, label: string) {
    const option = textOptions.value.find((o) => o.id === id)
    if (option) option.label = label
  }
  function toggleTextOption(id: string) {
    const option = textOptions.value.find((o) => o.id === id)
    if (option) option.correct = !option.correct
  }
  function removeTextOption(id: string) {
    textOptions.value = textOptions.value.filter((o) => o.id !== id)
  }

  function addImageOption() {
    imageOptions.value.push({ id: makeId(), imageUrl: '', caption: '', correct: false })
  }
  function setImageOptionURL(id: string, url: string) {
    const option = imageOptions.value.find((o) => o.id === id)
    if (option) option.imageUrl = url
  }
  function editImageOptionCaption(id: string, caption: string) {
    const option = imageOptions.value.find((o) => o.id === id)
    if (option) option.caption = caption
  }
  function toggleImageOption(id: string) {
    const option = imageOptions.value.find((o) => o.id === id)
    if (option) option.correct = !option.correct
  }
  function removeImageOption(id: string) {
    imageOptions.value = imageOptions.value.filter((o) => o.id !== id)
  }

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
  }

  function addTag(raw: string) {
    const tag = raw.trim()
    if (!tag || skillTags.value.includes(tag)) return
    skillTags.value.push(tag)
  }
  function removeTag(tag: string) {
    skillTags.value = skillTags.value.filter((t) => t !== tag)
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
          image_url: o.imageUrl,
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

  function toCreateExerciseRequest(): CreateExerciseRequest {
    const request: CreateExerciseRequest = {
      title: title.value,
      prompt: prompt.value,
      exercise_type: exerciseType.value,
      options: optionsForRequest(),
    }
    if (skillTags.value.length > 0) request.skill_tags = [...skillTags.value]
    if (exerciseType.value === 'image_recognition' && imageUrl.value) request.image_url = imageUrl.value
    if (exerciseType.value === 'audio_recognition' && audioUrl.value) request.audio_url = audioUrl.value
    return request
  }

  return {
    title,
    prompt,
    exerciseType,
    skillTags,
    imageUrl,
    audioUrl,
    textOptions,
    imageOptions,
    regions,
    newRegionShape,
    hasCorrectOption,
    addTextOption,
    editTextOption,
    toggleTextOption,
    removeTextOption,
    addImageOption,
    setImageOptionURL,
    editImageOptionCaption,
    toggleImageOption,
    removeImageOption,
    addRegion,
    moveRegion,
    resizeRegion,
    toggleRegion,
    removeRegion,
    setStimulusImageSize,
    addTag,
    removeTag,
    toCreateExerciseRequest,
  }
}
