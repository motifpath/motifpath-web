import { describe, expect, it } from 'vitest'

import { languageName } from '@/features/student/utils/languageName'

describe('languageName', () => {
  it('names a language in the interface language', () => {
    expect(languageName('en', 'en')).toBe('English')
    expect(languageName('en', 'pt-BR')).toBe('inglês')
  })

  it('names the language, not the regional variant, so the sentence stays short', () => {
    expect(languageName('pt-BR', 'en')).toBe('Portuguese')
  })

  it('falls back to the given name when the code is not one the browser knows', () => {
    expect(languageName('zz-not-a-code!', 'en', 'Klingon')).toBe('Klingon')
  })
})
