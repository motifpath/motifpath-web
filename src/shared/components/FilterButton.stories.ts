import type { Meta, StoryObj } from '@storybook/vue3-vite'

import FilterButton from './FilterButton.vue'

const meta: Meta<typeof FilterButton> = { title: 'Lists/FilterButton', component: FilterButton, args: { count: 0 } }

export default meta
type Story = StoryObj<typeof meta>

export const NoneApplied: Story = {}
export const TwoApplied: Story = { args: { count: 2 } }
