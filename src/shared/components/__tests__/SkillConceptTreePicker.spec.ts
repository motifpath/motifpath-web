import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SkillConceptTreePicker from '@/shared/components/SkillConceptTreePicker.vue'

const nodes = [
  { id: 'root-1', name: 'chord-theory', parent_id: null },
  { id: 'child-1', name: 'major-triads', parent_id: 'root-1' },
  { id: 'root-2', name: 'rhythm', parent_id: null },
]

async function open(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('[data-test="tree-open-picker"]').trigger('click')
}

describe('SkillConceptTreePicker', () => {
  it('renders every node with its breadcrumb path once the picker is opened', async () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes, selectedIds: [] },
    })
    await open(wrapper)

    const rows = wrapper.findAll('[data-test="tree-node-row"]')
    expect(rows).toHaveLength(3)
    expect(wrapper.text()).toContain('chord-theory')
    expect(wrapper.text()).toContain('chord-theory > major-triads')
    expect(wrapper.text()).toContain('rhythm')
  })

  it('filters nodes by the search query', async () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes, selectedIds: [] },
    })
    await open(wrapper)

    await wrapper.get('[data-test="tree-search"]').setValue('major')

    const rows = wrapper.findAll('[data-test="tree-node-row"]')
    expect(rows).toHaveLength(1)
    expect(wrapper.text()).toContain('major-triads')
  })

  it('restricts the rendered nodes to allowedIds when given', async () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes, selectedIds: [], allowedIds: ['root-2'] },
    })
    await open(wrapper)

    const rows = wrapper.findAll('[data-test="tree-node-row"]')
    expect(rows).toHaveLength(1)
    expect(wrapper.text()).toContain('rhythm')
  })

  it('in multiple mode, toggling a checkbox adds and removes it from selectedIds', async () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes, selectedIds: ['root-1'] },
    })
    await open(wrapper)

    await wrapper.get('[data-test="tree-node-checkbox"][value="root-2"]').setValue(true)
    expect(wrapper.emitted('update:selectedIds')?.[0]).toEqual([['root-1', 'root-2']])

    await wrapper.setProps({ selectedIds: ['root-1'] })
    await wrapper.get('[data-test="tree-node-checkbox"][value="root-1"]').setValue(false)
    expect(wrapper.emitted('update:selectedIds')?.[1]).toEqual([[]])
  })

  it('in single mode, selecting a node replaces the selection and closes the picker', async () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes, selectedIds: ['root-1'], multiple: false },
    })
    await open(wrapper)

    await wrapper.get('[data-test="tree-node-radio"][value="child-1"]').setValue(true)
    expect(wrapper.emitted('update:selectedIds')).toEqual([[['child-1']]])
    expect(wrapper.find('[data-test="tree-search"]').exists()).toBe(false)
  })

  it('shows selected chips with a remove control in multiple mode', () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes, selectedIds: ['root-1', 'child-1'] },
    })

    const chips = wrapper.findAll('[data-test="tree-selected-chip"]')
    expect(chips).toHaveLength(2)
  })

  it('removing a leaf chip removes only that node, leaving its ancestor selected', async () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes, selectedIds: ['root-1', 'child-1'] },
    })

    const chips = wrapper.findAll('[data-test="tree-selected-chip"]')
    await chips[1].get('[data-test="tree-selected-chip-remove"]').trigger('click')
    expect(wrapper.emitted('update:selectedIds')?.[0]).toEqual([['root-1']])
  })

  it('removing an ancestor chip cascades to remove its descendants too', async () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes, selectedIds: ['root-1', 'child-1'] },
    })

    const chips = wrapper.findAll('[data-test="tree-selected-chip"]')
    await chips[0].get('[data-test="tree-selected-chip-remove"]').trigger('click')
    expect(wrapper.emitted('update:selectedIds')?.[0]).toEqual([[]])
  })

  it('selecting a child node in the tree also selects its ancestor chain', async () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes, selectedIds: [] },
    })
    await open(wrapper)

    await wrapper.get('[data-test="tree-node-checkbox"][value="child-1"]').setValue(true)
    expect(wrapper.emitted('update:selectedIds')?.[0]?.[0]).toEqual(expect.arrayContaining(['child-1', 'root-1']))
  })

  it('unchecking a node in the tree also removes its selected descendants', async () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes, selectedIds: ['root-1', 'child-1'] },
    })
    await open(wrapper)

    await wrapper.get('[data-test="tree-node-checkbox"][value="root-1"]').setValue(false)
    expect(wrapper.emitted('update:selectedIds')?.[0]).toEqual([[]])
  })

  it('shows a loading indicator while nodes are loading', async () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes: [], selectedIds: [], isLoading: true },
    })
    await open(wrapper)

    expect(wrapper.find('[data-test="tree-loading"]').exists()).toBe(true)
  })

  it('keeps the results panel a fixed height regardless of how many nodes match the search', async () => {
    const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes, selectedIds: [] } })
    await open(wrapper)

    const resultsBefore = wrapper.get('[data-test="tree-node-row"]').element.closest('.h-48')
    expect(resultsBefore).not.toBeNull()

    await wrapper.get('[data-test="tree-search"]').setValue('no-such-skill')
    const emptyMessage = wrapper.get('[data-test="tree-empty"]')
    expect(emptyMessage.element.closest('.h-48')).not.toBeNull()
  })

  it('is select-only: no create section, and the hint asks the team for a missing node', async () => {
    const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes, selectedIds: [], missingHint: true } })
    await open(wrapper)

    expect(wrapper.find('[data-test="tree-create-name"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="tree-missing-hint"]').text()).toBe('Missing one? Ask the team.')
  })

  it('shows no missing-node hint unless asked to', async () => {
    const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes, selectedIds: [] } })
    await open(wrapper)

    expect(wrapper.find('[data-test="tree-missing-hint"]').exists()).toBe(false)
  })

  it('says nothing matched when the search matches no node', async () => {
    const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes, selectedIds: [] } })
    await open(wrapper)
    await wrapper.get('[data-test="tree-search"]').setValue('zzz')

    expect(wrapper.get('[data-test="tree-empty"]').text()).toBe('No matching nodes.')
  })

  describe('search', () => {
    const graph = [
      { id: 'bends', name: 'Bends', parent_id: null, searchTerms: ['Bends', 'Puxadas', 'bends'] },
      { id: 'half', name: 'Half-step bend', parent_id: 'bends', searchTerms: ['Half-step bend', 'Bend de meio tom', 'half-step-bend'] },
      { id: 'vibrato', name: 'Vibrato', parent_id: null, searchTerms: ['Vibrato', 'vibrato-technique'] },
    ]

    it("finds a node by its name in another language", async () => {
      const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes: graph, selectedIds: [] } })
      await open(wrapper)
      await wrapper.get('[data-test="tree-search"]').setValue('meio tom')

      const rows = wrapper.findAll('[data-test="tree-node-row"]')
      expect(rows.map((r) => r.text())).toEqual(['Bends > Half-step bend'])
    })

    it('finds a node by its key', async () => {
      const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes: graph, selectedIds: [] } })
      await open(wrapper)
      await wrapper.get('[data-test="tree-search"]').setValue('vibrato-tech')

      expect(wrapper.findAll('[data-test="tree-node-row"]').map((r) => r.text())).toEqual(['Vibrato'])
    })

    it("finds a node's children by an ancestor's name in another language", async () => {
      const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes: graph, selectedIds: [] } })
      await open(wrapper)
      await wrapper.get('[data-test="tree-search"]').setValue('puxadas')

      expect(wrapper.findAll('[data-test="tree-node-row"]').map((r) => r.text())).toEqual([
        'Bends',
        'Bends > Half-step bend',
      ])
    })
  })

  describe("filtering by the content's instruments", () => {
    const scoped = [
      { id: 'reading', name: 'Reading tab', parent_id: null, instrumentIds: [] },
      { id: 'bends', name: 'Bends', parent_id: null, instrumentIds: ['electric'] },
      { id: 'slap', name: 'Slap', parent_id: null, instrumentIds: ['bass'] },
    ]

    it('lists only the nodes that suit the instruments', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes: scoped, selectedIds: [], instrumentIds: ['electric'] },
      })
      await open(wrapper)

      expect(wrapper.findAll('[data-test="tree-node-row"]').map((r) => r.text())).toEqual(['Bends', 'Reading tab'])
    })

    it('lists only nodes for every instrument when the content is for every instrument', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes: scoped, selectedIds: [], instrumentIds: [] },
      })
      await open(wrapper)

      expect(wrapper.findAll('[data-test="tree-node-row"]').map((r) => r.text())).toEqual(['Reading tab'])
    })

    it('lists every node when no instruments are given', async () => {
      const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes: scoped, selectedIds: [] } })
      await open(wrapper)

      expect(wrapper.findAll('[data-test="tree-node-row"]')).toHaveLength(3)
    })

    it('flags a picked node that no longer suits the instruments', () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes: scoped, selectedIds: ['slap', 'reading'], instrumentIds: ['electric'] },
      })

      const chips = wrapper.findAll('[data-test="tree-selected-chip"]')
      expect(chips[0]!.attributes('data-unsuited')).toBe('true')
      expect(chips[0]!.attributes('title')).toBe("Not for this content's instruments")
      expect(chips[1]!.attributes('data-unsuited')).toBeUndefined()
    })
  })

  describe('suggestions', () => {
    it('lists the suggested nodes first, under their own heading', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Concept', nodes, selectedIds: [], suggestedIds: ['root-2'] },
      })
      await open(wrapper)

      expect(wrapper.get('[data-test="tree-suggested-heading"]').text()).toBe('Suggested')
      expect(wrapper.findAll('[data-test="tree-suggested-row"]').map((r) => r.text())).toEqual(['rhythm'])
      expect(wrapper.findAll('[data-test="tree-node-row"]')).toHaveLength(3)
    })

    it('picks a suggested node like any other', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Concept', nodes, selectedIds: [], suggestedIds: ['child-1'] },
      })
      await open(wrapper)

      await wrapper.get('[data-test="tree-suggested-row"] input').setValue(true)
      expect(wrapper.emitted('update:selectedIds')?.[0]).toEqual([['child-1', 'root-1']])
    })

    it('hides the suggestions while searching', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Concept', nodes, selectedIds: [], suggestedIds: ['root-2'] },
      })
      await open(wrapper)
      await wrapper.get('[data-test="tree-search"]').setValue('rhy')

      expect(wrapper.find('[data-test="tree-suggested-heading"]').exists()).toBe(false)
    })

    it('leaves out a suggestion that does not suit the instruments', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: {
          label: 'Concept',
          nodes: [{ id: 'slap', name: 'Slap', parent_id: null, instrumentIds: ['bass'] }],
          selectedIds: [],
          suggestedIds: ['slap'],
          instrumentIds: ['electric'],
        },
      })
      await open(wrapper)

      expect(wrapper.find('[data-test="tree-suggested-heading"]').exists()).toBe(false)
    })
  })
})
