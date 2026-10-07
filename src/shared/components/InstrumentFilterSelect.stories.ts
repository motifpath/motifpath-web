import type { Meta, StoryObj } from '@storybook/vue3-vite'

import InstrumentFilterSelect from './InstrumentFilterSelect.vue'

const meta = {
  title: 'Selection/InstrumentFilterSelect',
  component: InstrumentFilterSelect,
  args: { modelValue: null },
  parameters: { docs: { description: { component: 'Loads its options from the API; until Storybook has a mock API it shows its loading or error state.' } } },
} satisfies Meta<typeof InstrumentFilterSelect>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
