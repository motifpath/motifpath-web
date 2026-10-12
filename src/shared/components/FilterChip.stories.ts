import type { Meta, StoryObj } from '@storybook/vue3-vite'

import FilterChip from './FilterChip.vue'

const meta: Meta<typeof FilterChip> = { title: 'Lists/FilterChip', component: FilterChip, args: { label: 'Root A' } }

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const LongName: Story = { args: { label: 'Pentatonic shapes' } }
