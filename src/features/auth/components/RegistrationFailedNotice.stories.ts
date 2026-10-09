import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { useCurrentUserStore } from '@/stores/currentUser'

import RegistrationFailedNotice from './RegistrationFailedNotice.vue'

type FailureReason = ReturnType<typeof useCurrentUserStore>['failureReason']

/** Renders the notice for one registration failure, set on the store it reads. */
function withFailure(reason: FailureReason) {
  return () => ({
    components: { RegistrationFailedNotice },
    setup() {
      useCurrentUserStore().failureReason = reason
    },
    template: '<RegistrationFailedNotice />',
  })
}

const meta = {
  title: 'States/RegistrationFailedNotice',
  component: RegistrationFailedNotice,
} satisfies Meta<typeof RegistrationFailedNotice>

export default meta
type Story = StoryObj<typeof meta>

/** Registration failed for a reason the user can only retry. */
export const Failed: Story = { render: withFailure(null) }

/** The account has no name yet: the user adds one, then tries again. */
export const NameRequired: Story = { render: withFailure('name-required') }
