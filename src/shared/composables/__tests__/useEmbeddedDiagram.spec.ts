import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, watch } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { clearEmbeddedDiagramCache, useEmbeddedDiagram } from '@/shared/composables/useEmbeddedDiagram'
import { makeDiagramRef, makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'
import type { DiagramEmbed } from '@/shared/utils/diagramEmbed'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']

const ok = <T>(data: T) => Promise.resolve({ data, error: undefined, response: { status: 200 } })
const fail = (status = 500) =>
  Promise.resolve({ data: undefined, error: { message: 'boom' }, response: { status } })

function serve(diagrams: Diagram[], instruments: Instrument[] = [makeFrettedInstrument()]) {
  GET.mockImplementation((path: string, init?: { params?: { path?: { diagram_id?: string } } }) => {
    if (path === '/instruments') return ok(instruments)
    const id = init?.params?.path?.diagram_id
    const diagram = diagrams.find((d) => d.diagram_id === id)
    return diagram ? ok(diagram) : fail(404)
  })
}

const pentatonic = makeFrettedDiagram()
const secondBox = makeFrettedDiagram({
  diagram_id: 'diagram-2',
  names: { en: 'Box 2' },
  languages: ['en'],
  label_display: 'note',
  positions: [
    { position_id: 'q0', string: 6, fret: 8, interval: 'b3', note_name: 'C', shape: 'dot' },
    { position_id: 'q1', string: 6, fret: 10, interval: '4', note_name: 'D', shape: 'dot' },
    { position_id: 'q2', string: 5, fret: 7, interval: '5', note_name: 'E', shape: 'dot' },
  ],
})

beforeEach(() => {
  GET.mockReset()
  clearEmbeddedDiagramCache()
})

describe('useEmbeddedDiagram', () => {
  describe('a single diagram_ref', () => {
    it('is loading, then ready with the diagram, its instrument and the ref', async () => {
      serve([pentatonic])
      const ref = makeDiagramRef({ styling: { root_color: '#ff0000', interval_color: null } })

      const view = useEmbeddedDiagram({ kind: 'single', ref })
      expect(view.status.value).toBe('loading')
      await vi.waitFor(() => expect(view.status.value).toBe('ready'))

      expect(GET).toHaveBeenCalledWith('/diagrams/{diagram_id}', {
        params: { path: { diagram_id: pentatonic.diagram_id } },
      })
      expect(view.diagram.value).toEqual(pentatonic)
      expect(view.instrument.value?.instrument_id).toBe('instrument-guitar')
      expect(view.diagramRef.value).toEqual(ref)
    })

    it.each(['interval', 'note', 'hidden'] as const)(
      "shows labels the way the diagram's author chose (%s)",
      async (labelDisplay) => {
        serve([{ ...pentatonic, label_display: labelDisplay }])

        const view = useEmbeddedDiagram({ kind: 'single', ref: makeDiagramRef() })
        await vi.waitFor(() => expect(view.status.value).toBe('ready'))

        expect(view.labelMode.value).toBe(labelDisplay)
      },
    )

    it('is unavailable when the diagram cannot be loaded', async () => {
      serve([])

      const view = useEmbeddedDiagram({ kind: 'single', ref: makeDiagramRef() })

      await vi.waitFor(() => expect(view.status.value).toBe('unavailable'))
      expect(view.diagram.value).toBeNull()
    })

    it('is unavailable when the instruments cannot be loaded', async () => {
      GET.mockImplementation((path: string) => (path === '/instruments' ? fail() : ok(pentatonic)))

      const view = useEmbeddedDiagram({ kind: 'single', ref: makeDiagramRef() })

      await vi.waitFor(() => expect(view.status.value).toBe('unavailable'))
    })

    it("is unavailable when the diagram's instrument is unknown", async () => {
      serve([pentatonic], [makeFrettedInstrument({ instrument_id: 'another-instrument' })])

      const view = useEmbeddedDiagram({ kind: 'single', ref: makeDiagramRef() })

      await vi.waitFor(() => expect(view.status.value).toBe('unavailable'))
    })

    it('is unavailable for a keyboard diagram, which students cannot see yet', async () => {
      const piano: Instrument = {
        instrument_id: 'instrument-guitar',
        names: { en: 'Piano' },
        languages: ['en'],
        family: 'keyboard',
        icon: 'piano',
        key_range: { lowest: 'A0', highest: 'C8' },
        default_voice_id: 'piano',
      }
      serve([pentatonic], [piano])

      const view = useEmbeddedDiagram({ kind: 'single', ref: makeDiagramRef() })

      await vi.waitFor(() => expect(view.status.value).toBe('unavailable'))
    })

    it('loads a diagram only once while it is shown again and again', async () => {
      serve([pentatonic])

      const first = useEmbeddedDiagram({ kind: 'single', ref: makeDiagramRef() })
      await vi.waitFor(() => expect(first.status.value).toBe('ready'))
      const again = useEmbeddedDiagram({ kind: 'single', ref: makeDiagramRef() })
      await vi.waitFor(() => expect(again.status.value).toBe('ready'))

      const diagramCalls = GET.mock.calls.filter(([path]) => path === '/diagrams/{diagram_id}')
      expect(diagramCalls).toHaveLength(1)
    })

    it('tries a diagram again after a failed load', async () => {
      serve([])
      const first = useEmbeddedDiagram({ kind: 'single', ref: makeDiagramRef() })
      await vi.waitFor(() => expect(first.status.value).toBe('unavailable'))

      serve([pentatonic])
      const again = useEmbeddedDiagram({ kind: 'single', ref: makeDiagramRef() })

      await vi.waitFor(() => expect(again.status.value).toBe('ready'))
    })
  })

  describe('a diagram_stack_ref', () => {
    const stack = [
      makeDiagramRef({ styling: { root_color: '#00ff00', interval_color: null } }),
      makeDiagramRef({ diagram_id: 'diagram-2', layers: { intervals: false } }),
    ]

    it("composites every layer's positions onto the first diagram", async () => {
      serve([pentatonic, secondBox])

      const view = useEmbeddedDiagram({ kind: 'stack', stack })
      await vi.waitFor(() => expect(view.status.value).toBe('ready'))

      const places = view.diagram.value?.positions.map((p) => `${p.string}:${p.fret}`)
      // 6:8 and 5:7 are in both boxes: the later layer covers them once.
      expect(places).toHaveLength(pentatonic.positions.length + secondBox.positions.length - 2)
      expect(places).toEqual(expect.arrayContaining(['6:5', '6:8', '6:10', '5:5', '5:7', '4:5', '4:7']))
      expect(view.diagram.value?.diagram_id).toBe(pentatonic.diagram_id)
      expect(view.diagram.value?.names).toEqual(pentatonic.names)
    })

    it('gives every composited position and region its own id', async () => {
      const withRegion = {
        ...secondBox,
        regions: [{ region_id: 'r', fret_start: 7, fret_end: 10, color: '#123456', description: { en: 'Box 2' } }],
      }
      serve([{ ...pentatonic, regions: [{ ...withRegion.regions[0], region_id: 'r0' }] }, withRegion])

      const view = useEmbeddedDiagram({ kind: 'stack', stack })
      await vi.waitFor(() => expect(view.status.value).toBe('ready'))

      const positionIds = view.diagram.value?.positions.map((p) => p.position_id) ?? []
      const regionIds = view.diagram.value?.regions?.map((r) => r.region_id) ?? []
      expect(regionIds).toHaveLength(2)
      for (const ids of [positionIds, regionIds]) {
        expect(ids.every((id) => typeof id === 'string' && id !== '')).toBe(true)
        expect(new Set(ids).size).toBe(ids.length)
      }
    })

    it("applies each layer's own interval subset before compositing", async () => {
      serve([pentatonic, secondBox])
      const rootsOnly = [
        makeDiagramRef({ layers: { intervals: true, subset: ['R'] } }),
        makeDiagramRef({ diagram_id: 'diagram-2', layers: { intervals: true, subset: ['5'] } }),
      ]

      const view = useEmbeddedDiagram({ kind: 'stack', stack: rootsOnly })
      await vi.waitFor(() => expect(view.status.value).toBe('ready'))

      expect(view.diagram.value?.positions.map((p) => p.interval).sort()).toEqual(['5', 'R', 'R'])
      expect(view.diagramRef.value?.layers.subset ?? null).toBeNull()
    })

    it("renders with the first layer's settings and label choice", async () => {
      serve([pentatonic, secondBox])

      const view = useEmbeddedDiagram({ kind: 'stack', stack })
      await vi.waitFor(() => expect(view.status.value).toBe('ready'))

      expect(view.diagramRef.value?.layers.intervals).toBe(true)
      expect(view.diagramRef.value?.styling).toEqual(stack[0]!.styling)
      expect(view.labelMode.value).toBe('interval')
    })

    it('is unavailable when any layer cannot be loaded', async () => {
      serve([pentatonic])

      const view = useEmbeddedDiagram({ kind: 'stack', stack })

      await vi.waitFor(() => expect(view.status.value).toBe('unavailable'))
    })
  })

  describe('an embed that changes', () => {
    it('loads the new diagram in its place', async () => {
      serve([pentatonic, secondBox])
      const embed = ref<DiagramEmbed>({ kind: 'single', ref: makeDiagramRef() })

      const view = useEmbeddedDiagram(embed)
      await vi.waitFor(() => expect(view.diagram.value?.diagram_id).toBe(pentatonic.diagram_id))
      const seen: string[] = []
      watch(view.status, (status) => seen.push(status), { flush: 'sync' })
      embed.value = { kind: 'single', ref: makeDiagramRef({ diagram_id: 'diagram-2' }) }

      await vi.waitFor(() => expect(seen).toEqual(['loading', 'ready']))
      expect(view.diagram.value?.diagram_id).toBe('diagram-2')
      expect(view.labelMode.value).toBe('note')
    })

    it('keeps the newest diagram when an older one arrives late', async () => {
      let releaseFirst: (value: unknown) => void = () => {}
      GET.mockImplementation((path: string, init?: { params?: { path?: { diagram_id?: string } } }) => {
        if (path === '/instruments') return ok([makeFrettedInstrument()])
        if (init?.params?.path?.diagram_id === pentatonic.diagram_id) {
          return new Promise((resolve) => {
            releaseFirst = () => resolve({ data: pentatonic, error: undefined, response: { status: 200 } })
          })
        }
        return ok(secondBox)
      })
      const embed = ref<DiagramEmbed>({ kind: 'single', ref: makeDiagramRef() })

      const view = useEmbeddedDiagram(embed)
      embed.value = { kind: 'single', ref: makeDiagramRef({ diagram_id: 'diagram-2' }) }
      await vi.waitFor(() => expect(view.status.value).toBe('ready'))
      releaseFirst(undefined)
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(view.diagram.value?.diagram_id).toBe('diagram-2')
    })

    it('does not load again when the same embed is handed over anew', async () => {
      serve([pentatonic])
      const embed = ref<DiagramEmbed>({ kind: 'single', ref: makeDiagramRef() })

      const view = useEmbeddedDiagram(embed)
      await vi.waitFor(() => expect(view.status.value).toBe('ready'))
      const seen: string[] = []
      watch(view.status, (status) => seen.push(status), { flush: 'sync' })
      embed.value = { kind: 'single', ref: makeDiagramRef() }
      await new Promise((resolve) => setTimeout(resolve, 0))

      // No flash of the loading placeholder.
      expect(seen).toEqual([])
    })
  })
})
