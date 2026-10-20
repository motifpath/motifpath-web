import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type * as VueRouter from 'vue-router'

const push = vi.fn()
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return { ...actual, useRouter: () => ({ push }) }
})

import SectionedPathList from '@/features/teacher/components/SectionedPathList.vue'
import type { PathBuilderItem } from '@/features/teacher/components/SectionedPathList.vue'

const items: PathBuilderItem[] = [
  { content_node_id: 'cn-1', title: 'Open position triads', content_type: 'video', section_label: 'Chords' },
  { content_node_id: 'cn-2', title: 'Moveable triads', content_type: 'video', section_label: 'Chords' },
  { content_node_id: 'cn-3', title: 'Reading the fretboard', content_type: 'article' },
  { content_node_id: 'cn-4', title: 'Interval recognition', content_type: 'article' },
]

// cn-3 was never published; cn-4 isn't known yet.
const lessons = { published: new Set(['cn-1', 'cn-2']), known: new Set(['cn-1', 'cn-2', 'cn-3']) }

function mountList() {
  return mount(SectionedPathList, { props: { items, lessons }, attachTo: document.body })
}

function menuLabels() {
  return [...document.querySelectorAll('[data-test="ordered-row-menu-item"]')].map((item) => item.textContent?.trim())
}

function chooseFromMenu(label: string) {
  ;[...document.querySelectorAll<HTMLButtonElement>('[data-test="ordered-row-menu-item"]')]
    .find((item) => item.textContent?.trim() === label)!
    .click()
}

describe('SectionedPathList', () => {
  let wrapper: ReturnType<typeof mountList> | null = null
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
    push.mockReset()
  })

  it('groups consecutive lessons sharing a section label under one heading', () => {
    wrapper = mountList()

    expect(wrapper.findAll('[data-test="path-section-heading"]').map((heading) => heading.text())).toEqual([
      'Chords',
      'No section',
    ])
  })

  it('names each lesson by its place in the path, and says what it is and whether learners can get it', () => {
    wrapper = mountList()

    expect(wrapper.findAll('[data-test="ordered-row-title"]').map((title) => title.text())).toEqual([
      '1 · Open position triads',
      '2 · Moveable triads',
      '3 · Reading the fretboard',
      '4 · Interval recognition',
    ])
    const metas = wrapper.findAll('[data-test="ordered-row-meta"]')
    expect(metas[0]!.text()).toBe('Video · Published')
    expect(metas[2]!.text()).toBe('Article · Draft — publish it first')
    expect(metas[2]!.classes()).toContain('text-warning')
    expect(metas[3]!.text()).toBe('Article')
  })

  it('⋮ offers the moves, Section…, Open the lesson and Remove from path', async () => {
    wrapper = mountList()

    await wrapper.findAll('[data-test="ordered-row-menu"]')[1]!.trigger('click')

    expect(menuLabels()).toEqual(['Move up', 'Move down', 'Section…', 'Open the lesson', 'Remove from path'])
  })

  it('moves a lesson from its menu', async () => {
    wrapper = mountList()

    await wrapper.findAll('[data-test="ordered-row-menu"]')[3]!.trigger('click')
    chooseFromMenu('Move up')

    expect(wrapper.emitted('reorder')).toEqual([[3, 2]])
  })

  it('sets a lesson’s section', async () => {
    wrapper = mountList()

    await wrapper.findAll('[data-test="ordered-row-menu"]')[2]!.trigger('click')
    chooseFromMenu('Section…')
    await wrapper.vm.$nextTick()
    const input = document.querySelector<HTMLInputElement>('[data-test="text-entry-input"]')!
    input.value = 'Reading'
    input.dispatchEvent(new Event('input'))
    document.querySelector<HTMLButtonElement>('[data-test="text-entry-confirm"]')!.click()

    expect(wrapper.emitted('relabel')).toEqual([[2, 'Reading']])
  })

  it('opens the lesson', async () => {
    wrapper = mountList()

    await wrapper.findAll('[data-test="ordered-row-menu"]')[0]!.trigger('click')
    chooseFromMenu('Open the lesson')

    expect(push).toHaveBeenCalledWith({ name: 'teacher-content-edit', params: { id: 'cn-1' } })
  })

  it('removes a lesson from the path', async () => {
    wrapper = mountList()

    await wrapper.findAll('[data-test="ordered-row-menu"]')[2]!.trigger('click')
    chooseFromMenu('Remove from path')

    expect(wrapper.emitted('remove')).toEqual([[2]])
  })

  it('shows an empty state when there are no lessons', () => {
    wrapper = mount(SectionedPathList, { props: { items: [], lessons } })

    expect(wrapper.find('[data-test="path-empty"]').exists()).toBe(true)
  })
})
