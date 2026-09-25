import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import type { RegistrationFailureReason } from '@/stores/currentUser'

const calls: string[] = []

interface CurrentUserStub {
  failureReason: RegistrationFailureReason
  retry: () => Promise<void>
}

const retry = vi.fn(async () => {
  calls.push('retry')
})

const currentUser = reactive<CurrentUserStub>({ failureReason: null, retry })

vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

const signOut = vi.fn(async () => {})
const openUserProfile = vi.fn()
const refreshToken = vi.fn(async () => {
  calls.push('refreshToken')
  return 'jwt-fresh'
})

vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => ({ signOut, openUserProfile, refreshToken }),
}))

import RegistrationFailedNotice from '@/features/auth/components/RegistrationFailedNotice.vue'

describe('RegistrationFailedNotice', () => {
  beforeEach(() => {
    currentUser.failureReason = null
    retry.mockClear()
    refreshToken.mockClear()
    openUserProfile.mockClear()
    calls.length = 0
  })

  it('explains that registration did not complete', () => {
    const wrapper = mount(RegistrationFailedNotice)

    expect(wrapper.find('[data-test="registration-failed"]').exists()).toBe(true)
  })

  it('retries registration when the try-again control is used', async () => {
    const wrapper = mount(RegistrationFailedNotice)

    await wrapper.get('[data-test="retry"]').trigger('click')

    expect(retry).toHaveBeenCalledOnce()
  })

  it('offers a sign-out escape hatch for when retrying keeps failing', async () => {
    const wrapper = mount(RegistrationFailedNotice)

    await wrapper.get('[data-test="sign-out"]').trigger('click')

    expect(signOut).toHaveBeenCalledOnce()
  })

  describe('when the account has no name', () => {
    beforeEach(() => {
      currentUser.failureReason = 'name-required'
    })

    it('says a name is needed instead of calling the failure temporary', () => {
      const wrapper = mount(RegistrationFailedNotice)

      expect(wrapper.find('[data-test="registration-name-required"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="registration-failed"]').exists()).toBe(false)
    })

    it('opens the profile screen so the user can add their name', async () => {
      const wrapper = mount(RegistrationFailedNotice)

      await wrapper.get('[data-test="add-name"]').trigger('click')

      expect(openUserProfile).toHaveBeenCalledOnce()
    })

    it('gets a fresh token before retrying, so the retry carries the newly added name', async () => {
      const wrapper = mount(RegistrationFailedNotice)

      await wrapper.get('[data-test="retry"]').trigger('click')
      await flushPromises()

      expect(calls).toEqual(['refreshToken', 'retry'])
    })

    it('still offers signing out', () => {
      const wrapper = mount(RegistrationFailedNotice)

      expect(wrapper.find('[data-test="sign-out"]').exists()).toBe(true)
    })
  })
})
