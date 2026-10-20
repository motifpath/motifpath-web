import type { Meta, StoryObj } from '@storybook/vue3-vite'

import LanguageCodesPicker from './LanguageCodesPicker.vue'

const meta = {
  title: 'Selection/LanguageCodesPicker',
  component: LanguageCodesPicker,
  args: { modelValue: ['any'] },
} satisfies Meta<typeof LanguageCodesPicker>

export default meta
type Story = StoryObj<typeof meta>

export const AnyLanguage: Story = {}
export const TwoLanguages: Story = { args: { modelValue: ['en', 'pt_BR'] } }
export const Disabled: Story = { args: { disabled: true } }
