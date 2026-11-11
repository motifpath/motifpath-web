/**
 * How a drill names a key and a numeral to a student. A key is named as musicians read it in the
 * student's language (G and D♭ in English; Sol and Ré♭ in Portuguese; a minor key as "A minor" and
 * "Lá menor"), while its value, as plans and answers carry it, stays the catalog's spelling (G, Db, Am).
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
  Cm: 'musicKeys.Cm',
  Dbm: 'musicKeys.Dbm',
  Dm: 'musicKeys.Dm',
  Ebm: 'musicKeys.Ebm',
  Em: 'musicKeys.Em',
  Fm: 'musicKeys.Fm',
  'F#m': 'musicKeys.Fsharpm',
  Gm: 'musicKeys.Gm',
  Abm: 'musicKeys.Abm',
  Am: 'musicKeys.Am',
  Bbm: 'musicKeys.Bbm',
  Bm: 'musicKeys.Bm',
}

/** The message naming a key, major or minor; the plain C one for a key not in the catalog. */
export function musicKeyMessage(key: string): MessageKey {
  return KEY_MESSAGES[key] ?? 'musicKeys.C'
}

/** A numeral as written for a student: the diminished seventh degree is vii°. */
export function numeralLabel(numeral: string): string {
  return numeral === 'viio' ? 'vii°' : numeral
}
