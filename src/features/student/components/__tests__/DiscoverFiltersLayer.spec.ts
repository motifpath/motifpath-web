import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import DiscoverFiltersLayer from '@/features/student/components/DiscoverFiltersLayer.vue'
import type { DiscoverFilters } from '@/features/student/utils/discoverQuery'
import { overlayInPlaceKey } from '@/shared/composables/overlayInPlace'
import { mockViewport } from '@/shared/testUtils/viewport'

const NONE: DiscoverFilters = { levels: [], skills: [], concepts: [] }

type Props = InstanceType<typeof DiscoverFiltersLayer>['$props']

function mountLayer(props: Partial<Props> = {}) {
  return mount(DiscoverFiltersLayer, {
    props: {
      open: true,
      segment: 'courses',
      filters: NONE,
      count: vi.fn().mockResolvedValue(3),
      instruments: [
        { id: 'inst-guitar', name: 'Guitar' },
        { id: 'inst-bass', name: 'Bass' },
      ],
      teacherName: null,
      ...props,
    },
    global: { provide: { [overlayInPlaceKey as symbol]: true } },
  })
}

type Wrapper = ReturnType<typeof mountLayer>

function chip(wrapper: Wrapper, group: string, label: string) {
  const found = wrapper
    .get(`[data-test="filter-group-${group}"]`)
    .findAll('button[aria-pressed]')
    .find((button) => button.text() === label)
  if (!found) throw new Error(`no ${group} chip ${label}`)
  return found
}

const showButton = (wrapper: Wrapper) => wrapper.get('[data-test="filters-show"]')

async function settle() {
  await vi.runAllTimersAsync()
  await flushPromises()
}

beforeEach(() => {
  GET.mockReset()
  GET.mockResolvedValue({ data: [{ user_id: 'u-bob', display_name: 'Bob Martins', item_count: 2 }] })
  vi.useFakeTimers()
  mockViewport(1280)
})
afterEach(() => vi.useRealTimers())

describe('DiscoverFiltersLayer', () => {
  it('opens on the applied filters, counting what they show', async () => {
    const count = vi.fn().mockResolvedValue(3)
    const wrapper = mountLayer({ filters: { ...NONE, instrument: 'inst-guitar' }, count })
    await settle()

    expect(chip(wrapper, 'instrument', 'Guitar').attributes('aria-pressed')).toBe('true')
    expect(count).toHaveBeenLastCalledWith({ ...NONE, instrument: 'inst-guitar' })
    expect(showButton(wrapper).text()).toBe('Show 3 courses')
  })

  it('counts each change as a draft, without applying it', async () => {
    const count = vi.fn().mockResolvedValueOnce(3).mockResolvedValue(2)
    const wrapper = mountLayer({ count })
    await settle()

    await chip(wrapper, 'levels', 'Beginner').trigger('click')
    await settle()

    expect(count).toHaveBeenLastCalledWith({ ...NONE, levels: ['beginner'] })
    expect(showButton(wrapper).text()).toBe('Show 2 courses')
    expect(wrapper.emitted('apply')).toBeUndefined()
  })

  it('names paths on Paths', async () => {
    const wrapper = mountLayer({ segment: 'paths', count: vi.fn().mockResolvedValue(1) })
    await settle()

    expect(showButton(wrapper).text()).toBe('Show 1 path')
  })

  it('says Show results when the count fails', async () => {
    const wrapper = mountLayer({ count: vi.fn().mockResolvedValue(null) })
    await settle()

    expect(showButton(wrapper).text()).toBe('Show results')
  })

  it('applies the draft and closes when shown', async () => {
    const wrapper = mountLayer()
    await settle()

    await chip(wrapper, 'levels', 'Beginner').trigger('click')
    await showButton(wrapper).trigger('click')

    expect(wrapper.emitted('apply')).toEqual([[{ ...NONE, levels: ['beginner'] }]])
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('clears every filter in the draft, a skill that came with the address too', async () => {
    const count = vi.fn().mockResolvedValue(3)
    const wrapper = mountLayer({ filters: { ...NONE, levels: ['beginner'], skills: ['s-1'] }, count })
    await settle()

    await wrapper.get('[data-test="filters-clear-all"]').trigger('click')
    await settle()

    expect(count).toHaveBeenLastCalledWith(NONE)
    expect(wrapper.emitted('apply')).toBeUndefined()
  })

  it('leaves the list as it was when closed, and reopens on the applied filters', async () => {
    const wrapper = mountLayer()
    await settle()

    await chip(wrapper, 'levels', 'Beginner').trigger('click')
    await wrapper.get('[data-test="overlay-close"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('apply')).toBeUndefined()

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })
    expect(chip(wrapper, 'levels', 'Beginner').attributes('aria-pressed')).toBe('false')
  })

  it('replaces its content with the teacher list, with a back arrow, never a second layer', async () => {
    const wrapper = mountLayer()
    await settle()

    await wrapper.get('[data-test="filter-group-teacher"] button').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[role="dialog"]')).toHaveLength(1)
    expect(wrapper.find('[data-test="filter-group-levels"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="overlay-back"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="overlay-close"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-test="teacher-option"]').map((option) => option.text())).toEqual([
      'Any teacher',
      'Bob Martins',
    ])
  })

  it('returns to the filters with the teacher chosen and named', async () => {
    const count = vi.fn().mockResolvedValue(3)
    const wrapper = mountLayer({ count })
    await settle()

    await wrapper.get('[data-test="filter-group-teacher"] button').trigger('click')
    await flushPromises()
    await wrapper.findAll('[data-test="teacher-option"]')[1]!.trigger('click')
    await settle()

    expect(wrapper.get('[data-test="filter-group-teacher"]').text()).toContain('Bob Martins')
    expect(count).toHaveBeenLastCalledWith({ ...NONE, teacher: 'u-bob' })
  })

  it('goes back from the teacher list without changing the teacher', async () => {
    const wrapper = mountLayer({ filters: { ...NONE, teacher: 'u-bob' }, teacherName: 'Bob Martins' })
    await settle()

    await wrapper.get('[data-test="filter-group-teacher"] button').trigger('click')
    await wrapper.get('[data-test="overlay-back"]').trigger('click')

    expect(wrapper.get('[data-test="filter-group-teacher"]').text()).toContain('Bob Martins')
  })

  it('is a bottom sheet on a phone, with Clear all and Show at its foot', async () => {
    mockViewport(390)
    const wrapper = mountLayer({ count: vi.fn().mockResolvedValue(2) })
    await settle()

    const sheet = wrapper.get('[data-test="overlay-sheet"]')
    expect(sheet.find('[data-test="sheet-grabber"]').exists()).toBe(true)
    const actions = sheet.get('[data-test="filters-footer"]').findAll('button').map((button) => button.text())
    expect(actions).toEqual(['Clear all', 'Show 2 courses'])
  })

  it('is a dialog from a tablet up, with Show last', async () => {
    mockViewport(1280)
    const wrapper = mountLayer()
    await settle()

    const dialog = wrapper.get('[data-test="overlay-dialog"]')
    const actions = dialog.get('[data-test="filters-footer"]').findAll('button').map((button) => button.text())
    expect(actions).toEqual(['Clear all', 'Show 3 courses'])
  })
})
