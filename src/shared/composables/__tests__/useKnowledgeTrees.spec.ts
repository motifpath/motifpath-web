import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import { i18n } from '@/i18n'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useKnowledgeTrees } from '@/shared/composables/useKnowledgeTrees'

function node(node_id: string, kind: 'skill' | 'concept', en: string, pt_BR: string) {
  return {
    node_id,
    kind,
    key: node_id,
    names: { en, pt_BR },
    descriptions: null,
    languages: ['en', 'pt_BR'],
    parent_id: null,
    instrument_ids: [],
  }
}

const skills = [
  node('skill-1', 'skill', 'Bends', 'Puxadas'),
  node('skill-2', 'skill', 'Slides', 'Ligados'),
]
const concepts = [
  node('concept-1', 'concept', 'Pitch', 'Altura'),
  node('concept-2', 'concept', 'Scales', 'Escalas'),
]
const applies = [
  { edge_id: 'e-1', from_id: 'skill-1', to_id: 'concept-1', type: 'applies', level: null },
]

function respond() {
  GET.mockImplementation((path: string, init: { params: { query: Record<string, string> } }) => {
    const query = init.params.query
    if (path === '/knowledge-nodes')
      return Promise.resolve({ data: query.kind === 'skill' ? skills : concepts })
    if (path === '/knowledge-edges' && query.type === 'applies')
      return Promise.resolve({ data: applies })
    return Promise.resolve({ error: { message: 'unexpected' } })
  })
}

describe('useKnowledgeTrees', () => {
  afterEach(() => {
    i18n.global.locale.value = 'en'
    GET.mockReset()
  })

  it('loads both trees, named in the UI locale, and follows a locale switch', async () => {
    respond()
    const trees = useKnowledgeTrees({ skillIds: ref([]), conceptIds: ref([]) })
    await vi.waitFor(() =>
      expect(trees.skillsLoading.value || trees.conceptsLoading.value).toBe(false),
    )

    expect(trees.skillNodes.value.map((n) => n.name)).toEqual(['Bends', 'Slides'])
    expect(trees.conceptNodes.value.map((n) => n.name)).toEqual(['Pitch', 'Scales'])

    i18n.global.locale.value = 'pt-BR'
    await nextTick()

    expect(trees.skillNodes.value.map((n) => n.name)).toEqual(['Puxadas', 'Ligados'])
  })

  it('suggests the concepts the picked skills apply, and the skills that apply the picked concepts', async () => {
    respond()
    const skillIds = ref<string[]>([])
    const conceptIds = ref<string[]>([])
    const trees = useKnowledgeTrees({ skillIds, conceptIds })
    await vi.waitFor(() => expect(GET).toHaveBeenCalledTimes(3))
    await vi.waitFor(() => expect(trees.skillNodes.value).toHaveLength(2))

    expect(trees.suggestedConceptIds.value).toEqual([])

    skillIds.value = ['skill-1']
    conceptIds.value = ['concept-1']
    await nextTick()

    expect(trees.suggestedConceptIds.value).toEqual(['concept-1'])
    expect(trees.suggestedSkillIds.value).toEqual(['skill-1'])
  })

  it('names a node by id in the UI locale, or an empty string for an unknown id', async () => {
    respond()
    const trees = useKnowledgeTrees()
    await vi.waitFor(() => expect(trees.conceptNodes.value).toHaveLength(2))

    expect(trees.nodeName('concept-2')).toBe('Scales')
    expect(trees.nodeName('nope')).toBe('')
  })

  it('loads no applies edges when no picks are given to suggest from', async () => {
    respond()
    useKnowledgeTrees()
    await vi.waitFor(() => expect(GET).toHaveBeenCalledTimes(2))

    expect(GET).not.toHaveBeenCalledWith('/knowledge-edges', expect.anything())
  })
})
