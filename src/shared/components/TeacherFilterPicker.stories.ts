import type { Meta, StoryObj } from '@storybook/vue3-vite'

import TeacherFilterPicker from './TeacherFilterPicker.vue'

const meta = {
  title: 'Selection/TeacherFilterPicker',
  component: TeacherFilterPicker,
  args: { modelValue: null },
  parameters: { docs: { description: { component: 'Loads its options from the API; until Storybook has a mock API it shows its loading or error state.' } } },
} satisfies Meta<typeof TeacherFilterPicker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Selected: Story = {
  args: { modelValue: { user_id: '00000000-0000-4000-8000-000000000002', display_name: 'Ana Souza' } },
}
