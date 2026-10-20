import { describe, expect, it } from 'vitest'

import { pickLocalizedName } from '@/shared/utils/localizedName'

describe('pickLocalizedName', () => {
  const names = { en: 'Guitar', pt_BR: 'Violão' }

  it("shows the name in the viewer's language", () => {
    expect(pickLocalizedName(names, 'pt_BR')).toBe('Violão')
    expect(pickLocalizedName(names, 'en')).toBe('Guitar')
  })

  it('falls back to English when there is no name in that language', () => {
    expect(pickLocalizedName({ en: 'Guitar' }, 'pt_BR')).toBe('Guitar')
  })

  it('falls back to the alphabetically first language when there is no English name either', () => {
    expect(pickLocalizedName({ pt_BR: 'Violão', es: 'Guitarra' }, 'fr')).toBe('Guitarra')
  })

  it('is empty only when there are no names at all', () => {
    expect(pickLocalizedName({}, 'en')).toBe('')
  })
})
