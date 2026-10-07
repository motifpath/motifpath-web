import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { coloredTextPrompt, plainTextPrompt } from '@/shared/testUtils/promptDocument'

import PromptRenderer from './PromptRenderer.vue'

const meta = {
  title: 'Practice/PromptRenderer',
  component: PromptRenderer,
  args: { document: plainTextPrompt('Play the A minor pentatonic in position 1, ascending.') },
} satisfies Meta<typeof PromptRenderer>

export default meta
type Story = StoryObj<typeof meta>

export const PlainText: Story = {}
export const ColoredText: Story = { args: { document: coloredTextPrompt('Hear the third', { color: '#6D28E0' }) } }
