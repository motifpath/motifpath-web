import type { Meta, StoryObj } from '@storybook/vue3-vite'

import NoteValueIcon from './NoteValueIcon.vue'

const meta = {
  title: 'Icons/NoteValueIcon',
  component: NoteValueIcon,
  args: { kind: 'note', base: 4, label: 'Quarter note' },
  argTypes: { base: { control: 'select', options: [1, 2, 4, 8, 16, 32] } },
} satisfies Meta<typeof NoteValueIcon>

export default meta
type Story = StoryObj<typeof meta>

export const Quarter: Story = {}
export const DottedEighth: Story = { args: { base: 8, dotted: true, label: 'Dotted eighth note' } }
export const Triplet: Story = { args: { base: 8, tuplet: 3, label: 'Eighth-note triplet' } }
export const Rest: Story = { args: { kind: 'rest', base: 4, label: 'Quarter rest' } }
