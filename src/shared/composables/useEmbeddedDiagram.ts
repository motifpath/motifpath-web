import { ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import { fetchInstruments } from '@/shared/composables/useListInstruments'
import type { DiagramEmbed } from '@/shared/utils/diagramEmbed'
import { flattenDiagramStack, stackLayerFromDiagram } from '@/shared/utils/flattenDiagramStack'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']
type Instrument = components['schemas']['Instrument']
type CoreApi = ReturnType<typeof useApi>['coreApi']

export type EmbeddedDiagramStatus = 'loading' | 'ready' | 'unavailable'
export type EmbeddedLabelMode = Diagram['label_display']

// A video cue mounts again every time playback enters its window, so a
// diagram is fetched once per page load rather than once per showing. A
// failed load is forgotten, so the next showing tries again.
const diagramCache = new Map<string, Promise<Diagram | null>>()

/** Forgets every cached diagram. For tests. */
export function clearEmbeddedDiagramCache() {
  diagramCache.clear()
}

function fetchDiagram(coreApi: CoreApi, diagramId: string): Promise<Diagram | null> {
  const cached = diagramCache.get(diagramId)
  if (cached) return cached

  const pending = coreApi
    .GET('/diagrams/{diagram_id}', { params: { path: { diagram_id: diagramId } } })
    .then((result) => (result.error || !result.data ? null : result.data))
    .catch(() => null)
    .then((diagram) => {
      if (!diagram) diagramCache.delete(diagramId)
      return diagram
    })
  diagramCache.set(diagramId, pending)
  return pending
}

function withinSubset(diagram: Diagram, diagramRef: DiagramRef): Diagram {
  const subset = diagramRef.layers.subset
  return subset ? { ...diagram, positions: diagram.positions.filter((p) => subset.includes(p.interval)) } : diagram
}

/**
 * Composites a stack into one diagram the fretboard viewer can draw: the
 * first diagram is the base, and every layer (filtered by its own ref's
 * subset) is flattened onto it. Positions and regions get fresh ids, since
 * the viewer keys on them and flattening drops the originals.
 */
function compositeStack(diagrams: Diagram[], stack: DiagramRef[]): { diagram: Diagram; diagramRef: DiagramRef } {
  const base = diagrams[0]!
  const layers = diagrams.map((d, i) => stackLayerFromDiagram(withinSubset(d, stack[i]!)))
  const flat = flattenDiagramStack(layers, { languages: base.languages, regionPerLayer: false })
  const first = stack[0]!

  return {
    diagram: {
      ...base,
      positions: flat.positions.map((p, i) => ({ ...p, position_id: `stack-position-${i}` })),
      regions: flat.regions.map((r, i) => ({ ...r, region_id: `stack-region-${i}` })),
    },
    diagramRef: { ...first, layers: { ...first.layers, subset: null } },
  }
}

/**
 * Loads what a student needs to see an embedded diagram: the diagram (or
 * every diagram of a stack) and its instrument. Anything a student can't be
 * shown — a failed load, an unknown instrument, or a keyboard diagram, which
 * has no student viewer yet — is `unavailable`, and the caller shows nothing.
 *
 * A changed embed loads again; one that is merely handed over anew with the
 * same content (a re-rendered cue or prompt) does not.
 */
export function useEmbeddedDiagram(source: MaybeRefOrGetter<DiagramEmbed>) {
  const { coreApi } = useApi()

  const status = ref<EmbeddedDiagramStatus>('loading')
  const diagram = ref<Diagram | null>(null)
  const instrument = ref<Instrument | null>(null)
  const diagramRef = ref<DiagramRef | null>(null)
  const labelMode = ref<EmbeddedLabelMode>('interval')

  let latest = 0

  async function load(embed: DiagramEmbed) {
    const attempt = ++latest
    status.value = 'loading'

    const refs = embed.kind === 'single' ? [embed.ref] : embed.stack
    const [diagrams, instruments] = await Promise.all([
      Promise.all(refs.map((r) => fetchDiagram(coreApi, r.diagram_id))),
      fetchInstruments(coreApi).catch(() => ({ data: undefined, error: true })),
    ])
    // A newer embed replaced this one while it loaded.
    if (attempt !== latest) return

    const loaded = diagrams.filter((d): d is Diagram => d !== null)
    const base = loaded[0]
    const found = base && instruments.data?.find((i) => i.instrument_id === base.instrument_id)
    if (loaded.length !== refs.length || !base || !found || found.family !== 'fretted') {
      diagram.value = null
      instrument.value = null
      diagramRef.value = null
      status.value = 'unavailable'
      return
    }

    const shown = embed.kind === 'single' ? { diagram: base, diagramRef: embed.ref } : compositeStack(loaded, embed.stack)
    diagram.value = shown.diagram
    diagramRef.value = shown.diagramRef
    instrument.value = found
    labelMode.value = base.label_display
    status.value = 'ready'
  }

  watch(
    () => JSON.stringify(toValue(source)),
    () => void load(toValue(source)),
    { immediate: true },
  )

  return { status, diagram, instrument, diagramRef, labelMode }
}
