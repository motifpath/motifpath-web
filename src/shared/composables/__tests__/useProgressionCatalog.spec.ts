import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { clearProgressionCatalog, useProgressionCatalog } from '@/shared/composables/useProgressionCatalog'

const ok = <T>(data: T) => Promise.resolve({ data, error: undefined, response: { status: 200 } })
const fail = () => Promise.resolve({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

const POP = { progression_id: 'p1', key: 'I-V-vi-IV', bars: ['I', 'V', 'vi', 'IV'], in_drills: true, confusable: ['I-vi-IV-V'], names: { en: 'I–V–vi–IV (pop)' } }
const CHART_ONLY = { progression_id: 'p3', key: 'major/I-bVII-IV-I', bars: ['I', '♭VII', 'IV', 'I'], in_drills: false, confusable: [], names: { en: 'I–♭VII–IV–I' } }
const DOOWOP = { progression_id: 'p2', key: 'I-vi-IV-V', bars: ['I', 'vi', 'IV', 'V'], in_drills: true, confusable: ['I-V-vi-IV'], names: { en: 'I–vi–IV–V (doo-wop)' } }

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

  it('grades only against progressions in the drills, while the whole list keeps the chart-only ones', async () => {
    GET.mockImplementation(() => ok([POP, CHART_ONLY]))

    const catalog = await useProgressionCatalog().load()
    const progressions = await useProgressionCatalog().progressions()

    expect(catalog).toEqual({ 'I-V-vi-IV': { bars: ['I', 'V', 'vi', 'IV'] } })
    expect(progressions).toEqual([POP, CHART_ONLY])
  })

  it('asks for it once per page load, however many questions need it', async () => {
    GET.mockImplementation(() => ok([POP]))

    await Promise.all([useProgressionCatalog().load(), useProgressionCatalog().load()])
    await useProgressionCatalog().load()

    expect(GET).toHaveBeenCalledTimes(1)
  })

  it('gives the whole catalog, names included, from the same one request', async () => {
    GET.mockImplementation(() => ok([POP, DOOWOP]))

    const [progressions] = await Promise.all([useProgressionCatalog().progressions(), useProgressionCatalog().load()])

    expect(progressions).toEqual([POP, DOOWOP])
    expect(GET).toHaveBeenCalledTimes(1)
  })

  it('is null when it can not be loaded, and asks again next time', async () => {
    GET.mockImplementationOnce(() => fail()).mockImplementationOnce(() => ok([POP]))

    expect(await useProgressionCatalog().load()).toBeNull()
    expect(await useProgressionCatalog().load()).toEqual({ 'I-V-vi-IV': { bars: ['I', 'V', 'vi', 'IV'] } })
  })
})
