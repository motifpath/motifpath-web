import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const currentUser = {
  retry: vi.fn(async () => {}),
}

vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

import RegistrationErrorView from '@/features/auth/views/RegistrationErrorView.vue'

describe('RegistrationErrorView', () => {
  it('explains that registration did not complete', () => {
    const wrapper = mount(RegistrationErrorView)

    expect(wrapper.find('[data-test="error"]').exists()).toBe(true)
  })

  it('retries registration when the try-again control is used', async () => {
    const wrapper = mount(RegistrationErrorView)

    await wrapper.get('[data-test="retry"]').trigger('click')

    expect(currentUser.retry).toHaveBeenCalledOnce()
  })
})
