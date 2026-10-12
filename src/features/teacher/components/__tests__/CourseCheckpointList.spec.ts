import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type * as VueRouter from 'vue-router'

const push = vi.fn()
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return { ...actual, useRouter: () => ({ push }) }
})

import CourseCheckpointList, { type CheckpointPathInfo } from '@/features/teacher/components/CourseCheckpointList.vue'
import type { CheckpointDraft } from '@/features/teacher/composables/useCourseForm'

const checkpoints: CheckpointDraft[] = [
  { key: 'k-1', learningPathId: 'lp-1', pathTitle: 'First chords', override: '' },
  { key: 'k-2', learningPathId: 'lp-2', pathTitle: 'Travis picking', override: 'Strumming' },
  { key: 'k-3', learningPathId: 'lp-3', pathTitle: null, override: '' },
]

const pathInfo: Record<string, CheckpointPathInfo> = {
  'lp-1': { status: 'published', lessonCount: 6 },
  'lp-2': { status: 'draft', lessonCount: 7 },
}

function mountList(props: { disabled?: boolean } = {}) {
  return mount(CourseCheckpointList, { props: { checkpoints, pathInfo, ...props }, attachTo: document.body })
}

function menuItem(label: string): HTMLButtonElement {
  return [...document.querySelectorAll<HTMLButtonElement>('[data-test="ordered-row-menu-item"]')].find(
    (item) => item.textContent?.trim() === label,
  )!
}

describe('CourseCheckpointList', () => {
  let wrapper: ReturnType<typeof mount> | null = null
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
    push.mockReset()
  })

  it('says when there are no checkpoints yet', () => {
    wrapper = mount(CourseCheckpointList, { props: { checkpoints: [], pathInfo: {} } })

    expect(wrapper.find('[data-test="checkpoints-empty"]').exists()).toBe(true)
  })

  it('names each checkpoint by its position and the title learners see', () => {
    wrapper = mountList()

    expect(wrapper.findAll('[data-test="ordered-row-title"]').map((title) => title.text())).toEqual([
      '1 · First chords',
      '2 · Strumming',
      '3 · …',
    ])
  })

  it('says what each path holds and what blocks publishing', () => {
    wrapper = mountList()

    const metas = wrapper.findAll('[data-test="ordered-row-meta"]')
    expect(metas[0]!.text()).toBe('Path · 6 lessons · Published')
    expect(metas[1]!.text()).toBe('Path · 7 lessons · Draft — publish it first')
    expect(metas[1]!.classes()).toContain('text-warning')
    expect(metas[2]!.text()).toBe('Path')
  })

  it('⋮ offers the moves, Rename in this course, Open the path and Remove from course', async () => {
    wrapper = mountList()

    await wrapper.findAll('[data-test="ordered-row-menu"]')[1]!.trigger('click')

    const labels = [...document.querySelectorAll('[data-test="ordered-row-menu-item"]')].map((item) => item.textContent?.trim())
    expect(labels).toEqual(['Move up', 'Move down', 'Rename in this course', 'Open the path', 'Remove from course'])
  })

  it('moves a checkpoint from its menu', async () => {
    wrapper = mountList()

    await wrapper.findAll('[data-test="ordered-row-menu"]')[1]!.trigger('click')
    menuItem('Move up').click()

    expect(wrapper.emitted('move')).toEqual([[1, 0]])
  })

  it('renames a checkpoint in this course, with the path’s own title as the placeholder', async () => {
    wrapper = mountList()

    await wrapper.findAll('[data-test="ordered-row-menu"]')[0]!.trigger('click')
    menuItem('Rename in this course').click()
    await wrapper.vm.$nextTick()

    const input = document.querySelector<HTMLInputElement>('[data-test="checkpoint-rename-input"]')!
    expect(input.placeholder).toBe('First chords')
    input.value = 'Your first chords'
    input.dispatchEvent(new Event('input'))
    document.querySelector<HTMLButtonElement>('[data-test="checkpoint-rename-confirm"]')!.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('updateOverride')).toEqual([[0, 'Your first chords']])
    expect(document.querySelector('[data-test="checkpoint-rename-input"]')).toBeNull()
  })

  it('a blank name goes back to the path’s own title', async () => {
    wrapper = mountList()

    await wrapper.findAll('[data-test="ordered-row-menu"]')[1]!.trigger('click')
    menuItem('Rename in this course').click()
    await wrapper.vm.$nextTick()

    const input = document.querySelector<HTMLInputElement>('[data-test="checkpoint-rename-input"]')!
    expect(input.value).toBe('Strumming')
    input.value = '  '
    input.dispatchEvent(new Event('input'))
    document.querySelector<HTMLButtonElement>('[data-test="checkpoint-rename-confirm"]')!.click()

    expect(wrapper.emitted('updateOverride')).toEqual([[1, '']])
  })

  it('opens the path', async () => {
    wrapper = mountList()

    await wrapper.findAll('[data-test="ordered-row-menu"]')[1]!.trigger('click')
    menuItem('Open the path').click()

    expect(push).toHaveBeenCalledWith({ name: 'teacher-path-edit', params: { id: 'lp-2' } })
  })

  it('removes a checkpoint', async () => {
    wrapper = mountList()

    await wrapper.findAll('[data-test="ordered-row-menu"]')[2]!.trigger('click')
    menuItem('Remove from course').click()

    expect(wrapper.emitted('remove')).toEqual([[2]])
  })

  it('shows the checkpoints read-only while disabled', () => {
    wrapper = mountList({ disabled: true })

    expect(wrapper.findAll('[data-test="ordered-row"]')).toHaveLength(3)
    expect(wrapper.find('[data-test="ordered-row-handle"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="ordered-row-menu"]').exists()).toBe(false)
  })
})
