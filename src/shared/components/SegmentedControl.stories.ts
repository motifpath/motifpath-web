import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'

import SegmentedControl from './SegmentedControl.vue'

const meta = {
  title: 'Selection/SegmentedControl',
  component: SegmentedControl,
  render: (args) => ({
    components: { SegmentedControl },
    setup: () => ({ args, value: ref(args.modelValue) }),
    template: '<div class="max-w-sm"><SegmentedControl v-bind="args" v-model="value" /></div>',
  }),
  args: {
    label: 'Appearance',
    modelValue: 'system',
    options: [
      { value: 'system', label: 'Auto' },
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
    ],
  },
} satisfies Meta<typeof SegmentedControl>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const SecondChosen: Story = { args: { modelValue: 'light' } }
export const LongPortuguese: Story = {
  args: {
    label: 'Aparência',
    options: [
      { value: 'system', label: 'Automático' },
      { value: 'light', label: 'Claro' },
      { value: 'dark', label: 'Escuro' },
    ],
  },
}
