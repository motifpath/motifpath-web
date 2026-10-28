import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import PreviewLayer from '@/shared/components/PreviewLayer.vue'

describe('PreviewLayer', () => {
  let wrapper: ReturnType<typeof mount> | null = null
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  function mountLayer(open = true) {
    wrapper = mount(PreviewLayer, {
      props: { open, title: 'Preview — what learners see' },
      slots: { default: '<h1 data-test="learner-screen">Guitar foundations</h1>' },
      attachTo: document.body,
    })
    return wrapper
  }

  it('shows the learner screen full screen under the Preview bar', () => {
    mountLayer()

    const layer = document.querySelector('[data-test="preview-layer"]')!
    expect(layer.getAttribute('role')).toBe('dialog')
    expect(document.querySelector('[data-test="preview-bar"]')?.textContent).toContain('Preview — what learners see')
    expect(layer.querySelector('[data-test="learner-screen"]')).not.toBeNull()
  })

  it('× closes it', () => {
    mountLayer()

    document.querySelector<HTMLButtonElement>('[data-test="preview-close"]')!.click()

    expect(wrapper!.emitted('close')).toHaveLength(1)
  })

  it('shows nothing while closed', () => {
    mountLayer(false)

    expect(document.querySelector('[data-test="preview-layer"]')).toBeNull()
  })

  it('starts the Preview bar below the status bar, and ends what scrolls above the home indicator', () => {
    mountLayer()

    expect(document.querySelector('[data-test="preview-bar"]')?.classList).toContain('pt-inset-top')
    expect(document.querySelector('[data-test="preview-body"]')?.classList).toContain('pb-inset-bottom')
  })
})
