import type { MessageKey } from '@/i18n'

/** How a felt question names each timed drill, by what the student did in it. */
const feltDrillKeys: Record<string, MessageKey> = {
  'fretboard_cell:name_the_note': 'feltQuestions.drills.nameTheNote',
  'fretboard_cell:find_the_note': 'feltQuestions.drills.findTheNote',
  'diagram_shape:name_the_shape': 'feltQuestions.drills.nameTheShape',
  'diagram_shape:find_the_degree': 'feltQuestions.drills.findTheDegree',
  'exercise:text_response': 'feltQuestions.drills.textResponse',
  'exercise:audio_recognition': 'feltQuestions.drills.audioRecognition',
  'exercise:image_recognition': 'feltQuestions.drills.imageRecognition',
  'exercise:image_choice': 'feltQuestions.drills.imageChoice',
  'exercise:audio_selection': 'feltQuestions.drills.audioSelection',
  'diatonic_chord:numeral_to_chord': 'feltQuestions.drills.numeralToChord',
  'diatonic_chord:chord_to_numeral': 'feltQuestions.drills.chordToNumeral',
  'chord_function:chord_to_function': 'feltQuestions.drills.chordToFunction',
  'chord_function:function_to_chord': 'feltQuestions.drills.functionToChord',
  'chart_progression:chart_to_numbers': 'feltQuestions.drills.chartToNumbers',
  'chart_progression:numbers_to_chart': 'feltQuestions.drills.numbersToChart',
}

/** The label of a drill template asked about; a plain one for a drill not named yet. */
export function feltDrillKey(template: string): MessageKey {
  return feltDrillKeys[template] ?? 'feltQuestions.drills.other'
}
