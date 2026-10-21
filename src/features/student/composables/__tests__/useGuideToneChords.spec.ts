import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useGuideToneChords } from '@/features/student/composables/useGuideToneChords'
import { guideToneItem } from '@/features/student/testing/guideToneItems'
import { clearEmbeddedDiagramCache } from '@/shared/composables/useEmbeddedDiagram'
import { drillBass, drillGuitar, drillVoicings } from '@/shared/testUtils/drill'
import type { components } from '@/api/generated/core-domain'

type Item = components['schemas']['PracticeSessionItem']

const ok = <T>(data: T) => Promise.resolve({ data, error: undefined, response: { status: 200 } })
const fail = () => Promise.resolve({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

function serve(failing: string[] = []) {
  GET.mockImplementation((path: string, init?: { params?: { path?: { diagram_id?: string } } }) => {
    if (path === '/instruments') return ok([{ ...drillGuitar, instrument_id: drillVoicings.C.diagram.instrument_id }, drillBass])
    const id = init?.params?.path?.diagram_id
    const found = Object.values(drillVoicings).find(({ diagram }) => diagram.diagram_id === id)
    if (!found || failing.includes(id ?? '')) return fail()
    return ok({ ...found.diagram, chord_voicing: found.voicing })
  })
}

function loaded(item: Item) {
  let chords!: ReturnType<typeof useGuideToneChords>
  mount(
    defineComponent({
      setup() {
        chords = useGuideToneChords(() => item)
        return () => h('div')
      },
    }),
  )
  return chords
}

beforeEach(() => {
  GET.mockReset()
  clearEmbeddedDiagramCache()
})

describe('useGuideToneChords', () => {
  it('loads each chord’s voicing and the instrument they sound on, with no bass line on guitar', async () => {
    serve()
    const chords = loaded(guideToneItem())
    expect(chords.status.value).toBe('loading')
    await flushPromises()

    expect(chords.status.value).toBe('ready')
    expect(Object.keys(chords.diagrams.value).sort()).toEqual(['Am', 'D', 'G'])
    expect(chords.instrument.value?.instrument_id).toBe(drillVoicings.C.diagram.instrument_id)
    expect(chords.bass.value).toBeNull()
  })

  it('on a bass layout, plays each chord’s root under it in the bass’s voice', async () => {
    serve()
    const chords = loaded(guideToneItem({ onBass: true }))
    await flushPromises()

    expect(chords.status.value).toBe('ready')
    expect(chords.bass.value?.instrument.instrument_id).toBe(drillBass.instrument_id)
  })

  it('is unavailable when a chord’s voicing can’t be loaded, since the take couldn’t sound', async () => {
    serve([drillVoicings.D.diagram.diagram_id])
    const chords = loaded(guideToneItem())
    await flushPromises()

    expect(chords.status.value).toBe('unavailable')
  })
})
