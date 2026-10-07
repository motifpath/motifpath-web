import type { Meta, StoryObj } from '@storybook/vue3-vite'

import LocaleSwitcher from './LocaleSwitcher.vue'

const meta = {
  title: 'Navigation/LocaleSwitcher',
  component: LocaleSwitcher,
} satisfies Meta<typeof LocaleSwitcher>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
