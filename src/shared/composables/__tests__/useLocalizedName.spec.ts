import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import { i18n } from '@/i18n'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'

describe('useLocalizedName', () => {
  afterEach(() => {
    i18n.global.locale.value = 'en'
  })

  it('picks the name for the current UI locale, and follows a locale switch', async () => {
    const { localizedName } = useLocalizedName()
    const names = { en: 'Guitar', pt_BR: 'Violão' }

    expect(localizedName(names)).toBe('Guitar')

    i18n.global.locale.value = 'pt-BR'
    await nextTick()

    expect(localizedName(names)).toBe('Violão')
  })
})
