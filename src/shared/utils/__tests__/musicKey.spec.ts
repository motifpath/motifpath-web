import { describe, expect, it } from 'vitest'

import { i18n } from '@/i18n'
import type { SupportedLocale } from '@/i18n'
import { musicKeyMessage, numeralLabel } from '@/shared/utils/musicKey'

const name = (locale: SupportedLocale, key: string) => i18n.global.t(musicKeyMessage(key), {}, { locale })

describe('musicKeyMessage', () => {
  it.each([
    ['C', 'C', 'Dó'],
    ['G', 'G', 'Sol'],
    ['Db', 'D♭', 'Ré♭'],
    ['F#', 'F♯', 'Fá♯'],
    ['Bb', 'B♭', 'Si♭'],
  ])('names the key of %s as a musician reads it', (key, en, pt) => {
    expect(name('en', key)).toBe(en)
    expect(name('pt-BR', key)).toBe(pt)
  })

  it.each([
    ['Am', 'A minor', 'Lá menor'],
    ['F#m', 'F♯ minor', 'Fá♯ menor'],
    ['Dbm', 'D♭ minor', 'Ré♭ menor'],
  ])('names the minor key %s by its tonic and mode', (key, en, pt) => {
    expect(name('en', key)).toBe(en)
    expect(name('pt-BR', key)).toBe(pt)
  })

  it('names every key a question can be asked in', () => {
    const majors = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
    for (const key of [...majors, ...majors.map((tonic) => `${tonic}m`)]) {
      expect(name('en', key)).not.toContain('musicKeys')
      expect(name('pt-BR', key)).not.toContain('musicKeys')
    }
  })
})

describe('numeralLabel', () => {
  it('writes the diminished seventh degree as vii°, and the others as they are', () => {
    expect(numeralLabel('viio')).toBe('vii°')
    expect(numeralLabel('vi')).toBe('vi')
    expect(numeralLabel('IV')).toBe('IV')
  })
})
