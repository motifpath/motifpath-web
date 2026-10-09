import type { Meta, StoryObj } from '@storybook/vue3-vite'

import BrandMark from './BrandMark.vue'

const meta = {
  title: 'Navigation/BrandMark',
  component: BrandMark,
} satisfies Meta<typeof BrandMark>

export default meta
type Story = StoryObj<typeof meta>

/** The app bar's mark on a phone. */
export const Small: Story = { args: { size: 'sm' } }
/** The rail's and the sidebar's mark. */
export const Medium: Story = { args: { size: 'md' } }
