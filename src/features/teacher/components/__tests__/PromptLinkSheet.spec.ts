import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import PromptLinkSheet from '@/features/teacher/components/PromptLinkSheet.vue'

describe('PromptLinkSheet', () => {
  let wrapper: ReturnType<typeof mount> | null = null
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  function mountSheet(href = '') {
    wrapper = mount(PromptLinkSheet, { props: { open: true, href }, attachTo: document.body })
    return wrapper
  }

  function input() {
    return document.querySelector<HTMLInputElement>('[data-test="prompt-link-address"]')!
  }
  function apply() {
    return document.querySelector<HTMLButtonElement>('[data-test="prompt-link-apply"]')!
  }

  it('asks for the address', () => {
    mountSheet()

    expect(document.body.textContent).toContain('Link')
    expect(document.body.textContent).toContain('Address')
    expect(input().value).toBe('')
  })

  it('waits for an address before Apply can be used', async () => {
    mountSheet()
    expect(apply().disabled).toBe(true)

    input().value = '   '
    input().dispatchEvent(new Event('input'))
    await wrapper!.vm.$nextTick()
    expect(apply().disabled).toBe(true)

    input().value = 'https://example.com/open-strings'
    input().dispatchEvent(new Event('input'))
    await wrapper!.vm.$nextTick()
    expect(apply().disabled).toBe(false)
  })

  it('applies the typed address, trimmed', async () => {
    mountSheet()

    input().value = '  https://example.com/open-strings '
    input().dispatchEvent(new Event('input'))
    await wrapper!.vm.$nextTick()
    apply().click()

    expect(wrapper!.emitted('apply')).toEqual([['https://example.com/open-strings']])
  })

  it('offers Remove link only for a selection that already has one', () => {
    mountSheet()
    expect(document.querySelector('[data-test="prompt-link-remove"]')).toBeNull()
    wrapper!.unmount()
    document.body.innerHTML = ''

    mountSheet('https://example.com/old')
    expect(input().value).toBe('https://example.com/old')
    document.querySelector<HTMLButtonElement>('[data-test="prompt-link-remove"]')!.click()

    expect(wrapper!.emitted('remove')).toHaveLength(1)
  })
})
