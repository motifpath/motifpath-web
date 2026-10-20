import type { Meta, StoryObj } from '@storybook/vue3-vite'

import SaveBlockers from './SaveBlockers.vue'

const meta = {
  title: 'Teach/SaveBlockers',
  component: SaveBlockers,
  args: {
    items: [
      { label: 'Mark at least one option correct', field: 'options' },
      { label: 'Add a skill', field: 'skills' },
      { label: 'Pick a tempo from 20 to 300 BPM', field: 'stimulus' },
    ],
  },
} satisfies Meta<typeof SaveBlockers>

export default meta
type Story = StoryObj<typeof meta>

export const Several: Story = {}
export const One: Story = { args: { items: [{ label: 'Add a concept', field: 'concepts' }] } }
