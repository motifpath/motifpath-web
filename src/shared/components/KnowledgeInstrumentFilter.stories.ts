import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { failing, respondWith } from '@/shared/testUtils/msw/handlers'

import KnowledgeInstrumentFilter from './KnowledgeInstrumentFilter.vue'

const meta = {
  title: 'Selection/KnowledgeInstrumentFilter',
  component: KnowledgeInstrumentFilter,
  args: { modelValue: '', fitsContent: true },
} satisfies Meta<typeof KnowledgeInstrumentFilter>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Selected: Story = { args: { modelValue: 'instrument-guitar' } }
export const Empty: Story = { parameters: { msw: { handlers: { instruments: respondWith('instruments', []) } } } }
export const Failed: Story = { parameters: { msw: { handlers: { instruments: failing('instruments') } } } }
