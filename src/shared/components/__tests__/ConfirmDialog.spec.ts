import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import { mockViewport } from '@/shared/testUtils/viewport'

const props = {
  open: true,
  title: 'Leave Fingerstyle basics?',
  message: "You'll lose your place in this course.",
  confirmLabel: 'Leave course',
  cancelLabel: 'Keep learning',
}

let attached: ReturnType<typeof mount>[] = []
afterEach(() => {
  attached.forEach((wrapper) => wrapper.unmount())
  attached = []
})

function mountAt(width: number, extra: Record<string, unknown> = {}) {
  mockViewport(width)
  const wrapper = mount(ConfirmDialog, { props: { ...props, ...extra }, attachTo: document.body })
  attached.push(wrapper)
  return wrapper
}

function buttonOrder(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper.findAll('[data-test^="confirm-dialog-"]').map((b) => b.attributes('data-test')!)
}

describe('ConfirmDialog', () => {
  it('shows the question and what is lost, with the verb on the button', () => {
    const wrapper = mountAt(1280)

    expect(wrapper.get('[role="alertdialog"]').text()).toContain('Leave Fingerstyle basics?')
    expect(wrapper.text()).toContain("You'll lose your place in this course.")
    expect(wrapper.get('[data-test="confirm-dialog-confirm"]').text()).toBe('Leave course')
    expect(wrapper.get('[data-test="confirm-dialog-cancel"]').text()).toBe('Keep learning')
  })

  it('renders nothing while closed', () => {
    const wrapper = mountAt(1280, { open: false })

    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
  })

  it('confirms or cancels', async () => {
    const wrapper = mountAt(1280)

    await wrapper.get('[data-test="confirm-dialog-confirm"]').trigger('click')
    await wrapper.get('[data-test="confirm-dialog-cancel"]').trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('cannot be confirmed twice while busy', async () => {
    const wrapper = mountAt(1280, { busy: true })

    await wrapper.get('[data-test="confirm-dialog-confirm"]').trigger('click')

    expect(wrapper.get('[data-test="confirm-dialog-confirm"]').attributes('aria-busy')).toBe('true')
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('uses the destructive button for the confirm', () => {
    const wrapper = mountAt(1280)

    expect(wrapper.get('[data-test="confirm-dialog-confirm"]').classes()).toContain('bg-danger')
  })

  it('has no × — the two buttons are the only ways out besides Esc', () => {
    const wrapper = mountAt(390)

    expect(wrapper.find('[data-test="overlay-close"]').exists()).toBe(false)
  })

  it('treats Esc as the safe choice', async () => {
    const wrapper = mountAt(1280)

    await wrapper.get('[role="alertdialog"]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('ignores a tap on the scrim, which is not an answer', async () => {
    const wrapper = mountAt(1280)

    await wrapper.get('[data-test="overlay-scrim"]').trigger('click')

    expect(wrapper.emitted('cancel')).toBeUndefined()
  })

  it('starts with focus on the safe choice', async () => {
    const wrapper = mountAt(1280, { open: false })
    await wrapper.setProps({ open: true })
    await nextTick()

    expect(document.activeElement).toBe(wrapper.get('[data-test="confirm-dialog-cancel"]').element)
  })

  it('on a phone, puts the destructive button on top and the safe one at the bottom, under the thumb', () => {
    const wrapper = mountAt(390)

    expect(wrapper.find('[data-test="overlay-sheet"]').exists()).toBe(true)
    expect(buttonOrder(wrapper)).toEqual(['confirm-dialog-confirm', 'confirm-dialog-cancel'])
  })

  it('on a laptop, puts the safe button left and the destructive one right', () => {
    const wrapper = mountAt(1280)

    expect(wrapper.find('[data-test="overlay-dialog"]').exists()).toBe(true)
    expect(buttonOrder(wrapper)).toEqual(['confirm-dialog-cancel', 'confirm-dialog-confirm'])
  })
})
