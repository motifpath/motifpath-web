import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import EditorAppBar from '@/shared/components/EditorAppBar.vue'

const sectionTo = { name: 'teacher-courses' }

function mountBar(props: Partial<InstanceType<typeof EditorAppBar>['$props']> = {}) {
  return mount(EditorAppBar, {
    props: { sectionLabel: 'Courses', sectionTo, title: 'Guitar foundations', saveState: 'saved', ...props },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('EditorAppBar', () => {
  it('names the section over the item, and goes back to the section', () => {
    const wrapper = mountBar({ compact: true })

    expect(wrapper.get('[data-test="editor-app-bar-section"]').text()).toBe('Courses')
    expect(wrapper.get('[data-test="editor-app-bar-title"]').text()).toBe('Guitar foundations')
    const back = wrapper.get('[data-test="editor-app-bar-back"]')
    expect(back.attributes('aria-label')).toBe('Back to Courses')
    expect(wrapper.getComponent(RouterLinkStub).props('to')).toEqual(sectionTo)
  })

  it('on a wide screen links the section over a page title instead of a back arrow', () => {
    const wrapper = mountBar({ compact: false })

    expect(wrapper.find('[data-test="editor-app-bar-back"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="editor-app-bar-section"]').text()).toBe('Courses')
    expect(wrapper.getComponent(RouterLinkStub).props('to')).toEqual(sectionTo)
    expect(wrapper.get('h1').text()).toBe('Guitar foundations')
  })

  it('says "Saved ✓" instead of Save when nothing is pending', () => {
    const wrapper = mountBar({ saveState: 'saved' })

    expect(wrapper.get('[data-test="editor-app-bar-saved"]').text()).toBe('Saved ✓')
    expect(wrapper.find('[data-test="editor-app-bar-save"]').exists()).toBe(false)
  })

  it('offers Save when there is something to save, and emits save on a tap', async () => {
    const wrapper = mountBar({ saveState: 'unsaved' })

    const save = wrapper.get('[data-test="editor-app-bar-save"]')
    expect(save.text()).toBe('Save')
    expect(save.attributes('disabled')).toBeUndefined()
    await save.trigger('click')
    expect(wrapper.emitted('save')).toHaveLength(1)
  })

  it('shows "Saving…" while saving, and does not save twice', async () => {
    const wrapper = mountBar({ saveState: 'saving' })

    const save = wrapper.get('[data-test="editor-app-bar-save"]')
    expect(save.text()).toBe('Saving…')
    expect(save.attributes('aria-busy')).toBe('true')
    await save.trigger('click')
    expect(wrapper.emitted('save')).toBeUndefined()
  })

  it('shows neither Save nor Saved when saving is not offered', () => {
    const wrapper = mountBar({ saveState: 'unsaved', canSave: false })

    expect(wrapper.find('[data-test="editor-app-bar-save"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="editor-app-bar-saved"]').exists()).toBe(false)
  })

  it('keeps other ways of saving next to Save', () => {
    const wrapper = mount(EditorAppBar, {
      props: { sectionLabel: 'Diagrams', sectionTo: { name: 'teacher-diagrams' }, title: 'A minor', saveState: 'unsaved' },
      slots: { actions: '<button data-test="save-as">Save as…</button>' },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    expect(wrapper.find('[data-test="save-as"]').exists()).toBe(true)
  })
})
