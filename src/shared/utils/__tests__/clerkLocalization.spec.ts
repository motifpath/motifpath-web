import { describe, expect, it } from 'vitest'

import { loadClerkLocalization } from '@/shared/utils/clerkLocalization'

describe('loadClerkLocalization', () => {
  it('resolves the pt-BR localization pack for the pt-BR locale', async () => {
    const localization = await loadClerkLocalization('pt-BR')

    expect(localization.locale).toBe('pt-BR')
  })

  it('resolves the en-US localization pack for the en locale', async () => {
    const localization = await loadClerkLocalization('en')

    expect(localization.locale).toBe('en-US')
  })
})
