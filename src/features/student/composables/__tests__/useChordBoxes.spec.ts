import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useChordBoxes } from '@/features/student/composables/useChordBoxes'
import { clearEmbeddedDiagramCache } from '@/shared/composables/useEmbeddedDiagram'
import { drillGuitar, drillVoicings } from '@/shared/testUtils/drill'

const ok = <T>(data: T) => Promise.resolve({ data, error: undefined, response: { status: 200 } })
const fail = () => Promise.resolve({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

const AM = drillVoicings.Am.diagram.diagram_id
const C = drillVoicings.C.diagram.diagram_id

/** Serves the drill voicings' diagrams, each carrying its voicing, and the guitar they're on. */
function serve(options: { failing?: string[]; withoutVoicing?: string[] } = {}) {
  GET.mockImplementation((path: string, init?: { params?: { path?: { diagram_id?: string } } }) => {
    if (path === '/instruments') return ok([{ ...drillGuitar, instrument_id: drillVoicings.C.diagram.instrument_id }])
    const id = init?.params?.path?.diagram_id ?? ''
    const found = Object.values(drillVoicings).find(({ diagram }) => diagram.diagram_id === id)
    if (!found || options.failing?.includes(id)) return fail()
    return ok(options.withoutVoicing?.includes(id) ? found.diagram : { ...found.diagram, chord_voicing: found.voicing })
  })
}

function setUp(diagramIds: string[]) {
  const ids = ref(diagramIds)
  let boxes: ReturnType<typeof useChordBoxes> | undefined
  mount(
    defineComponent({
      setup() {
        boxes = useChordBoxes(() => ids.value)
        return () => h('div')
      },
    }),
  )
  return { ...boxes!, ids }
}

describe('useChordBoxes', () => {
  beforeEach(() => {
    clearEmbeddedDiagramCache()
    GET.mockReset()
  })

  it('loads each chord’s voicing, in order, and the instrument it is drawn on', async () => {
    serve()
    const { status, boxes, instrument } = setUp([AM, C])

    expect(status.value).toBe('loading')
    await flushPromises()

    expect(status.value).toBe('ready')
    expect(boxes.value.map((box) => box.voicing.chord_voicing_id)).toEqual([drillVoicings.Am.voicing.chord_voicing_id, drillVoicings.C.voicing.chord_voicing_id])
    expect(boxes.value[0]!.diagram.diagram_id).toBe(AM)
    expect(instrument.value?.instrument_id).toBe(drillVoicings.C.diagram.instrument_id)
  })

  it('is unavailable when a diagram fails to load', async () => {
    serve({ failing: [C] })
    const { status, boxes } = setUp([AM, C])
    await flushPromises()

    expect(status.value).toBe('unavailable')
    expect(boxes.value).toEqual([])
  })

  it('is unavailable when a diagram has no voicing to draw as a box', async () => {
    serve({ withoutVoicing: [AM] })
    const { status } = setUp([AM])
    await flushPromises()

    expect(status.value).toBe('unavailable')
  })

  it('loads again when the chords change', async () => {
    serve()
    const { status, boxes, ids } = setUp([AM])
    await flushPromises()

    ids.value = [C]
    await flushPromises()

    expect(status.value).toBe('ready')
    expect(boxes.value.map((box) => box.diagram.diagram_id)).toEqual([C])
  })

  it('loads nothing, and is unavailable, with no chords', async () => {
    serve()
    const { status } = setUp([])
    await flushPromises()

    expect(status.value).toBe('unavailable')
    expect(GET).not.toHaveBeenCalled()
  })
})
