import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'

import ProgressionChips from './ProgressionChips.vue'

const meta = {
  title: 'Song charts/ProgressionChips',
  component: ProgressionChips,
  args: { keys: ['I-IV-I-V', 'ii-V-I'] },
  parameters: { docs: { description: { component: 'Progressions a song plays, as chips by their catalog names.' } } },
} satisfies Meta<typeof ProgressionChips>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('ii–V–I')).toBeVisible()
  },
}
