import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'

import { useOptionKeys } from '@/shared/composables/useOptionKeys'

enableAutoUnmount(afterEach)

const options = [{ option_id: 'a' }, { option_id: 'b' }, { option_id: 'c' }]

function mountWith({ multiple = false, selected = [] as string[], locked = false } = {}) {
  const choose = vi.fn()
  const chosen = ref(selected)
  const isLocked = ref(locked)
  const wrapper = mount(
    defineComponent({
      setup() {
        useOptionKeys({
          options: () => options,
          multiple: () => multiple,
          selected: () => chosen.value,
          locked: () => isLocked.value,
          choose,
        })
        return () => null
      },
    }),
  )
  return { wrapper, choose, isLocked }
}

function press(key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  document.body.dispatchEvent(event)
  return event
}

describe('useOptionKeys', () => {
  it('chooses the option a number key names, counted from 1', () => {
    const { choose } = mountWith()

    press('2')

    expect(choose).toHaveBeenCalledWith(['b'])
  })

  it('adds or removes an option when several can be chosen', () => {
    const { choose } = mountWith({ multiple: true, selected: ['a'] })

    press('3')
    press('1')

    expect(choose).toHaveBeenNthCalledWith(1, ['a', 'c'])
    expect(choose).toHaveBeenNthCalledWith(2, [])
  })

  it('ignores a number with no option, other keys, and a key already handled', () => {
    const { choose } = mountWith()

    press('4')
    press('x')
    const handled = new KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true })
    handled.preventDefault()
    document.body.dispatchEvent(handled)

    expect(choose).not.toHaveBeenCalled()
  })

  it('takes no keys while the options are locked', () => {
    const { choose } = mountWith({ locked: true })

    press('1')

    expect(choose).not.toHaveBeenCalled()
  })

  it('stops listening once its component is gone', () => {
    const { wrapper, choose } = mountWith()

    wrapper.unmount()
    press('1')

    expect(choose).not.toHaveBeenCalled()
  })
})
