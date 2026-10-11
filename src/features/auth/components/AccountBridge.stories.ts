import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { useCurrentUserStore, type CurrentUserState, type RegistrationFailureReason } from '@/stores/currentUser'

import AccountBridge from './AccountBridge.vue'

function withRegistration(state: CurrentUserState, failureReason: RegistrationFailureReason = null) {
  return () => ({
    components: { AccountBridge },
    setup() {
      useCurrentUserStore().$patch({ state, failureReason })
    },
    template: '<AccountBridge />',
  })
}

const meta = {
  title: 'Auth/AccountBridge',
  component: AccountBridge,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AccountBridge>

export default meta
type Story = StoryObj<typeof meta>

/** Back from Google while the account is set up: the landing, its button busy after 300 ms. */
export const SettingUp: Story = { render: withRegistration('registering') }
/** Setting the account up failed: Google worked, so try again or sign out. */
export const SetupFailed: Story = { render: withRegistration('failed') }
/** The account has no full name: our own name step. */
export const NameMissing: Story = { render: withRegistration('failed', 'name-required') }
