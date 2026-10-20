import type { Meta, StoryObj } from '@storybook/vue3-vite'

import RootNoteSelect from './RootNoteSelect.vue'

const meta: Meta<typeof RootNoteSelect> = { title: 'Forms/RootNoteSelect', component: RootNoteSelect, args: { modelValue: undefined } }

export default meta
type Story = StoryObj<typeof meta>

export const Any: Story = {}
export const Chosen: Story = { args: { modelValue: 'A' } }
