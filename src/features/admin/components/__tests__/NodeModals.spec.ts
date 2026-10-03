import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import DeleteNodeModal from '@/features/admin/components/DeleteNodeModal.vue'
import MoveNodeModal from '@/features/admin/components/MoveNodeModal.vue'
import type { components } from '@/api/generated/core-domain'

type KnowledgeNode = components['schemas']['KnowledgeNode']
type KnowledgeEdge = components['schemas']['KnowledgeEdge']

function node(node_id: string, name: string, parent_id: string | null, instrument_ids: string[] = []): KnowledgeNode {
  return {
    node_id,
    kind: 'skill',
    key: node_id,
    names: { en: name, pt_BR: name },
    descriptions: null,
    languages: ['en', 'pt_BR'],
    parent_id,
    instrument_ids,
  }
}

const guitars = ['i-electric', 'i-acoustic']
const nodes = [
  node('lead', 'Lead techniques', null, guitars),
  node('bends', 'Bends', 'lead', guitars),
  node('unison', 'Unison bends', 'bends', guitars),
  node('expressive', 'Expressive techniques', null),
  node('electric-only', 'Electric tricks', null, ['i-electric']),
  node('loose', 'Double-stop bends', 'expressive', guitars),
]
const byId = new Map(nodes.map((n) => [n.node_id, n]))
const edges: KnowledgeEdge[] = [
  { edge_id: 'e-1', from_id: 'bends', to_id: 'bending', type: 'applies', level: null },
  { edge_id: 'e-2', from_id: 'vibrato', to_id: 'bends', type: 'requires', level: 'fluent' },
]
const otherNodes = [
  { ...node('bending', 'Bending', null), kind: 'concept' as const },
  node('vibrato', 'Vibrato', 'lead', guitars),
]

function rowFor(wrapper: ReturnType<typeof mount>, id: string) {
  return wrapper.findAll('[data-test="kmap-tree-select"]').find((row) => row.attributes('data-node-id') === id)!
}

describe('MoveNodeModal', () => {
  beforeEach(() => {
    GET.mockReset()
    GET.mockResolvedValue({ data: [], error: undefined, response: { status: 200 } })
  })

  async function mountMove(nodeId = 'bends', error = '') {
    const wrapper = mount(MoveNodeModal, { props: { open: true, node: byId.get(nodeId)!, nodes, error } })
    await flushPromises()
    await wrapper.get('[data-test="kmap-tree-search"]').setValue('e')
    return wrapper
  }

  it('disables the node, its descendants, its current parent and narrower parents, each with a reason', async () => {
    const wrapper = await mountMove()

    expect(rowFor(wrapper, 'bends').attributes('disabled')).toBeDefined()
    expect(rowFor(wrapper, 'unison').attributes('disabled')).toBeDefined()
    expect(rowFor(wrapper, 'unison').text()).toContain('Inside the node you’re moving')
    expect(rowFor(wrapper, 'lead').text()).toContain('Already its parent')
    expect(rowFor(wrapper, 'electric-only').text()).toContain('Narrower than this node')
    expect(rowFor(wrapper, 'expressive').attributes('disabled')).toBeUndefined()
  })

  it('confirms with the subtree it moves, then emits the new parent', async () => {
    const wrapper = await mountMove()
    expect(wrapper.get('[data-test="kmap-move-confirm"]').attributes('disabled')).toBeDefined()

    await rowFor(wrapper, 'expressive').trigger('click')

    expect(wrapper.get('[data-test="kmap-move-summary"]').text()).toBe(
      'Move Bends and its 1 descendant under Expressive techniques?',
    )
    await wrapper.get('[data-test="kmap-move-confirm"]').trigger('click')
    expect(wrapper.emitted('confirm')).toEqual([['expressive']])
  })

  it('makes a node a root', async () => {
    const wrapper = await mountMove('unison')

    await wrapper.get('[data-test="kmap-move-root"]').trigger('click')

    expect(wrapper.get('[data-test="kmap-move-summary"]').text()).toBe('Make Unison bends a root?')
    await wrapper.get('[data-test="kmap-move-confirm"]').trigger('click')
    expect(wrapper.emitted('confirm')).toEqual([[null]])
  })

  it('does not offer making a root a root', async () => {
    const wrapper = await mountMove('lead')

    expect(wrapper.get('[data-test="kmap-move-root"]').attributes('disabled')).toBeDefined()
  })

  it("keeps the server's refusal in view", async () => {
    const wrapper = await mountMove('bends', 'A lesson uses it')

    expect(wrapper.get('[data-test="kmap-move-error"]').text()).toBe('A lesson uses it')
  })
})

describe('DeleteNodeModal', () => {
  function mountDelete(nodeId: string, error = '') {
    return mount(DeleteNodeModal, {
      props: { open: true, node: byId.get(nodeId)!, nodes: [...nodes, ...otherNodes], edges, error },
    })
  }

  it('names what blocks the delete and offers only Close', () => {
    const wrapper = mountDelete('bends')

    const blockers = wrapper.get('[data-test="kmap-delete-blockers"]').text()
    expect(blockers).toContain('Unison bends')
    expect(blockers).toContain('Bending')
    expect(blockers).toContain('Vibrato')
    expect(wrapper.find('[data-test="kmap-delete-confirm"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="kmap-delete-close"]').text()).toBe('Close')
  })

  it("asks before deleting an unused node, and shows the server's refusal", async () => {
    const wrapper = mountDelete('loose', 'An exercise is classified under this node')

    expect(wrapper.text()).toContain('Delete Double-stop bends? This can’t be undone.')
    expect(wrapper.get('[data-test="kmap-delete-error"]').text()).toBe('An exercise is classified under this node')
    await wrapper.get('[data-test="kmap-delete-confirm"]').trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })
})
