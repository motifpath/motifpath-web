import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import OverlayPanel from '@/shared/components/OverlayPanel.vue'
import { mockViewport } from '@/shared/testUtils/viewport'

function mountPanel(width: number, props: Record<string, unknown> = {}) {
  mockViewport(width)
  return mount(OverlayPanel, {
    props: { open: true, title: 'Report a problem', ...props },
    slots: {
      default: '<p data-test="body">What went wrong?</p>',
      actions: '<button data-test="send">Send</button>',
    },
  })
}

describe('OverlayPanel', () => {
  it('renders nothing while closed', () => {
    const wrapper = mountPanel(390, { open: false })

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  describe('on a phone (compact)', () => {
    it('is a bottom sheet with a grabber, its title, the body and the actions', () => {
      const wrapper = mountPanel(390)

      const sheet = wrapper.get('[data-test="overlay-sheet"]')
      expect(sheet.find('[data-test="sheet-grabber"]').exists()).toBe(true)
      expect(sheet.get('h2').text()).toBe('Report a problem')
      expect(sheet.find('[data-test="body"]').exists()).toBe(true)
      expect(sheet.find('[data-test="send"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="overlay-dialog"]').exists()).toBe(false)
    })
  })

  describe('on a tablet or a laptop (medium and expanded)', () => {
    it.each([720, 1280])('is a centred dialog at %i px', (width) => {
      const wrapper = mountPanel(width)

      expect(wrapper.find('[data-test="overlay-dialog"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="overlay-sheet"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="sheet-grabber"]').exists()).toBe(false)
    })
  })

  it('is a labelled modal dialog for assistive technology', () => {
    const wrapper = mountPanel(1280)

    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
    const labelId = dialog.attributes('aria-labelledby')
    expect(wrapper.get(`#${labelId}`).text()).toBe('Report a problem')
  })

  it('closes from its × button', async () => {
    const wrapper = mountPanel(390)

    await wrapper.get('[data-test="overlay-close"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('shows a back arrow instead of × in a sub-step, which goes back rather than closing', async () => {
    const wrapper = mountPanel(390, { back: true })

    await wrapper.get('[data-test="overlay-back"]').trigger('click')

    expect(wrapper.emitted('back')).toHaveLength(1)
    expect(wrapper.emitted('close')).toBeUndefined()
  })
})
