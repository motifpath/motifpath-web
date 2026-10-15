/**
 * How a drill names a major key and a numeral to a student. A key is named as musicians read it in
 * the student's language (G and D♭ in English; Sol and Ré♭ in Portuguese), while its value, as plans
 * and answers carry it, stays the catalog's spelling (G, Db).
 */
import type { MessageKey } from '@/i18n'

const KEY_MESSAGES: Record<string, MessageKey> = {
  C: 'musicKeys.C',
  Db: 'musicKeys.Db',
  D: 'musicKeys.D',
  Eb: 'musicKeys.Eb',
  E: 'musicKeys.E',
  F: 'musicKeys.F',
  'F#': 'musicKeys.Fsharp',
  G: 'musicKeys.G',
  Ab: 'musicKeys.Ab',
  A: 'musicKeys.A',
  Bb: 'musicKeys.Bb',
  B: 'musicKeys.B',
}

/** The message naming a major key; the plain C one for a key not in the catalog. */
export function musicKeyMessage(key: string): MessageKey {
  return KEY_MESSAGES[key] ?? 'musicKeys.C'
}

/** A numeral as written for a student: the diminished seventh degree is vii°. */
export function numeralLabel(numeral: string): string {
  return numeral === 'viio' ? 'vii°' : numeral
}
