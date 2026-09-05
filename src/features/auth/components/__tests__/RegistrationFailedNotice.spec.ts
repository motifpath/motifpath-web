import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const currentUser = {
  retry: vi.fn(async () => {}),
}

vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

import RegistrationFailedNotice from '@/features/auth/components/RegistrationFailedNotice.vue'

describe('RegistrationFailedNotice', () => {
  it('explains that registration did not complete', () => {
    const wrapper = mount(RegistrationFailedNotice)

    expect(wrapper.find('[data-test="registration-failed"]').exists()).toBe(true)
  })

  it('retries registration when the try-again control is used', async () => {
    const wrapper = mount(RegistrationFailedNotice)

    await wrapper.get('[data-test="retry"]').trigger('click')

    expect(currentUser.retry).toHaveBeenCalledOnce()
  })
})
