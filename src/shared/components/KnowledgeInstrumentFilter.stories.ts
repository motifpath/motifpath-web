import type { Meta, StoryObj } from '@storybook/vue3-vite'

import KnowledgeInstrumentFilter from './KnowledgeInstrumentFilter.vue'

const meta = {
  title: 'Selection/KnowledgeInstrumentFilter',
  component: KnowledgeInstrumentFilter,
  args: { modelValue: '', fitsContent: true },
  parameters: { docs: { description: { component: 'Loads its options from the API; until Storybook has a mock API it shows its loading or error state.' } } },
} satisfies Meta<typeof KnowledgeInstrumentFilter>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
