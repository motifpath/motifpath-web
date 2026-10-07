import type { Meta, StoryObj } from '@storybook/vue3-vite'

import InstrumentPicker from './InstrumentPicker.vue'

const meta = {
  title: 'Selection/InstrumentPicker',
  component: InstrumentPicker,
  args: { modelValue: [] },
  parameters: { docs: { description: { component: 'Loads its options from the API; until Storybook has a mock API it shows its loading or error state.' } } },
} satisfies Meta<typeof InstrumentPicker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Disabled: Story = { args: { disabled: true } }
