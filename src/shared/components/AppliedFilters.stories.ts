import type { Meta, StoryObj } from '@storybook/vue3-vite'

import AppliedFilters from './AppliedFilters.vue'

const meta: Meta<typeof AppliedFilters> = {
  title: 'Lists/AppliedFilters',
  component: AppliedFilters,
  args: {
    chips: [
      { id: 'instrument', label: 'Guitar' },
      { id: 'kind', label: 'Custom' },
      { id: 'root', label: 'Root A' },
      { id: 'skill:1', label: 'Pentatonic shapes' },
      { id: 'skill:2', label: 'Modes' },
    ],
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Applied: Story = {}
export const OnAPhone: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' }, docs: { description: { story: 'The chips scroll sideways.' } } },
}
