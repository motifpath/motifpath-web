import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SkillConceptTreePicker from '@/features/teacher/components/SkillConceptTreePicker.vue'

const nodes = [
  { id: 'root-1', name: 'chord-theory', parent_id: null },
  { id: 'child-1', name: 'major-triads', parent_id: 'root-1' },
  { id: 'root-2', name: 'rhythm', parent_id: null },
]

describe('SkillConceptTreePicker', () => {
  it('renders every node with its breadcrumb path', () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes, selectedIds: [] },
    })

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

    await wrapper.get('[data-test="tree-search"]').setValue('major')

    const rows = wrapper.findAll('[data-test="tree-node-row"]')
    expect(rows).toHaveLength(1)
    expect(wrapper.text()).toContain('major-triads')
  })

  it('restricts the rendered nodes to allowedIds when given', () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes, selectedIds: [], allowedIds: ['root-2'] },
    })

    const rows = wrapper.findAll('[data-test="tree-node-row"]')
    expect(rows).toHaveLength(1)
    expect(wrapper.text()).toContain('rhythm')
  })

  it('in multiple mode, toggling a checkbox adds and removes it from selectedIds', async () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes, selectedIds: ['root-1'] },
    })

    await wrapper.get('[data-test="tree-node-checkbox"][value="root-2"]').setValue(true)
    expect(wrapper.emitted('update:selectedIds')?.[0]).toEqual([['root-1', 'root-2']])

    await wrapper.setProps({ selectedIds: ['root-1'] })
    await wrapper.get('[data-test="tree-node-checkbox"][value="root-1"]').setValue(false)
    expect(wrapper.emitted('update:selectedIds')?.[1]).toEqual([[]])
  })

  it('in single mode, selecting a node replaces the selection', async () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes, selectedIds: ['root-1'], multiple: false },
    })

    await wrapper.get('[data-test="tree-node-radio"][value="child-1"]').setValue(true)
    expect(wrapper.emitted('update:selectedIds')).toEqual([[['child-1']]])
  })

  it('shows selected chips with a remove control in multiple mode', async () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes, selectedIds: ['root-1', 'child-1'] },
    })

    const chips = wrapper.findAll('[data-test="tree-selected-chip"]')
    expect(chips).toHaveLength(2)

    await wrapper.get('[data-test="tree-selected-chip-remove"]').trigger('click')
    expect(wrapper.emitted('update:selectedIds')?.[0]).toEqual([['child-1']])
  })

  it('emits create with the entered name and chosen parent', async () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes, selectedIds: [] },
    })

    await wrapper.get('[data-test="tree-create-name"]').setValue('sweep-picking')
    await wrapper.get('[data-test="tree-create-parent"]').setValue('root-2')
    await wrapper.get('[data-test="tree-create-submit"]').trigger('click')

    expect(wrapper.emitted('create')).toEqual([[{ name: 'sweep-picking', parentId: 'root-2' }]])
  })

  it('emits create with a null parent when no parent is chosen (root node)', async () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes, selectedIds: [] },
    })

    await wrapper.get('[data-test="tree-create-name"]').setValue('new-root')
    await wrapper.get('[data-test="tree-create-submit"]').trigger('click')

    expect(wrapper.emitted('create')).toEqual([[{ name: 'new-root', parentId: null }]])
  })

  it('does not emit create when the name is blank', async () => {
    const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes, selectedIds: [] } })

    await wrapper.get('[data-test="tree-create-submit"]').trigger('click')

    expect(wrapper.emitted('create')).toBeUndefined()
  })

  it('shows a loading indicator while nodes are loading', () => {
    const wrapper = mount(SkillConceptTreePicker, {
      props: { label: 'Skill', nodes: [], selectedIds: [], isLoading: true },
    })

    expect(wrapper.find('[data-test="tree-loading"]').exists()).toBe(true)
  })
})
