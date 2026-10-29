import type { Meta, StoryObj } from '@storybook/vue3-vite'

import StatusBarBackdrop from './StatusBarBackdrop.vue'

const meta = {
  title: 'Navigation/StatusBarBackdrop',
  component: StatusBarBackdrop,
} satisfies Meta<typeof StatusBarBackdrop>

export default meta
type Story = StoryObj<typeof meta>

/**
 * In a browser the device takes nothing from the top edge, so the backdrop has no height. In the
 * app on a phone with a notch it is as tall as the status bar, on the page's surface.
 */
export const Default: Story = {}
