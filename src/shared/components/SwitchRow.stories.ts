import type { Meta, StoryObj } from '@storybook/vue3-vite'

import SwitchRow from './SwitchRow.vue'

const meta = {
  title: 'Inputs/SwitchRow',
  component: SwitchRow,
  args: {
    label: 'Weekly progress report',
    description: "Mondays: your week's practice days, minutes and skills.",
    modelValue: true,
  },
} satisfies Meta<typeof SwitchRow>

export default meta
type Story = StoryObj<typeof meta>

export const On: Story = {}
export const Off: Story = { args: { modelValue: false } }
export const LabelOnly: Story = { args: { description: undefined } }
export const LongPortuguese: Story = {
  args: {
    label: 'Lembretes',
    description: 'Um lembrete à noite nos dias em que você ainda não tocou, menos frequente se você se afastar.',
  },
}
