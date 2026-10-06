import type { MessageKey } from '@/i18n'

/** How a felt question names each timed drill, by what the student did in it. */
const feltDrillKeys: Record<string, MessageKey> = {
  'fretboard_cell:name_the_note': 'feltQuestions.drills.nameTheNote',
  'fretboard_cell:find_the_note': 'feltQuestions.drills.findTheNote',
  'exercise:text_response': 'feltQuestions.drills.textResponse',
  'exercise:audio_recognition': 'feltQuestions.drills.audioRecognition',
  'exercise:image_recognition': 'feltQuestions.drills.imageRecognition',
  'exercise:image_choice': 'feltQuestions.drills.imageChoice',
  'exercise:audio_selection': 'feltQuestions.drills.audioSelection',
}

/** The label of a drill template asked about; a plain one for a drill not named yet. */
export function feltDrillKey(template: string): MessageKey {
  return feltDrillKeys[template] ?? 'feltQuestions.drills.other'
}
