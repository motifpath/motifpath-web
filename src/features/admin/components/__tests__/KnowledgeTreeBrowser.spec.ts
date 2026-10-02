import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import KnowledgeTreeBrowser from '@/features/admin/components/KnowledgeTreeBrowser.vue'
import type { TreeNode } from '@/shared/utils/skillConceptTree'

const instruments = [
  { instrument_id: 'i-electric', names: { en: 'Electric guitar' }, languages: ['en'] },
  { instrument_id: 'i-bass', names: { en: 'Electric bass' }, languages: ['en'] },
]

const nodes: TreeNode[] = [
  { id: 'lead', name: 'Lead techniques', parent_id: null, searchTerms: ['lead-techniques'], instrumentIds: ['i-electric'] },
  { id: 'bends', name: 'Bends', parent_id: 'lead', searchTerms: ['bends', 'Curvas'], instrumentIds: ['i-electric'] },
  { id: 'unison', name: 'Unison bends', parent_id: 'bends', searchTerms: ['unison-bends'], instrumentIds: ['i-electric'] },
  { id: 'rhythm', name: 'Rhythm', parent_id: null, searchTerms: ['rhythm'], instrumentIds: [] },
]

async function mountBrowser(props: Partial<{ selectedId: string | null; disabledReason: (id: string) => string | null }> = {}) {
  const wrapper = mount(KnowledgeTreeBrowser, { props: { label: 'Skills', nodes, selectedId: null, ...props } })
  await flushPromises()
  return wrapper
}

function rowNames(wrapper: Awaited<ReturnType<typeof mountBrowser>>) {
  return wrapper.findAll('[data-test="kmap-tree-select"]').map((row) => row.find('[data-test="kmap-tree-name"]').text())
}

describe('KnowledgeTreeBrowser', () => {
  beforeEach(() => {
    GET.mockReset()
    GET.mockResolvedValue({ data: instruments, error: undefined, response: { status: 200 } })
  })

  it('starts on the roots, sorted by name, and expands a node on request', async () => {
    const wrapper = await mountBrowser()
    expect(rowNames(wrapper)).toEqual(['Lead techniques', 'Rhythm'])

    await wrapper.get('[data-test="kmap-tree-toggle"][data-node-id="lead"]').trigger('click')

    expect(rowNames(wrapper)).toEqual(['Lead techniques', 'Bends', 'Rhythm'])
  })

  it('opens the path to the selected node and marks it selected', async () => {
    const wrapper = await mountBrowser({ selectedId: 'unison' })

    expect(rowNames(wrapper)).toEqual(['Lead techniques', 'Bends', 'Unison bends', 'Rhythm'])
    const selected = wrapper.findAll('[data-test="kmap-tree-row"]').filter((row) => row.attributes('aria-selected') === 'true')
    expect(selected.map((row) => row.text())).toEqual([expect.stringContaining('Unison bends')])
  })

  it('emits the node an admin picks', async () => {
    const wrapper = await mountBrowser()

    await wrapper.findAll('[data-test="kmap-tree-select"]')[1]!.trigger('click')

    expect(wrapper.emitted('select')).toEqual([['rhythm']])
  })

  it('searches names in any language, keys and ancestors', async () => {
    const wrapper = await mountBrowser()

    await wrapper.get('[data-test="kmap-tree-search"]').setValue('curvas')
    expect(rowNames(wrapper)).toEqual(['Lead techniques', 'Bends', 'Unison bends'])

    await wrapper.get('[data-test="kmap-tree-search"]').setValue('rhythm')
    expect(rowNames(wrapper)).toEqual(['Rhythm'])

    await wrapper.get('[data-test="kmap-tree-search"]').setValue('nothing like it')
    expect(wrapper.find('[data-test="kmap-tree-empty"]').exists()).toBe(true)
  })

  it('greys out nodes for other instruments but keeps them selectable', async () => {
    const wrapper = await mountBrowser()

    await wrapper.get('[data-test="tree-instrument-filter"]').setValue('i-bass')

    const lead = wrapper.findAll('[data-test="kmap-tree-select"]')[0]!
    const rhythm = wrapper.findAll('[data-test="kmap-tree-select"]')[1]!
    expect(lead.attributes('data-greyed')).toBe('true')
    expect(rhythm.attributes('data-greyed')).toBeUndefined()
    await lead.trigger('click')
    expect(wrapper.emitted('select')).toEqual([['lead']])
  })

  it('names the instruments of an instrument-specific node', async () => {
    const wrapper = await mountBrowser()

    const badges = wrapper.findAll('[data-test="kmap-tree-badge"]')
    expect(badges.map((badge) => badge.text())).toEqual(['Electric guitar'])
  })

  it('disables a node with a reason and never emits it', async () => {
    const wrapper = await mountBrowser({ disabledReason: (id) => (id === 'rhythm' ? 'Narrower than this node' : null) })

    const rhythm = wrapper.findAll('[data-test="kmap-tree-select"]')[1]!
    expect(rhythm.attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="kmap-tree-reason"]').text()).toBe('Narrower than this node')
    await rhythm.trigger('click')
    expect(wrapper.emitted('select')).toBeUndefined()
  })
})
