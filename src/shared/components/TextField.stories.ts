import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'

import TextField from './TextField.vue'

const meta = {
  title: 'Inputs/TextField',
  component: TextField,
  args: { label: 'Last name', modelValue: '' },
  render: (args) => ({
    components: { TextField },
    setup: () => {
      const value = ref(args.modelValue)
      return { args, value }
    },
    template: '<div class="max-w-[22rem]"><TextField v-bind="args" v-model="value" /></div>',
  }),
} satisfies Meta<typeof TextField>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}
export const Filled: Story = { args: { label: 'First name', modelValue: 'Dora' } }
export const Focused: Story = { args: { autofocus: true } }
export const WithError: Story = { args: { error: 'Enter your last name.' } }
