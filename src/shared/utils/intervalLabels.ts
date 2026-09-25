import type { MessageKey } from '@/i18n'
import type { components } from '@/api/generated/core-domain'

export type IntervalCode = components['schemas']['DiagramPosition']['interval']

/**
 * The message key of each canonical interval code. Codes are storage values,
 * not display text — "#4" or "2" aren't safe message-path segments — so each
 * maps to a word key whose translation is the label a reader of that locale
 * expects (e.g. b3 → "b3" in English, "3m" in Brazilian Portuguese).
 */
const INTERVAL_LABEL_KEYS: Record<IntervalCode, MessageKey> = {
  R: 'intervals.root',
  b2: 'intervals.flat2',
  '2': 'intervals.natural2',
  '#2': 'intervals.sharp2',
  b3: 'intervals.flat3',
  '3': 'intervals.natural3',
  '4': 'intervals.natural4',
  '#4': 'intervals.sharp4',
  b5: 'intervals.flat5',
  '5': 'intervals.natural5',
  '#5': 'intervals.sharp5',
  b6: 'intervals.flat6',
  '6': 'intervals.natural6',
  bb7: 'intervals.doubleFlat7',
  b7: 'intervals.flat7',
  '7': 'intervals.natural7',
  b9: 'intervals.flat9',
  '9': 'intervals.natural9',
  '#9': 'intervals.sharp9',
  '11': 'intervals.natural11',
  '#11': 'intervals.sharp11',
  b13: 'intervals.flat13',
  '13': 'intervals.natural13',
}

/** Every canonical interval code, in the order the API lists them. */
export const INTERVAL_CODES = Object.keys(INTERVAL_LABEL_KEYS) as IntervalCode[]

/** The message key for `code`, or null when it isn't a canonical code. */
export function intervalLabelKey(code: string): MessageKey | null {
  return code in INTERVAL_LABEL_KEYS ? INTERVAL_LABEL_KEYS[code as IntervalCode] : null
}
