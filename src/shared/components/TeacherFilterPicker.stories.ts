import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { failing, respondWith } from '@/shared/testUtils/msw/handlers'

import TeacherFilterPicker from './TeacherFilterPicker.vue'

const meta = {
  title: 'Selection/TeacherFilterPicker',
  component: TeacherFilterPicker,
  args: { modelValue: null },
} satisfies Meta<typeof TeacherFilterPicker>

export default meta
type Story = StoryObj<typeof meta>

/** The list only shows once the picker is open. */
const open: Story['play'] = async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole('combobox'))
}

export const Default: Story = {}
export const Selected: Story = {
  args: { modelValue: { user_id: '00000000-0000-4000-8000-000000000002', display_name: 'Ana Souza' } },
}
export const Open: Story = { play: open }
export const Empty: Story = { play: open, parameters: { msw: { handlers: { creators: respondWith('creators', []) } } } }
export const Failed: Story = { play: open, parameters: { msw: { handlers: { creators: failing('creators') } } } }
