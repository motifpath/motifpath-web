import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as VueRouter from 'vue-router'

type LeaveGuard = () => boolean | Promise<boolean>
let leaveGuard: LeaveGuard | null = null
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return {
    ...actual,
    onBeforeRouteLeave: (guard: LeaveGuard) => {
      leaveGuard = guard
    },
  }
})

import UnsavedChangesGuard from '@/shared/components/UnsavedChangesGuard.vue'

const message = "Your changes to this course haven't been saved and will be lost."

describe('UnsavedChangesGuard', () => {
  let wrapper: ReturnType<typeof mount> | null = null

  beforeEach(() => {
    leaveGuard = null
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  function mountGuard(dirty: boolean) {
    wrapper = mount(UnsavedChangesGuard, { props: { dirty, message }, attachTo: document.body })
    return wrapper
  }

  it('leaves at once when nothing is unsaved', async () => {
    mountGuard(false)

    expect(await leaveGuard!()).toBe(true)
    expect(document.body.textContent).not.toContain('Leave without saving?')
  })

  it('asks "Leave without saving?" with Keep editing and Leave', async () => {
    mountGuard(true)

    void leaveGuard!()
    await flushPromises()

    expect(document.body.textContent).toContain('Leave without saving?')
    expect(document.body.textContent).toContain(message)
    expect(document.querySelector('[data-test="confirm-dialog-cancel"]')?.textContent?.trim()).toBe('Keep editing')
    expect(document.querySelector('[data-test="confirm-dialog-confirm"]')?.textContent?.trim()).toBe('Leave')
  })

  it('stays on Keep editing', async () => {
    mountGuard(true)

    const leaving = leaveGuard!()
    await flushPromises()
    document.querySelector<HTMLButtonElement>('[data-test="confirm-dialog-cancel"]')!.click()

    expect(await leaving).toBe(false)
  })

  it('leaves on Leave', async () => {
    mountGuard(true)

    const leaving = leaveGuard!()
    await flushPromises()
    document.querySelector<HTMLButtonElement>('[data-test="confirm-dialog-confirm"]')!.click()

    expect(await leaving).toBe(true)
    expect(wrapper!.emitted('leave')).toHaveLength(1)
  })

  it('takes the editor’s own question when leaving loses more than edits', async () => {
    wrapper = mount(UnsavedChangesGuard, {
      props: { dirty: true, message: 'The video is still uploading.', title: 'Leave and cancel the upload?', keepLabel: 'Keep uploading' },
      attachTo: document.body,
    })

    void leaveGuard!()
    await flushPromises()

    expect(document.body.textContent).toContain('Leave and cancel the upload?')
    expect(document.querySelector('[data-test="confirm-dialog-cancel"]')?.textContent?.trim()).toBe('Keep uploading')
  })

  it('asks the browser to confirm closing the page with unsaved changes', () => {
    mountGuard(true)

    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  it('lets the page close when nothing is unsaved', () => {
    mountGuard(false)

    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })
})
