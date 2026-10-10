import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PageBackBar from '@/shared/components/PageBackBar.vue'

function mountBar() {
  return mount(PageBackBar, {
    props: { title: 'Major triads', to: { name: 'path' }, backLabel: 'Back to My path' },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('PageBackBar', () => {
  it('leads back to the page this one was pushed onto', () => {
    const back = mountBar().getComponent(RouterLinkStub)

    expect(back.props('to')).toEqual({ name: 'path' })
    expect(back.attributes('aria-label')).toBe('Back to My path')
  })

  it('names that page beside the arrow', () => {
    expect(mountBar().get('[data-test="page-back-title"]').text()).toBe('Major triads')
  })
})
