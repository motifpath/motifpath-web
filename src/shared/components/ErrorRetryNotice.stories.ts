import type { Meta, StoryObj } from '@storybook/vue3-vite'

import ErrorRetryNotice from './ErrorRetryNotice.vue'

const meta: Meta<typeof ErrorRetryNotice> = {
  title: 'Overlays/ErrorRetryNotice',
  component: ErrorRetryNotice,
  args: { message: 'Saving failed.' },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
