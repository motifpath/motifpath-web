import { describe, expect, it } from 'vitest'

import { fromApiLanguageCode, toApiLanguageCode } from '@/i18n'

describe('toApiLanguageCode', () => {
  it('maps the English UI locale to the API language code "en"', () => {
    expect(toApiLanguageCode('en')).toBe('en')
  })

  it('maps the pt-BR UI locale to the API language code "pt_BR"', () => {
    expect(toApiLanguageCode('pt-BR')).toBe('pt_BR')
  })
})

describe('fromApiLanguageCode', () => {
  it('maps the API language code "en" back to the English UI locale', () => {
    expect(fromApiLanguageCode('en')).toBe('en')
  })

  it('maps the API language code "pt_BR" back to the pt-BR UI locale', () => {
    expect(fromApiLanguageCode('pt_BR')).toBe('pt-BR')
  })

  it('falls back to English for an unrecognized API language code', () => {
    expect(fromApiLanguageCode('fr')).toBe('en')
  })
})
