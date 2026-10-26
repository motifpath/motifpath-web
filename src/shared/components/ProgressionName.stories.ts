import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'

import ProgressionName from './ProgressionName.vue'

const meta = {
  title: 'Practice/ProgressionName',
  component: ProgressionName,
  args: { progressionKey: 'I-IV-I-V' },
  parameters: { docs: { description: { component: 'A progression by its name in the progression catalog.' } } },
} satisfies Meta<typeof ProgressionName>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('I–IV–I–V')).toBeVisible()
  },
}
