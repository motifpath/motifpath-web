import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { clearProgressionCatalog, useProgressionCatalog } from '@/shared/composables/useProgressionCatalog'

const ok = <T>(data: T) => Promise.resolve({ data, error: undefined, response: { status: 200 } })
const fail = () => Promise.resolve({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

const POP = { progression_id: 'p1', key: 'I-V-vi-IV', bars: ['I', 'V', 'vi', 'IV'], confusable: ['I-vi-IV-V'], names: { en: 'I–V–vi–IV (pop)' } }
const DOOWOP = { progression_id: 'p2', key: 'I-vi-IV-V', bars: ['I', 'vi', 'IV', 'V'], confusable: ['I-V-vi-IV'], names: { en: 'I–vi–IV–V (doo-wop)' } }

beforeEach(() => {
  GET.mockReset()
  clearProgressionCatalog()
})

describe('useProgressionCatalog', () => {
  it('loads the catalog as the grader reads it: each progression key with its bars', async () => {
    GET.mockImplementation(() => ok([POP, DOOWOP]))

    const catalog = await useProgressionCatalog().load()

    expect(GET).toHaveBeenCalledWith('/progressions')
    expect(catalog).toEqual({ 'I-V-vi-IV': { bars: ['I', 'V', 'vi', 'IV'] }, 'I-vi-IV-V': { bars: ['I', 'vi', 'IV', 'V'] } })
  })

  it('asks for it once per page load, however many questions need it', async () => {
    GET.mockImplementation(() => ok([POP]))

    await Promise.all([useProgressionCatalog().load(), useProgressionCatalog().load()])
    await useProgressionCatalog().load()

    expect(GET).toHaveBeenCalledTimes(1)
  })

  it('is null when it can not be loaded, and asks again next time', async () => {
    GET.mockImplementationOnce(() => fail()).mockImplementationOnce(() => ok([POP]))

    expect(await useProgressionCatalog().load()).toBeNull()
    expect(await useProgressionCatalog().load()).toEqual({ 'I-V-vi-IV': { bars: ['I', 'V', 'vi', 'IV'] } })
  })
})
