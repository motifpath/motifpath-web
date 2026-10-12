import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import KnowledgeFilterPicker from '@/features/teacher/components/KnowledgeFilterPicker.vue'
import type { TreeNode } from '@/shared/utils/skillConceptTree'

const GUITAR = 'guitar'
const PIANO = 'piano'

const nodes: TreeNode[] = [
  { id: 'scales', name: 'Scales', parent_id: null },
  { id: 'pentatonic', name: 'Pentatonic shapes', parent_id: 'scales', instrumentIds: [GUITAR] },
  { id: 'major', name: 'Major scale', parent_id: 'scales' },
  { id: 'modes', name: 'Modes', parent_id: 'scales' },
  { id: 'dorian', name: 'Dorian', parent_id: 'modes' },
  { id: 'lydian', name: 'Lydian', parent_id: 'modes' },
  { id: 'voicings', name: 'Piano voicings', parent_id: null, instrumentIds: [PIANO] },
]

type Props = InstanceType<typeof KnowledgeFilterPicker>['$props']

function mountPicker(props: Partial<Props> = {}) {
  return mount(KnowledgeFilterPicker, {
    props: { kind: 'skill', nodes, modelValue: [], instrumentId: null, instrumentName: null, ...props },
  })
}

const rowLabels = (wrapper: ReturnType<typeof mountPicker>) =>
  wrapper.findAll('[data-test="knowledge-row-name"]').map((name) => name.text())

function row(wrapper: ReturnType<typeof mountPicker>, name: string) {
  const found = wrapper
    .findAll('[data-test="knowledge-row"]')
    .find((r) => r.get('[data-test="knowledge-row-name"]').text() === name)
  if (!found) throw new Error(`no row ${name}`)
  return found
}

beforeEach(() => window.localStorage.clear())

describe('KnowledgeFilterPicker', () => {
  it('starts on the top areas, by name', () => {
    expect(rowLabels(mountPicker())).toEqual(['Piano voicings', 'Scales'])
  })

  it('chooses a skill or an area with a tap', async () => {
    const wrapper = mountPicker({ modelValue: ['pentatonic'] })

    await row(wrapper, 'Scales').get('[data-test="knowledge-row-choose"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[['pentatonic', 'scales']]])
  })

  it('marks what is chosen, and a second tap unchooses it', async () => {
    const wrapper = mountPicker({ modelValue: ['scales'] })
    const choose = row(wrapper, 'Scales').get('[data-test="knowledge-row-choose"]')

    expect(choose.attributes('aria-pressed')).toBe('true')
    await choose.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[[]]])
  })

  it("opens an area from its skill count, without choosing it, with the path to it", async () => {
    const wrapper = mountPicker()

    await row(wrapper, 'Scales').get('[data-test="knowledge-row-open"]').trigger('click')

    expect(rowLabels(wrapper)).toEqual(['Major scale', 'Modes', 'Pentatonic shapes'])
    expect(wrapper.get('[data-test="knowledge-path"]').text()).toBe('Skills › Scales')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it("names an area's open button with what it shows, then the area", () => {
    const open = row(mountPicker(), 'Scales').get('[data-test="knowledge-row-open"]')
    expect(open.attributes('aria-label')).toBe('3 skills, open Scales')
  })

  it('counts the skills an area opens onto', () => {
    const wrapper = mountPicker()
    expect(row(wrapper, 'Scales').get('[data-test="knowledge-row-open"]').text()).toBe('3 skills')
  })

  it('goes back up the path', async () => {
    const wrapper = mountPicker()
    await row(wrapper, 'Scales').get('[data-test="knowledge-row-open"]').trigger('click')
    await row(wrapper, 'Modes').get('[data-test="knowledge-row-open"]').trigger('click')

    await wrapper.get('[data-test="knowledge-path-root"]').trigger('click')

    expect(rowLabels(wrapper)).toEqual(['Piano voicings', 'Scales'])
  })

  it('shows the chosen ones as chips at the top, and × unchooses one', async () => {
    const wrapper = mountPicker({ modelValue: ['pentatonic', 'modes'] })

    expect(wrapper.findAll('[data-test="filter-chip"]').map((chip) => chip.text())).toEqual([
      'Pentatonic shapes',
      'Modes',
    ])
    await wrapper.findAll('[data-test="filter-chip"] button')[1]!.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[['pentatonic']]])
  })

  it('finds a skill by name anywhere in the tree, with its path', async () => {
    const wrapper = mountPicker()

    await wrapper.get('input[type="search"]').setValue('dor')

    expect(rowLabels(wrapper)).toEqual(['Dorian'])
    expect(row(wrapper, 'Dorian').text()).toContain('Scales › Modes')
  })

  it('keeps to the filtered instrument, with All instruments to widen it', async () => {
    const wrapper = mountPicker({ instrumentId: PIANO, instrumentName: 'Piano' })
    await row(wrapper, 'Scales').get('[data-test="knowledge-row-open"]').trigger('click')
    expect(rowLabels(wrapper)).toEqual(['Major scale', 'Modes'])

    await wrapper.get('[data-test="knowledge-all-instruments"]').trigger('click')

    expect(rowLabels(wrapper)).toEqual(['Major scale', 'Modes', 'Pentatonic shapes'])
  })

  it('says that an area brings what is under it', () => {
    expect(mountPicker().text()).toContain('Choosing an area matches it and every skill under it.')
  })

  it('lists recent choices first, at the top', async () => {
    const first = mountPicker()
    await row(first, 'Scales').get('[data-test="knowledge-row-open"]').trigger('click')
    await row(first, 'Modes').get('[data-test="knowledge-row-choose"]').trigger('click')
    first.unmount()

    const again = mountPicker()

    expect(again.get('[data-test="knowledge-recent"]').text()).toContain('Modes')
  })

  it('uses the concept words for concepts', () => {
    const wrapper = mountPicker({ kind: 'concept', modelValue: ['modes'] })

    expect(wrapper.find('input[type="search"]').attributes('placeholder')).toBe('Search concepts')
    expect(wrapper.text()).toContain('Choosing an area matches it and every concept under it.')
  })
})
