import { flushPromises, mount } from '@vue/test-utils'
import type { Component } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SpikeDialog from '@/spike/SpikeDialog.vue'
import SpikeDialogEjected from '@/spike/SpikeDialogEjected.vue'

// PB-34 spike — the same behavioural suite runs against the Reka UI primitive
// and its hand-rolled eject. Identical `data-test` surface ⇒ a caller swaps the
// import and nothing else. This is the "ejectable, not lock-in" claim, tested.
//
// Deep keyboard semantics (focus trap containment, focus restoration) are
// Reka-provided and are a manual-browser check in the findings note; jsdom does
// not model focus faithfully enough to assert them here.
function suite(name: string, Dialog: Component) {
  describe(name, () => {
    afterEach(() => {
      document.body.innerHTML = ''
    })

    const mountDialog = () =>
      mount(Dialog, {
        props: { title: 'Spike dialog', description: 'Proves the seam.' },
        attachTo: document.body,
      })

    it('is closed until the trigger is activated', () => {
      const wrapper = mountDialog()
      expect(document.querySelector('[data-test="dialog-content"]')).toBeNull()
      wrapper.unmount()
    })

    it('opens on trigger click with role="dialog" and the titled content', async () => {
      const wrapper = mountDialog()
      await wrapper.get('[data-test="dialog-trigger"]').trigger('click')

      const content = document.querySelector('[data-test="dialog-content"]')
      expect(content).not.toBeNull()
      expect(content?.getAttribute('role')).toBe('dialog')
      expect(content?.textContent).toContain('Spike dialog')
      wrapper.unmount()
    })

    it('closes again when the close control is activated', async () => {
      const wrapper = mountDialog()
      await wrapper.get('[data-test="dialog-trigger"]').trigger('click')

      document.querySelector<HTMLElement>('[data-test="dialog-close"]')?.click()
      await flushPromises()

      await vi.waitFor(() =>
        expect(document.querySelector('[data-test="dialog-content"]')).toBeNull(),
      )
      wrapper.unmount()
    })
  })
}

suite('SpikeDialog (Reka UI)', SpikeDialog)
suite('SpikeDialogEjected (hand-rolled)', SpikeDialogEjected)
