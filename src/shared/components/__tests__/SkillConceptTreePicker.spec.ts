import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import SkillConceptTreePicker from '@/shared/components/SkillConceptTreePicker.vue'
import type { TreeNode } from '@/shared/utils/skillConceptTree'

const nodes: TreeNode[] = [
  { id: 'root-1', name: 'chord-theory', parent_id: null },
  { id: 'child-1', name: 'major-triads', parent_id: 'root-1' },
  { id: 'root-2', name: 'rhythm', parent_id: null },
]

const instruments = [
  { instrument_id: 'electric', names: { en: 'Electric guitar' }, languages: ['en'] },
  { instrument_id: 'bass', names: { en: 'Electric bass' }, languages: ['en'] },
]

type Wrapper = ReturnType<typeof mount>

async function open(wrapper: Wrapper) {
  await wrapper.get('[data-test="tree-open-picker"]').trigger('click')
  await flushPromises()
}

function rowNames(wrapper: Wrapper): string[] {
  return wrapper.findAll('[data-test="tree-node-name"]').map((name) => name.text())
}

async function expand(wrapper: Wrapper, id: string) {
  await wrapper.get(`[data-test="tree-node-toggle"][data-node-id="${id}"]`).trigger('click')
}

describe('SkillConceptTreePicker', () => {
  beforeEach(() => {
    GET.mockReset()
    GET.mockResolvedValue({ data: instruments, error: undefined, response: { status: 200 } })
  })

  describe('the tree', () => {
    it('lists the top-level nodes, collapsed, once the picker is opened', async () => {
      const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes, selectedIds: [] } })
      await open(wrapper)

      expect(rowNames(wrapper)).toEqual(['chord-theory', 'rhythm'])
    })

    it('expands and collapses a node to show its children', async () => {
      const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes, selectedIds: [] } })
      await open(wrapper)

      await expand(wrapper, 'root-1')
      expect(rowNames(wrapper)).toEqual(['chord-theory', 'major-triads', 'rhythm'])

      await expand(wrapper, 'root-1')
      expect(rowNames(wrapper)).toEqual(['chord-theory', 'rhythm'])
    })

    it('opens in a large two-pane dialog: the tree beside what is selected', async () => {
      const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes, selectedIds: ['root-2'] } })
      await open(wrapper)

      expect(wrapper.get('[data-test="modal-panel"]').classes()).toContain('w-[min(960px,calc(100vw-32px))]')
      expect(wrapper.find('[data-test="tree-pane"]').exists()).toBe(true)
      expect(wrapper.findAll('[data-test="tree-selection-item"]').map((item) => item.text())).toEqual(['rhythm'])
    })

    it('shows a loading indicator while nodes are loading', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes: [], selectedIds: [], isLoading: true },
      })
      await open(wrapper)

      expect(wrapper.find('[data-test="tree-loading"]').exists()).toBe(true)
    })
  })

  describe('picking', () => {
    it('in multiple mode, checking a node selects it together with its ancestors', async () => {
      const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes, selectedIds: [] } })
      await open(wrapper)
      await expand(wrapper, 'root-1')

      await wrapper.get('[data-test="tree-node-checkbox"][value="child-1"]').setValue(true)

      expect(wrapper.emitted('update:selectedIds')?.[0]).toEqual([['child-1', 'root-1']])
    })

    it('unchecking a node also removes its selected descendants', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes, selectedIds: ['root-1', 'child-1'] },
      })
      await open(wrapper)

      await wrapper.get('[data-test="tree-node-checkbox"][value="root-1"]').setValue(false)

      expect(wrapper.emitted('update:selectedIds')?.[0]).toEqual([[]])
    })

    it('in single mode, picking a node replaces the selection and closes the picker', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes, selectedIds: ['root-1'], multiple: false },
      })
      await open(wrapper)

      await wrapper.get('[data-test="tree-node-radio"][value="root-2"]').setValue(true)

      expect(wrapper.emitted('update:selectedIds')?.[0]).toEqual([['root-2']])
      expect(wrapper.find('[data-test="tree-search"]').exists()).toBe(false)
    })

    it('checking a parent selects its whole subtree, and its own ancestors', async () => {
      const deep: TreeNode[] = [
        { id: 'tech', name: 'Technique', parent_id: null },
        { id: 'bends', name: 'Bends', parent_id: 'tech' },
        { id: 'half', name: 'Half-step bend', parent_id: 'bends' },
        { id: 'whole', name: 'Whole-step bend', parent_id: 'bends' },
      ]
      const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes: deep, selectedIds: [] } })
      await open(wrapper)
      await expand(wrapper, 'tech')

      await wrapper.get('[data-test="tree-node-checkbox"][value="bends"]').setValue(true)

      expect(wrapper.emitted('update:selectedIds')?.[0]).toEqual([['bends', 'half', 'whole', 'tech']])
    })

    it("leaves out of the subtree the children that don't fit the content's instruments", async () => {
      const scopedTree: TreeNode[] = [
        { id: 'muting', name: 'Muting', parent_id: null, instrumentIds: ['electric', 'bass'] },
        { id: 'palm', name: 'Palm muting', parent_id: 'muting', instrumentIds: ['electric'] },
        { id: 'thumb', name: 'Thumb muting', parent_id: 'muting', instrumentIds: ['bass'] },
      ]
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes: scopedTree, selectedIds: [], instrumentIds: ['electric'] },
      })
      await open(wrapper)

      await wrapper.get('[data-test="tree-node-checkbox"][value="muting"]').setValue(true)

      expect(wrapper.emitted('update:selectedIds')?.[0]).toEqual([['muting', 'palm']])
    })

    it('in single mode, picking a parent picks only that node', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes, selectedIds: [], multiple: false },
      })
      await open(wrapper)

      await wrapper.get('[data-test="tree-node-radio"][value="root-1"]').setValue(true)

      expect(wrapper.emitted('update:selectedIds')?.[0]).toEqual([['root-1']])
    })

    it('lists a fully selected subtree as one entry in the selection pane, and removes it whole', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes, selectedIds: ['root-1', 'child-1'] },
      })
      await open(wrapper)

      const items = wrapper.findAll('[data-test="tree-selection-item"]')
      expect(items.map((item) => item.text())).toEqual(['chord-theory+1'])
      await items[0]!.get('[data-test="tree-selection-remove"]').trigger('click')

      expect(wrapper.emitted('update:selectedIds')?.[0]).toEqual([[]])
    })

    it('restricts the tree to allowedIds when given', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes, selectedIds: [], allowedIds: ['root-2'] },
      })
      await open(wrapper)

      expect(rowNames(wrapper)).toEqual(['rhythm'])
    })
  })

  describe('chips on the form', () => {
    const family: TreeNode[] = [
      { id: 'tech', name: 'Technique', parent_id: null },
      { id: 'bends', name: 'Bends', parent_id: 'tech' },
      { id: 'half', name: 'Half-step bend', parent_id: 'bends' },
      { id: 'whole', name: 'Whole-step bend', parent_id: 'bends' },
      { id: 'alt', name: 'Alternate picking', parent_id: 'tech' },
    ]

    it('shows a picked node with its breadcrumb, and not the parents picked along with it', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes: family, selectedIds: ['half', 'bends', 'tech'] },
      })

      const chips = wrapper.findAll('[data-test="tree-selected-chip"]')
      expect(chips.map((chip) => chip.text())).toEqual(['Technique > Bends > Half-step bend'])

      await chips[0]!.get('[data-test="tree-selected-chip-remove"]').trigger('click')
      expect(wrapper.emitted('update:selectedIds')?.[0]).toEqual([['bends', 'tech']])
    })

    it('shows a fully picked subtree as one chip that counts the rest, and removes it whole', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes: family, selectedIds: ['bends', 'half', 'whole', 'tech'] },
      })

      const chips = wrapper.findAll('[data-test="tree-selected-chip"]')
      expect(chips.map((chip) => chip.text())).toEqual(['Technique > Bends+2'])

      await chips[0]!.get('[data-test="tree-selected-chip-remove"]').trigger('click')
      expect(wrapper.emitted('update:selectedIds')?.[0]).toEqual([['tech']])
    })
  })

  describe('search', () => {
    const graph: TreeNode[] = [
      { id: 'bends', name: 'Bends', parent_id: null, searchTerms: ['Bends', 'Puxadas', 'bends'] },
      {
        id: 'half',
        name: 'Half-step bend',
        parent_id: 'bends',
        searchTerms: ['Half-step bend', 'Bend de meio tom', 'half-step-bend'],
      },
      { id: 'vibrato', name: 'Vibrato', parent_id: null, searchTerms: ['Vibrato', 'vibrato-technique'] },
    ]

    it('finds a node by its name in another language, shown under its ancestors', async () => {
      const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes: graph, selectedIds: [] } })
      await open(wrapper)
      await wrapper.get('[data-test="tree-search"]').setValue('meio tom')

      expect(rowNames(wrapper)).toEqual(['Bends', 'Half-step bend'])
    })

    it('finds a node by its key', async () => {
      const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes: graph, selectedIds: [] } })
      await open(wrapper)
      await wrapper.get('[data-test="tree-search"]').setValue('vibrato-tech')

      expect(rowNames(wrapper)).toEqual(['Vibrato'])
    })

    it("finds a node's children by an ancestor's name in another language", async () => {
      const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes: graph, selectedIds: [] } })
      await open(wrapper)
      await wrapper.get('[data-test="tree-search"]').setValue('puxadas')

      expect(rowNames(wrapper)).toEqual(['Bends', 'Half-step bend'])
    })

    it('says nothing matched when the search matches no node', async () => {
      const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes, selectedIds: [] } })
      await open(wrapper)
      await wrapper.get('[data-test="tree-search"]').setValue('zzz')

      expect(wrapper.get('[data-test="tree-empty"]').text()).toBe('No matching nodes.')
    })
  })

  describe('the instrument filter', () => {
    const scoped: TreeNode[] = [
      { id: 'reading', name: 'Reading tab', parent_id: null, instrumentIds: [] },
      { id: 'bends', name: 'Bends', parent_id: null, instrumentIds: ['electric'] },
      { id: 'slap', name: 'Slap', parent_id: null, instrumentIds: ['bass'] },
    ]

    it("starts on the nodes that fit the content's instruments", async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes: scoped, selectedIds: [], instrumentIds: ['electric'] },
      })
      await open(wrapper)

      expect(wrapper.get<HTMLSelectElement>('[data-test="tree-instrument-filter"]').element.value).toBe('content')
      expect(rowNames(wrapper)).toEqual(['Bends', 'Reading tab'])
    })

    it('fits content for every instrument with the nodes for every instrument only', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes: scoped, selectedIds: [], instrumentIds: [] },
      })
      await open(wrapper)

      expect(rowNames(wrapper)).toEqual(['Reading tab'])
    })

    it("shows nodes for other instruments on request, but they can't be picked", async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes: scoped, selectedIds: [], instrumentIds: ['electric'] },
      })
      await open(wrapper)

      await wrapper.get('[data-test="tree-instrument-filter"]').setValue('')

      expect(rowNames(wrapper)).toEqual(['Bends', 'Reading tab', 'Slap'])
      expect(wrapper.get('[data-test="tree-node-checkbox"][value="slap"]').attributes('disabled')).toBeDefined()
      expect(wrapper.get('[data-test="tree-node-unsuited"]').text()).toBe("Not for this content's instruments")
    })

    it('narrows to one instrument, including the nodes for every instrument', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes: scoped, selectedIds: [], instrumentIds: ['electric'] },
      })
      await open(wrapper)

      await wrapper.get('[data-test="tree-instrument-filter"]').setValue('bass')

      expect(rowNames(wrapper)).toEqual(['Reading tab', 'Slap'])
    })

    it('starts on every instrument, with no "fits" choice, when there is no content to fit', async () => {
      const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes: scoped, selectedIds: [] } })
      await open(wrapper)

      const filter = wrapper.get<HTMLSelectElement>('[data-test="tree-instrument-filter"]')
      expect(filter.element.value).toBe('')
      expect(filter.findAll('option').map((option) => option.text())).toEqual([
        'Any instrument',
        'Electric guitar',
        'Electric bass',
      ])
      expect(rowNames(wrapper)).toEqual(['Bends', 'Reading tab', 'Slap'])
    })

    it('flags a picked node that no longer suits the instruments', () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes: scoped, selectedIds: ['slap', 'reading'], instrumentIds: ['electric'] },
      })

      const chips = wrapper.findAll('[data-test="tree-selected-chip"]')
      expect(chips[0]!.attributes('data-unsuited')).toBe('true')
      expect(chips[1]!.attributes('data-unsuited')).toBeUndefined()
    })

    it('explains a flagged node in visible text that the flagged chip is described by', () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes: scoped, selectedIds: ['slap', 'reading'], instrumentIds: ['electric'] },
      })

      const note = wrapper.get('[data-test="tree-unsuited-note"]')
      expect(note.text()).toBe("The items in red aren't for this content's instruments. Remove them before saving.")
      const [flagged, suited] = wrapper.findAll('[data-test="tree-selected-chip"]')
      expect(flagged!.attributes('aria-describedby')).toBe(note.attributes('id'))
      expect(suited!.attributes('aria-describedby')).toBeUndefined()
    })

    it('shows no explanation when every picked node suits the instruments', () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes: scoped, selectedIds: ['reading'], instrumentIds: ['electric'] },
      })

      expect(wrapper.find('[data-test="tree-unsuited-note"]').exists()).toBe(false)
    })
  })

  describe('suggestions', () => {
    it('marks the suggested nodes, and narrows the tree to them on request', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Concept', nodes, selectedIds: [], suggestedIds: ['child-1'] },
      })
      await open(wrapper)

      const toggle = wrapper.get('[data-test="tree-suggested-only"]')
      expect(toggle.text()).toBe('Suggested (1)')
      await toggle.trigger('click')

      expect(toggle.attributes('aria-pressed')).toBe('true')
      expect(rowNames(wrapper)).toEqual(['chord-theory', 'major-triads'])
      expect(wrapper.findAll('[data-test="tree-suggested-badge"]')).toHaveLength(1)
    })

    it('lists every node again once the suggestions are gone, instead of an empty tree', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes, selectedIds: [], suggestedIds: ['child-1'] },
      })
      await open(wrapper)
      await wrapper.get('[data-test="tree-suggested-only"]').trigger('click')

      await wrapper.setProps({ suggestedIds: [] })

      expect(wrapper.find('[data-test="tree-suggested-only"]').exists()).toBe(false)
      expect(rowNames(wrapper)).toEqual(['chord-theory', 'rhythm'])
      await wrapper.get('[data-test="tree-search"]').setValue('rhy')
      expect(rowNames(wrapper)).toEqual(['rhythm'])
    })

    it('does not narrow to suggestions again when new ones arrive later', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes, selectedIds: [], suggestedIds: ['child-1'] },
      })
      await open(wrapper)
      await wrapper.get('[data-test="tree-suggested-only"]').trigger('click')
      await wrapper.setProps({ suggestedIds: [] })

      await wrapper.setProps({ suggestedIds: ['root-2'] })

      expect(wrapper.get('[data-test="tree-suggested-only"]').attributes('aria-pressed')).toBe('false')
      expect(rowNames(wrapper)).toEqual(['chord-theory', 'rhythm'])
    })

    it('offers no suggestions filter when there is nothing to suggest', async () => {
      const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Concept', nodes, selectedIds: [] } })
      await open(wrapper)

      expect(wrapper.find('[data-test="tree-suggested-only"]').exists()).toBe(false)
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

      expect(wrapper.find('[data-test="tree-suggested-only"]').exists()).toBe(false)
    })
  })

  describe('advanced filters', () => {
    it('are hidden until asked for', async () => {
      const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes, selectedIds: [] } })
      await open(wrapper)

      expect(wrapper.find('[data-test="tree-area-filter"]').exists()).toBe(false)
      await wrapper.get('[data-test="tree-advanced-toggle"]').trigger('click')
      expect(wrapper.find('[data-test="tree-area-filter"]').exists()).toBe(true)
    })

    it('narrow the tree to one top-level area', async () => {
      const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes, selectedIds: [] } })
      await open(wrapper)
      await wrapper.get('[data-test="tree-advanced-toggle"]').trigger('click')

      const area = wrapper.get('[data-test="tree-area-filter"]')
      expect(area.findAll('option').map((option) => option.text())).toEqual(['All areas', 'chord-theory', 'rhythm'])
      await area.setValue('root-1')

      expect(rowNames(wrapper)).toEqual(['chord-theory'])
    })

    it('narrow the tree to what is selected', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes, selectedIds: ['root-1', 'child-1'] },
      })
      await open(wrapper)
      await wrapper.get('[data-test="tree-advanced-toggle"]').trigger('click')

      await wrapper.get('[data-test="tree-selected-only"]').setValue(true)

      expect(rowNames(wrapper)).toEqual(['chord-theory', 'major-triads'])
    })
  })

  describe('hints and failures', () => {
    it('is select-only: no create section, and the hint asks the team for a missing node', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes, selectedIds: [], missingHint: true },
      })
      await open(wrapper)

      expect(wrapper.find('[data-test="tree-create-name"]').exists()).toBe(false)
      expect(wrapper.get('[data-test="tree-missing-hint"]').text()).toBe('Missing one? Ask the team.')
    })

    it('lets an admin add a missing node in the knowledge map, in a new tab', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes, selectedIds: [], missingHint: true, createKind: 'skill' },
        global: { stubs: { RouterLink: RouterLinkStub } },
      })
      await open(wrapper)

      const hint = wrapper.get('[data-test="tree-missing-hint"]')
      expect(hint.text()).toBe('Missing one? Add it in the knowledge map')
      const link = hint.getComponent(RouterLinkStub)
      expect(link.props('to')).toEqual({ name: 'admin-knowledge-map', query: { tree: 'skill', new: 'skill' } })
      expect(link.attributes('target')).toBe('_blank')
    })

    it('shows no missing-node hint unless asked to', async () => {
      const wrapper = mount(SkillConceptTreePicker, { props: { label: 'Skill', nodes, selectedIds: [] } })
      await open(wrapper)

      expect(wrapper.find('[data-test="tree-missing-hint"]').exists()).toBe(false)
    })

    it('says the nodes failed to load and offers a retry, instead of an empty tree or the hint', async () => {
      const wrapper = mount(SkillConceptTreePicker, {
        props: { label: 'Skill', nodes: [], selectedIds: [], loadFailed: true, missingHint: true },
      })
      await open(wrapper)

      expect(wrapper.get('[data-test="tree-load-failed"]').text()).toContain("Couldn't load the list.")
      expect(wrapper.find('[data-test="tree-empty"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="tree-missing-hint"]').exists()).toBe(false)

      await wrapper.get('[data-test="tree-retry"]').trigger('click')
      expect(wrapper.emitted('retry')).toHaveLength(1)
    })
  })
})
