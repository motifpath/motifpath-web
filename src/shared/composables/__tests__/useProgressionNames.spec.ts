import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { i18n } from '@/i18n'
import { clearProgressionCatalog } from '@/shared/composables/useProgressionCatalog'
import { useProgressionNames } from '@/shared/composables/useProgressionNames'

const ok = <T>(data: T) => Promise.resolve({ data, error: undefined, response: { status: 200 } })
const fail = () => Promise.resolve({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

const DOOWOP = { progression_id: 'p2', key: 'I-vi-IV-V', bars: ['I', 'vi', 'IV', 'V'], confusable: [], names: { en: 'I–vi–IV–V (doo-wop)', pt_BR: 'I–vi–IV–V (anos 50)' } }

beforeEach(() => {
  GET.mockReset()
  clearProgressionCatalog()
})
afterEach(() => {
  i18n.global.locale.value = 'en'
})

describe('useProgressionNames', () => {
  it('names a progression in the current language once the catalog is in, following a language switch', async () => {
    GET.mockImplementation(() => ok([DOOWOP]))
    const { nameOf, progressions } = useProgressionNames()
    await flushPromises()

    expect(progressions.value).toEqual([DOOWOP])
    expect(nameOf('I-vi-IV-V')).toBe('I–vi–IV–V (doo-wop)')

    i18n.global.locale.value = 'pt-BR'
    await nextTick()

    expect(nameOf('I-vi-IV-V')).toBe('I–vi–IV–V (anos 50)')
  })

  it('falls back to the key until the catalog is in, and for a key it lacks', async () => {
    GET.mockImplementation(() => fail())
    const { nameOf, progressions } = useProgressionNames()
    await flushPromises()

    expect(progressions.value).toEqual([])
    expect(nameOf('I-vi-IV-V')).toBe('I-vi-IV-V')
  })
})
