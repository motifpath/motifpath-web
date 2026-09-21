import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SkillConceptTreePicker from '@/features/teacher/components/SkillConceptTreePicker.vue'

const nodes = [
  { id: 'root-1', name: 'chord-theory', parent_id: null },
  { id: 'child-1', name: 'major-triads', parent_id: 'root-1' },
  { id: 'root-2', name: 'rhythm', parent_id: null },
]

async function open(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('[data-test="tree-open-picker"]').trigger('click')
}

describe('SkillConceptTreePicker', () => {
  it('labels the create-name field for the kind of node being added', async () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes, selectedIds: [] },
    })
    await open(wrapper)

    expect(wrapper.get('[data-test="tree-create-name"]').attributes('placeholder')).toBe('New skill name')
  })

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

  it('closes the parent-picker dropdown when clicking elsewhere in the modal', async () => {
    const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes, selectedIds: [] } })
    await open(wrapper)

    await wrapper.get('[data-test="tree-create-parent-search"]').trigger('focus')
    expect(wrapper.find('[data-test="tree-create-parent-options"]').exists()).toBe(true)

    await wrapper.get('[data-test="tree-create-name"]').trigger('click')
    expect(wrapper.find('[data-test="tree-create-parent-options"]').exists()).toBe(false)
  })

  it('emits create with the entered name and a parent chosen via the searchable parent field', async () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes, selectedIds: [] },
    })
    await open(wrapper)

    await wrapper.get('[data-test="tree-create-name"]').setValue('sweep-picking')
    await wrapper.get('[data-test="tree-create-parent-search"]').trigger('focus')
    await wrapper.get('[data-test="tree-create-parent-search"]').setValue('rhythm')
    await wrapper.get('[data-test="tree-create-parent-option"][data-node-id="root-2"]').trigger('click')
    await wrapper.get('[data-test="tree-create-submit"]').trigger('click')

    expect(wrapper.emitted('create')).toEqual([[{ name: 'sweep-picking', parentId: 'root-2' }]])
  })

  it('lets the chosen parent be cleared back to root', async () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes, selectedIds: [] },
    })
    await open(wrapper)

    await wrapper.get('[data-test="tree-create-parent-search"]').trigger('focus')
    await wrapper.get('[data-test="tree-create-parent-option"][data-node-id="root-2"]').trigger('click')
    expect(wrapper.find('[data-test="tree-create-parent-clear"]').exists()).toBe(true)

    await wrapper.get('[data-test="tree-create-parent-clear"]').trigger('click')
    expect(wrapper.find('[data-test="tree-create-parent-clear"]').exists()).toBe(false)

    await wrapper.get('[data-test="tree-create-name"]').setValue('new-root')
    await wrapper.get('[data-test="tree-create-submit"]').trigger('click')
    expect(wrapper.emitted('create')).toEqual([[{ name: 'new-root', parentId: null }]])
  })

  it('emits create with a null parent when no parent is chosen (root node)', async () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes, selectedIds: [] },
    })
    await open(wrapper)

    await wrapper.get('[data-test="tree-create-name"]').setValue('new-root')
    await wrapper.get('[data-test="tree-create-submit"]').trigger('click')

    expect(wrapper.emitted('create')).toEqual([[{ name: 'new-root', parentId: null }]])
  })

  it('does not emit create when the name is blank', async () => {
    const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes, selectedIds: [] } })
    await open(wrapper)

    await wrapper.get('[data-test="tree-create-submit"]').trigger('click')

    expect(wrapper.emitted('create')).toBeUndefined()
  })

  it('does not emit create for a name that already exists under the chosen parent (case/space-insensitive)', async () => {
    const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes, selectedIds: [] } })
    await open(wrapper)

    await wrapper.get('[data-test="tree-create-name"]').setValue('  CHORD-THEORY  ')
    await wrapper.get('[data-test="tree-create-submit"]').trigger('click')

    expect(wrapper.emitted('create')).toBeUndefined()
    expect(wrapper.find('[data-test="tree-create-duplicate"]').exists()).toBe(true)
  })

  it('allows a name that duplicates a sibling under a different parent', async () => {
    const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes, selectedIds: [] } })
    await open(wrapper)

    await wrapper.get('[data-test="tree-create-name"]').setValue('major-triads')
    await wrapper.get('[data-test="tree-create-parent-search"]').trigger('focus')
    await wrapper.get('[data-test="tree-create-parent-option"][data-node-id="root-2"]').trigger('click')
    await wrapper.get('[data-test="tree-create-submit"]').trigger('click')

    expect(wrapper.emitted('create')).toEqual([[{ name: 'major-triads', parentId: 'root-2' }]])
  })

  it('clears the duplicate warning once the name is edited', async () => {
    const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes, selectedIds: [] } })
    await open(wrapper)

    await wrapper.get('[data-test="tree-create-name"]').setValue('rhythm')
    await wrapper.get('[data-test="tree-create-submit"]').trigger('click')
    expect(wrapper.find('[data-test="tree-create-duplicate"]').exists()).toBe(true)

    await wrapper.get('[data-test="tree-create-name"]').setValue('a-new-root')
    expect(wrapper.find('[data-test="tree-create-duplicate"]').exists()).toBe(false)
  })

  it('filters the parent options by the parent search query', async () => {
    const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes, selectedIds: [] } })
    await open(wrapper)

    await wrapper.get('[data-test="tree-create-parent-search"]').trigger('focus')
    await wrapper.get('[data-test="tree-create-parent-search"]').setValue('rhythm')

    const options = wrapper.findAll('[data-test="tree-create-parent-option"]')
    expect(options).toHaveLength(1)
    expect(options[0].text()).toBe('rhythm')
  })

  it('shows a loading indicator while nodes are loading', async () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes: [], selectedIds: [], isLoading: true },
    })
    await open(wrapper)

    expect(wrapper.find('[data-test="tree-loading"]').exists()).toBe(true)
  })

  it('navigates the parent-search results with the arrow keys and picks the highlighted one with Enter', async () => {
    const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes, selectedIds: [] } })
    await open(wrapper)

    const parentSearch = wrapper.get('[data-test="tree-create-parent-search"]')
    await parentSearch.trigger('focus')
    // parentOptions is [No parent (root), chord-theory, chord-theory > major-triads, rhythm]
    await parentSearch.trigger('keydown', { key: 'ArrowDown' })
    await parentSearch.trigger('keydown', { key: 'ArrowDown' })
    let options = wrapper.findAll('[data-test="tree-create-parent-option"]')
    expect(options[1].attributes('aria-selected')).toBe('true')

    await parentSearch.trigger('keydown', { key: 'ArrowUp' })
    options = wrapper.findAll('[data-test="tree-create-parent-option"]')
    expect(options[0].attributes('aria-selected')).toBe('true')

    await parentSearch.trigger('keydown', { key: 'Enter' })
    expect(wrapper.find('[data-test="tree-create-parent-options"]').exists()).toBe(false)

    await wrapper.get('[data-test="tree-create-name"]').setValue('new-root')
    await wrapper.get('[data-test="tree-create-submit"]').trigger('click')
    expect(wrapper.emitted('create')).toEqual([[{ name: 'new-root', parentId: null }]])
  })

  it('closes the parent-search dropdown with Escape without picking anything', async () => {
    const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes, selectedIds: [] } })
    await open(wrapper)

    const parentSearch = wrapper.get('[data-test="tree-create-parent-search"]')
    await parentSearch.trigger('focus')
    await parentSearch.trigger('keydown', { key: 'ArrowDown' })
    await parentSearch.trigger('keydown', { key: 'Escape' })

    expect(wrapper.find('[data-test="tree-create-parent-options"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="tree-create-parent-clear"]').exists()).toBe(false)
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
})
