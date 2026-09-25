import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import { i18n } from '@/i18n'
import { useIntervalLabel } from '@/shared/composables/useIntervalLabel'
import { INTERVAL_CODES, intervalLabelKey } from '@/shared/utils/intervalLabels'

describe('useIntervalLabel', () => {
  afterEach(() => {
    i18n.global.locale.value = 'en'
  })

  it('shows every canonical code as written in English', () => {
    const { intervalLabel } = useIntervalLabel()

    for (const code of INTERVAL_CODES) {
      expect(intervalLabel(code)).toBe(code)
    }
  })

  it('shows the traditional Brazilian names in Portuguese', async () => {
    const { intervalLabel } = useIntervalLabel()
    i18n.global.locale.value = 'pt-BR'
    await nextTick()

    expect(intervalLabel('R')).toBe('T')
    expect(intervalLabel('b3')).toBe('3m')
    expect(intervalLabel('3')).toBe('3M')
    expect(intervalLabel('4')).toBe('4J')
    expect(intervalLabel('#4')).toBe('4aum')
    expect(intervalLabel('b5')).toBe('5dim')
    expect(intervalLabel('5')).toBe('5J')
    expect(intervalLabel('bb7')).toBe('7dim')
    expect(intervalLabel('b7')).toBe('7m')
    expect(intervalLabel('13')).toBe('13M')
  })

  it('has a label for all 23 codes in every locale', async () => {
    const { intervalLabel } = useIntervalLabel()
    expect(INTERVAL_CODES).toHaveLength(23)
    for (const locale of ['en', 'pt-BR'] as const) {
      i18n.global.locale.value = locale
      await nextTick()
      for (const code of INTERVAL_CODES) {
        expect(intervalLabel(code), `${locale} ${code}`).not.toMatch(/^intervals\./)
      }
    }
  })

  it('shows an empty interval as empty, rather than a missing-key path', () => {
    expect(useIntervalLabel().intervalLabel('')).toBe('')
  })

  it("shows a value that isn't a canonical code as it is, even one named like a built-in object property", () => {
    const { intervalLabel } = useIntervalLabel()

    expect(intervalLabel('')).toBe('')
    expect(intervalLabelKey('constructor')).toBeNull()
    expect(intervalLabelKey('toString')).toBeNull()
    expect(intervalLabel('constructor')).toBe('constructor')
  })

  it('lists all 23 canonical codes, once each', () => {
    expect(INTERVAL_CODES).toHaveLength(23)
    expect(new Set(INTERVAL_CODES).size).toBe(23)
    expect(INTERVAL_CODES.every((code) => intervalLabelKey(code) !== null)).toBe(true)
  })
})
