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

// The typeface has no italic, so the browser slants the regular weight; this
// story keeps that synthesized italic, next to bold, visible in both themes.
export const EmphasisMarks: Story = {
  args: {
    document: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Let the note ' },
            { type: 'text', text: 'ring', marks: [{ type: 'italic' }] },
            { type: 'text', text: ' before you move, then play the ' },
            { type: 'text', text: 'last bar', marks: [{ type: 'bold' }, { type: 'italic' }] },
            { type: 'text', text: ' ' },
            { type: 'text', text: 'louder', marks: [{ type: 'bold' }] },
            { type: 'text', text: '.' },
          ],
        },
      ],
    },
  },
}
