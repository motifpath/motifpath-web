import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import AuthoringFiltersLayer from '@/features/teacher/components/AuthoringFiltersLayer.vue'
import type { AuthoringListFilters } from '@/features/teacher/utils/authoringListQuery'
import { overlayInPlaceKey } from '@/shared/composables/overlayInPlace'
import type { TreeNode } from '@/shared/utils/skillConceptTree'

const skills: TreeNode[] = [
  { id: 'scales', name: 'Scales', parent_id: null },
  { id: 'modes', name: 'Modes', parent_id: 'scales' },
]

type Props = InstanceType<typeof AuthoringFiltersLayer>['$props']

function mountLayer(props: Partial<Props> = {}) {
  return mount(AuthoringFiltersLayer, {
    props: {
      open: true,
      section: 'diagrams',
      filters: { skills: [], concepts: [] },
      count: vi.fn().mockResolvedValue(1284),
      instruments: [{ id: 'guitar', name: 'Guitar' }],
      skillNodes: skills,
      conceptNodes: [],
      me: { user_id: 'u-me', display_name: 'Bob Martins' },
      authorName: null,
      ...props,
    },
    global: { provide: { [overlayInPlaceKey as symbol]: true } },
  })
}

function chip(wrapper: ReturnType<typeof mountLayer>, group: string, label: string) {
  const found = wrapper
    .get(`[data-test="filter-group-${group}"]`)
    .findAll('button[aria-pressed]')
    .find((button) => button.text() === label)
  if (!found) throw new Error(`no chip ${label}`)
  return found
}

const showButton = (wrapper: ReturnType<typeof mountLayer>) => wrapper.get('[data-test="filters-show"]')

beforeEach(() => {
  GET.mockReset()
  GET.mockResolvedValue({ data: [] })
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

async function settle() {
  await vi.runAllTimersAsync()
  await flushPromises()
}

describe('AuthoringFiltersLayer', () => {
  it('opens on the applied filters, with the live total on its button', async () => {
    const count = vi.fn().mockResolvedValue(46)
    const wrapper = mountLayer({ filters: { skills: [], concepts: [], kind: 'custom' }, count })
    await settle()

    expect(chip(wrapper, 'kind', 'Custom').attributes('aria-pressed')).toBe('true')
    expect(count).toHaveBeenLastCalledWith({ skills: [], concepts: [], kind: 'custom' })
    expect(showButton(wrapper).text()).toBe('Show 46 diagrams')
  })

  it('counts nothing while closed, and counts the draft once opened', async () => {
    const count = vi.fn().mockResolvedValue(46)
    const wrapper = mountLayer({ open: false, count })
    await settle()
    expect(count).not.toHaveBeenCalled()

    await wrapper.setProps({ open: true })
    await settle()

    expect(count).toHaveBeenCalledTimes(1)
    expect(showButton(wrapper).text()).toBe('Show 46 diagrams')
  })

  it("follows each choice with the total, without applying it", async () => {
    const count = vi.fn().mockResolvedValue(1284)
    const wrapper = mountLayer({ count })
    await settle()
    count.mockResolvedValue(212)

    await chip(wrapper, 'instrument', 'Guitar').trigger('click')
    await settle()

    expect(count).toHaveBeenLastCalledWith({ skills: [], concepts: [], instrument: 'guitar' })
    expect(showButton(wrapper).text()).toBe('Show 212 diagrams')
    expect(wrapper.emitted('apply')).toBeUndefined()
  })

  it('keeps only the newest total when an older count answers late', async () => {
    let answerFirst!: (n: number) => void
    const count = vi
      .fn()
      .mockResolvedValueOnce(1284)
      .mockImplementationOnce(() => new Promise<number>((resolve) => (answerFirst = resolve)))
      .mockResolvedValueOnce(7)
    const wrapper = mountLayer({ count })
    await settle()

    await chip(wrapper, 'kind', 'Templates').trigger('click')
    await settle()
    await chip(wrapper, 'kind', 'Custom').trigger('click')
    await settle()
    answerFirst(999)
    await settle()

    expect(showButton(wrapper).text()).toBe('Show 7 diagrams')
  })

  it('applies the choice and closes from Show', async () => {
    const wrapper = mountLayer()
    await settle()
    await chip(wrapper, 'kind', 'Custom').trigger('click')

    await showButton(wrapper).trigger('click')

    expect(wrapper.emitted<[AuthoringListFilters]>('apply')).toEqual([[{ skills: [], concepts: [], kind: 'custom' }]])
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('closes without applying from ×', async () => {
    const wrapper = mountLayer()
    await chip(wrapper, 'kind', 'Custom').trigger('click')

    await wrapper.get('[data-test="filters-close"]').trigger('click')

    expect(wrapper.emitted('apply')).toBeUndefined()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('clears every choice from Clear all', async () => {
    const wrapper = mountLayer({ filters: { skills: ['modes'], concepts: [], kind: 'custom' } })

    await wrapper.get('[data-test="filters-clear-all"]').trigger('click')

    expect(chip(wrapper, 'kind', 'All').attributes('aria-pressed')).toBe('true')
    await showButton(wrapper).trigger('click')
    expect(wrapper.emitted('apply')).toEqual([[{ skills: [], concepts: [] }]])
  })

  it('chooses skills on their own page and comes back with Done', async () => {
    const wrapper = mountLayer()

    await wrapper.get('[data-test="filter-group-skills"] button').trigger('click')
    expect(wrapper.get('[data-test="filters-title"]').text()).toBe('Skills')
    await wrapper.findAll('[data-test="knowledge-row-choose"]')[0]!.trigger('click')
    await wrapper.get('[data-test="knowledge-done"]').trigger('click')

    expect(wrapper.get('[data-test="filters-title"]').text()).toBe('Filters')
    expect(wrapper.get('[data-test="filter-group-skills"]').text()).toContain('Scales')
  })

  it('keeps Done in the fixed footer on the Skills page, out of what scrolls, counting the choice', async () => {
    const wrapper = mountLayer()
    await wrapper.get('[data-test="filter-group-skills"] button').trigger('click')

    expect(wrapper.get('[data-test="filters-body"]').find('[data-test="knowledge-done"]').exists()).toBe(false)
    const done = () => wrapper.get('[data-test="filters-footer"] [data-test="knowledge-done"]')
    expect(done().text()).toBe('Done')

    await wrapper.findAll('[data-test="knowledge-row-choose"]')[0]!.trigger('click')
    expect(done().text()).toBe('Done · 1 skill')
  })

  it('names Done with the concept words on the Concepts page', async () => {
    const wrapper = mountLayer({ filters: { skills: [], concepts: ['modes'] }, conceptNodes: skills })
    await wrapper.get('[data-test="filter-group-concepts"] button').trigger('click')

    expect(wrapper.get('[data-test="filters-footer"] [data-test="knowledge-done"]').text()).toBe('Done · 1 concept')
  })

  it('comes back from the Author page once an author is chosen', async () => {
    const wrapper = mountLayer()
    await wrapper.get('[data-test="filter-group-author"] button').trigger('click')
    await settle()

    await wrapper.findAll('[data-test="author-option"]')[1]!.trigger('click')

    expect(wrapper.get('[data-test="filters-title"]').text()).toBe('Filters')
    expect(wrapper.get('[data-test="filter-group-author"]').text()).toContain('Me')
  })

  it('goes back from a page without leaving the filters', async () => {
    const wrapper = mountLayer()
    await wrapper.get('[data-test="filter-group-skills"] button').trigger('click')

    await wrapper.get('[data-test="filters-back"]').trigger('click')

    expect(wrapper.get('[data-test="filters-title"]').text()).toBe('Filters')
    expect(wrapper.emitted('close')).toBeUndefined()
  })
})
