import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { failing, respondWith } from '@/shared/testUtils/msw/handlers'

import InstrumentPicker from './InstrumentPicker.vue'

const meta = {
  title: 'Selection/InstrumentPicker',
  component: InstrumentPicker,
  args: { modelValue: [] },
} satisfies Meta<typeof InstrumentPicker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Selected: Story = { args: { modelValue: ['instrument-guitar', 'instrument-bass'] } }
export const Disabled: Story = { args: { disabled: true } }
export const Empty: Story = { parameters: { msw: { handlers: { instruments: respondWith('instruments', []) } } } }
export const Failed: Story = { parameters: { msw: { handlers: { instruments: failing('instruments') } } } }
