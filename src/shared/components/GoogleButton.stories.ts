import type { Meta, StoryObj } from '@storybook/vue3-vite'

import GoogleButton from './GoogleButton.vue'

const meta = {
  title: 'Actions/GoogleButton',
  component: GoogleButton,
  decorators: [() => ({ template: '<div class="max-w-[22rem]"><story /></div>' })],
} satisfies Meta<typeof GoogleButton>

export default meta
type Story = StoryObj<typeof meta>

/** The landing's one action. */
export const Default: Story = {}
/** Back from Google while the account is set up. */
export const Busy: Story = { args: { busy: true } }
