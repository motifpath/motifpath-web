import type { Meta, StoryObj } from '@storybook/vue3-vite'

import LandingScreen from './LandingScreen.vue'

const meta = {
  title: 'Auth/LandingScreen',
  component: LandingScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof LandingScreen>

export default meta
type Story = StoryObj<typeof meta>

/** The landing a signed-out visitor sees: one way in. */
export const Default: Story = {}
/** Back from Google, once the account setup has taken 300 ms. */
export const SettingUp: Story = { args: { busy: true } }
