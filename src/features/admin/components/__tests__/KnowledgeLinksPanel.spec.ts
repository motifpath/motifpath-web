import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import KnowledgeLinksPanel from '@/features/admin/components/KnowledgeLinksPanel.vue'
import type { components } from '@/api/generated/core-domain'

type KnowledgeNode = components['schemas']['KnowledgeNode']
type KnowledgeEdge = components['schemas']['KnowledgeEdge']

function node(node_id: string, kind: 'skill' | 'concept', name: string, parent_id: string | null = null): KnowledgeNode {
  return {
    node_id,
    kind,
    key: node_id,
    names: { en: name, pt_BR: name },
    descriptions: null,
    languages: ['en', 'pt_BR'],
    parent_id,
    instrument_ids: [],
  }
}

const nodes = [
  node('terms', 'concept', 'Technique terms'),
  node('bending', 'concept', 'Bending', 'terms'),
  node('pitch', 'concept', 'Pitch', 'terms'),
  node('lead', 'skill', 'Lead techniques'),
  node('bends', 'skill', 'Bends', 'lead'),
  node('unison', 'skill', 'Unison bends', 'bends'),
  node('vibrato', 'skill', 'Vibrato', 'lead'),
  node('slides', 'skill', 'Slides', 'lead'),
]
const byId = new Map(nodes.map((n) => [n.node_id, n]))

const edges: KnowledgeEdge[] = [
  { edge_id: 'e-applies', from_id: 'bends', to_id: 'bending', type: 'applies', level: null },
  { edge_id: 'e-requires', from_id: 'vibrato', to_id: 'bends', type: 'requires', level: 'fluent' },
]

async function mountPanel(
  nodeId: string,
  extra: Partial<{ edges: KnowledgeEdge[]; errors: { applies?: string; requires?: string }; busyEdgeIds: string[] }> = {},
) {
  const wrapper = mount(KnowledgeLinksPanel, {
    props: { node: byId.get(nodeId)!, nodes, edges, ...extra },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

function section(wrapper: Awaited<ReturnType<typeof mountPanel>>, name: string) {
  return wrapper.find(`[data-test="kmap-links-${name}"]`)
}

function linkNames(wrapper: Awaited<ReturnType<typeof mountPanel>>, name: string) {
  return section(wrapper, name)
    .findAll('[data-test="kmap-link-node"]')
    .map((link) => link.text())
}

describe('KnowledgeLinksPanel', () => {
  beforeEach(() => {
    GET.mockReset()
    GET.mockResolvedValue({ data: [], error: undefined, response: { status: 200 } })
    document.body.innerHTML = ''
  })

  it('lists what a skill applies and requires, and what requires it', async () => {
    const wrapper = await mountPanel('bends')

    expect(linkNames(wrapper, 'applies')).toEqual(['Bending'])
    expect(section(wrapper, 'applies').find('[data-test="kmap-link-remove"]').exists()).toBe(true)
    expect(linkNames(wrapper, 'requires')).toEqual([])
    expect(linkNames(wrapper, 'required-by')).toEqual(['Vibrato'])
    expect(section(wrapper, 'required-by').text()).toContain('Fluent')
    expect(section(wrapper, 'required-by').find('[data-test="kmap-link-remove"]').exists()).toBe(false)
    expect(section(wrapper, 'required-by').find('select').exists()).toBe(false)
    expect(section(wrapper, 'applied-by').exists()).toBe(false)
  })

  it('shows a concept the skills that apply it, read-only, and no Applies list', async () => {
    const wrapper = await mountPanel('bending')

    expect(linkNames(wrapper, 'applied-by')).toEqual(['Bends'])
    expect(section(wrapper, 'applied-by').find('[data-test="kmap-link-remove"]').exists()).toBe(false)
    expect(section(wrapper, 'applies').exists()).toBe(false)
  })

  it('selects a linked node when its name is clicked', async () => {
    const wrapper = await mountPanel('bends')

    await section(wrapper, 'required-by').get('[data-test="kmap-link-node"]').trigger('click')

    expect(wrapper.emitted('select')).toEqual([['vibrato']])
  })

  it('adds an applies link from a concept picker that marks what is already applied', async () => {
    const wrapper = await mountPanel('bends')

    await wrapper.get('[data-test="kmap-add-applies"]').trigger('click')
    const picker = wrapper.get('[data-test="kmap-node-picker"]')
    const rows = () => picker.findAll('[data-test="kmap-tree-select"]')
    await picker.get('[data-test="kmap-tree-toggle"][data-node-id="terms"]').trigger('click')

    const bending = rows().find((row) => row.attributes('data-node-id') === 'bending')!
    expect(bending.attributes('disabled')).toBeDefined()
    expect(bending.text()).toContain('Already linked')

    await rows().find((row) => row.attributes('data-node-id') === 'pitch')!.trigger('click')

    expect(wrapper.emitted('addEdge')).toEqual([[{ from_id: 'bends', to_id: 'pitch', type: 'applies' }]])
    expect(wrapper.find('[data-test="kmap-node-picker"]').exists()).toBe(false)
  })

  it('adds a requires link at Accurate, from either tree, never to the node itself', async () => {
    const wrapper = await mountPanel('unison')

    await wrapper.get('[data-test="kmap-add-requires"]').trigger('click')
    const picker = wrapper.get('[data-test="kmap-node-picker"]')
    await picker.get('[data-test="kmap-picker-tab-skill"]').trigger('click')
    await picker.get('[data-test="kmap-tree-search"]').setValue('unison')
    const self = picker.findAll('[data-test="kmap-tree-select"]').find((row) => row.attributes('data-node-id') === 'unison')!
    expect(self.attributes('disabled')).toBeDefined()

    await picker.get('[data-test="kmap-picker-tab-concept"]').trigger('click')
    await picker.get('[data-test="kmap-tree-search"]').setValue('bending')
    await picker.findAll('[data-test="kmap-tree-select"]').find((row) => row.attributes('data-node-id') === 'bending')!.trigger('click')

    expect(wrapper.emitted('addEdge')).toEqual([
      [{ from_id: 'unison', to_id: 'bending', type: 'requires', level: 'accurate' }],
    ])
  })

  it('saves a changed level at once', async () => {
    const wrapper = await mountPanel('vibrato')

    await section(wrapper, 'requires').get('[data-test="kmap-link-level"]').setValue('retained')

    expect(wrapper.emitted('changeLevel')).toEqual([['e-requires', 'retained']])
  })

  it('locks a link while a change to it is being saved', async () => {
    const wrapper = await mountPanel('vibrato', { busyEdgeIds: ['e-requires'] })

    const row = section(wrapper, 'requires').get('[data-test="kmap-link-row"]')
    expect(row.get('[data-test="kmap-link-level"]').attributes('disabled')).toBeDefined()
    expect(row.get('[data-test="kmap-link-remove"]').attributes('disabled')).toBeDefined()
    await row.get('[data-test="kmap-link-remove"]').trigger('click')
    expect(wrapper.emitted('removeEdge')).toBeUndefined()
  })

  it('removes a link', async () => {
    const wrapper = await mountPanel('bends')

    await section(wrapper, 'applies').get('[data-test="kmap-link-remove"]').trigger('click')

    expect(wrapper.emitted('removeEdge')).toEqual([['e-applies']])
  })

  it('explains a requires link that would close a loop, and adds nothing', async () => {
    const wrapper = await mountPanel('bends')

    await wrapper.get('[data-test="kmap-add-requires"]').trigger('click')
    const picker = wrapper.get('[data-test="kmap-node-picker"]')
    await picker.get('[data-test="kmap-picker-tab-skill"]').trigger('click')
    await picker.get('[data-test="kmap-tree-search"]').setValue('vibrato')
    await picker.findAll('[data-test="kmap-tree-select"]').find((row) => row.attributes('data-node-id') === 'vibrato')!.trigger('click')

    expect(wrapper.emitted('addEdge')).toBeUndefined()
    expect(section(wrapper, 'requires').get('[data-test="kmap-links-error"]').text()).toBe(
      'Vibrato already requires Bends — this link would close a loop.',
    )
  })

  it('names the nodes in between when the loop is longer', async () => {
    const longer: KnowledgeEdge[] = [
      { edge_id: 'e-1', from_id: 'vibrato', to_id: 'slides', type: 'requires', level: 'accurate' },
      { edge_id: 'e-2', from_id: 'slides', to_id: 'bends', type: 'requires', level: 'accurate' },
    ]
    const wrapper = await mountPanel('bends', { edges: longer })

    await wrapper.get('[data-test="kmap-add-requires"]').trigger('click')
    const picker = wrapper.get('[data-test="kmap-node-picker"]')
    await picker.get('[data-test="kmap-picker-tab-skill"]').trigger('click')
    await picker.get('[data-test="kmap-tree-search"]').setValue('vibrato')
    await picker.findAll('[data-test="kmap-tree-select"]').find((row) => row.attributes('data-node-id') === 'vibrato')!.trigger('click')

    expect(section(wrapper, 'requires').get('[data-test="kmap-links-error"]').text()).toBe(
      'Vibrato already requires Bends (through Slides) — this link would close a loop.',
    )
  })

  it("shows the server's reason for a refused link under its list", async () => {
    const wrapper = await mountPanel('bends', { errors: { applies: 'This link already exists' } })

    expect(section(wrapper, 'applies').get('[data-test="kmap-links-error"]').text()).toBe('This link already exists')
  })
})
